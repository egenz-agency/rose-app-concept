"use server"

import { revalidatePath } from "next/cache"
import { getAdminClient } from "@/lib/supabase/admin"
import { requireOperator } from "@/lib/server/admin"
import { cleanSlug, cleanText, LIMITS } from "@/lib/security/validate"
import { planLabel } from "@/lib/payments/plans"

// Operator-only actions. Every one starts with requireOperator(), which throws
// for anyone who isn't the single masteradmin — server actions are public HTTP
// endpoints, so the guard has to live here and not merely on the page.

export interface PackageStat {
  plan: string
  label: string
  gifts: number
  live: number
  draft: number
  expired: number
  purchases: number
  revenueCents: number
  comped: number
}

export interface Funnel {
  accounts: number
  accountsNoGift: number        // registered, never even created a gift
  accountsGiftNeverPaid: number // built a gift, never paid — the real drop-off
  accountsPaying: number
}

export interface AdminStats {
  packages: PackageStat[]
  funnel: Funnel
  refunds: number
  currency: string
  totalRevenueCents: number
}

// One SQL call rather than several round trips — and auth.users isn't reachable
// through PostgREST, so the signup funnel has to be computed in the database.
export async function getAdminStatsAction(): Promise<AdminStats> {
  await requireOperator()
  const { data, error } = await getAdminClient().rpc("admin_overview")
  if (error) throw new Error(error.message)

  const raw = data as {
    packages: Array<Record<string, number | string>>
    funnel: Record<string, number>
    refunds: number
    currency: string
  }

  const packages: PackageStat[] = (raw.packages ?? []).map((p) => ({
    plan: String(p.plan),
    label: planLabel(p.plan),
    gifts: Number(p.gifts ?? 0),
    live: Number(p.live ?? 0),
    draft: Number(p.draft ?? 0),
    expired: Number(p.expired ?? 0),
    purchases: Number(p.purchases ?? 0),
    revenueCents: Number(p.revenue_cents ?? 0),
    comped: Number(p.comped ?? 0),
  }))

  return {
    packages,
    funnel: {
      accounts: Number(raw.funnel?.accounts ?? 0),
      accountsNoGift: Number(raw.funnel?.accounts_no_gift ?? 0),
      accountsGiftNeverPaid: Number(raw.funnel?.accounts_gift_never_paid ?? 0),
      accountsPaying: Number(raw.funnel?.accounts_paying ?? 0),
    },
    refunds: Number(raw.refunds ?? 0),
    currency: raw.currency ?? "eur",
    totalRevenueCents: packages.reduce((n, p) => n + p.revenueCents, 0),
  }
}

export interface AdminGift {
  id: string
  slug: string
  recipient_name: string | null
  status: string
  paid: boolean
  expires_at: string | null
  plan: string | null
  access_token: string
  owner_email: string | null
  created_at: string
  // Engagement, from rose_state. Null when the row is missing (shouldn't
  // happen — create_my_tenant seeds it — but the console must not crash on it).
  streak_days: number | null
  total_visits: number | null
  last_visited: string | null
}

// Every gift in the system, so the operator can find and open any of them —
// including their own test roses, which the one-gift-per-account dashboard
// cannot reach.
export async function listGiftsAction(): Promise<AdminGift[]> {
  await requireOperator()
  const sb = getAdminClient()
  const { data } = await sb
    .from("tenants")
    .select("id, slug, recipient_name, status, paid, expires_at, plan, access_token, owner_email, created_at, rose_state(streak_days, total_visits, last_visited)")
    .order("created_at", { ascending: false })

  // The embed arrives as an array (or an object, depending on how PostgREST
  // reads the relationship) — flatten it so the UI doesn't care which.
  return (data ?? []).map((row) => {
    const r = row as Record<string, unknown>
    const state = Array.isArray(r.rose_state) ? r.rose_state[0] : r.rose_state
    const st = (state ?? {}) as Record<string, unknown>
    return {
      ...(r as unknown as AdminGift),
      streak_days: (st.streak_days as number | undefined) ?? null,
      total_visits: (st.total_visits as number | undefined) ?? null,
      last_visited: (st.last_visited as string | undefined) ?? null,
    }
  })
}

// Create a rose owned by the operator and comp it a free year. This is the
// supported way to make a test gift or a present for a friend — no Stripe, but
// it still writes a €0 ledger row so free grants stay auditable.
export async function createFreeGiftAction(input: {
  slug: string
  recipient: string
  giver: string
  note?: string
}): Promise<{ slug: string; token: string }> {
  const op = await requireOperator()
  const sb = getAdminClient()

  const slug = cleanSlug(input?.slug)
  if (!slug) throw new Error("Pick a link name (letters, numbers and hyphens).")
  const recipient = cleanText(input?.recipient, LIMITS.name)
  const giver = cleanText(input?.giver, LIMITS.name)

  const { data: existing } = await sb.from("tenants").select("id").eq("slug", slug).maybeSingle()
  if (existing) throw new Error(`"${slug}" is taken — pick another link name.`)

  const { data: created, error: insErr } = await sb
    .from("tenants")
    .insert({
      slug,
      owner_user_id: op.userId,
      owner_email: op.email,
      recipient_name: recipient,
      giver_name: giver,
      status: "draft",
    })
    .select("id, slug, access_token")
    .single()
  if (insErr) throw new Error(insErr.message)

  // create_my_tenant would normally do this; we insert directly (service role)
  // because that RPC keys off auth.uid() and caps the account at 25.
  const { error: stateErr } = await sb.from("rose_state").insert({ tenant_id: created.id })
  if (stateErr) throw new Error(stateErr.message)

  const { error: compErr } = await sb.rpc("grant_complimentary_year", {
    p_slug: slug,
    p_note: cleanText(input?.note, LIMITS.name) || "operator — free rose",
  })
  if (compErr) throw new Error(compErr.message)

  revalidatePath("/admin")
  return { slug: created.slug as string, token: created.access_token as string }
}

// Comp an existing gift another free year — a friend's rose, or making good on
// a support issue without refunding.
export async function grantFreeYearAction(slug: string, note?: string): Promise<void> {
  await requireOperator()
  const clean = cleanSlug(slug)
  if (!clean) throw new Error("Invalid link name.")
  const { error } = await getAdminClient().rpc("grant_complimentary_year", {
    p_slug: clean,
    p_note: cleanText(note, LIMITS.name) || "operator — comped year",
  })
  if (error) throw new Error(error.message)
  revalidatePath("/admin")
}
