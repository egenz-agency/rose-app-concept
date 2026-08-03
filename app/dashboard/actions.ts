"use server"

import { revalidatePath } from "next/cache"
import { getSaasServerClient, getCurrentUser } from "@/lib/supabase/saasServer"
import { getAdminClient } from "@/lib/supabase/admin"
import {
  cleanSlug, cleanText, cleanDate, cleanHttpUrl, cleanInt, validateUpload, LIMITS,
} from "@/lib/security/validate"
import { enforceRateLimit } from "@/lib/security/ratelimit"
import { isGiftLive } from "@/lib/payments/entitlement"
import {
  getVapidPublicKey,
  registerPushSubscription,
  countPartnerDevices,
  sendMissYou as srvSendMissYou,
} from "@/lib/server/pushQueries"

// All dashboard mutations run through the buyer's OWN session, so Postgres RLS
// guarantees they can only ever touch their own tenant's rows. We additionally
// resolve the tenant_id server-side (never trust a client-supplied id) and
// validate/limit every input.

async function requireUserId(): Promise<string> {
  const user = await getCurrentUser()
  if (!user) throw new Error("Not signed in")
  return user.id
}

async function requireMyTenantId(): Promise<string> {
  await requireUserId()
  const sb = await getSaasServerClient()
  const { data } = await sb.from("tenants").select("id").order("created_at", { ascending: true }).limit(1).single()
  if (!data) throw new Error("No gift yet")
  return data.id as string
}

// Same, but also requires the gift to be paid for and inside its year. Building
// a gift is free — only the things that actually REACH the recipient (her link,
// and pushes to her phone) are gated, so the owner never loses their own work.
async function requireLiveTenantId(): Promise<string> {
  await requireUserId()
  const sb = await getSaasServerClient()
  const { data } = await sb
    .from("tenants")
    .select("id, status, paid, expires_at")
    .order("created_at", { ascending: true })
    .limit(1)
    .single()
  if (!data) throw new Error("No gift yet")
  if (!isGiftLive(data as { status: string; paid: boolean; expires_at: string | null })) {
    throw new Error("This gift isn't active — unlock it from your dashboard first.")
  }
  return data.id as string
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function assertUuid(id: string) {
  if (typeof id !== "string" || !UUID_RE.test(id)) throw new Error("Invalid id.")
}

export async function createGiftAction(input: { slug: string; recipient: string; giver: string }) {
  const uid = await requireUserId()
  await enforceRateLimit(`creategift:${uid}`, 8, 3600) // 8/hour per account
  const slug = cleanSlug(input?.slug)
  const recipient = cleanText(input?.recipient, LIMITS.name)
  const giver = cleanText(input?.giver, LIMITS.name)

  const sb = await getSaasServerClient()
  // create_my_tenant enforces the per-account gift cap + uses auth.uid() internally.
  const { error } = await sb.rpc("create_my_tenant", {
    p_slug: slug,
    p_recipient: recipient,
    p_giver: giver,
  })
  if (error) {
    if (error.message.includes("duplicate") || error.code === "23505") {
      throw new Error("That link name is taken — try another.")
    }
    if (error.message.toLowerCase().includes("limit")) {
      throw new Error("You've reached the maximum number of gifts for this account.")
    }
    throw new Error(error.message)
  }
  revalidatePath("/dashboard")
}

export async function addMessageAction(input: { message: string; author?: string; scheduled_for?: string | null }) {
  const tenantId = await requireMyTenantId()
  await enforceRateLimit(`msg:${tenantId}`, 60, 3600)
  const sb = await getSaasServerClient()
  const { error } = await sb.from("scheduled_messages").insert({
    tenant_id: tenantId,
    message: cleanText(input?.message, LIMITS.message) ?? (() => { throw new Error("Message is required.") })(),
    author: cleanText(input?.author, LIMITS.name) || "Your love",
    scheduled_for: cleanDate(input?.scheduled_for),
  })
  if (error) throw new Error(error.message)
  revalidatePath("/dashboard")
}

export async function deleteMessageAction(id: string) {
  await requireMyTenantId()
  assertUuid(id)
  const sb = await getSaasServerClient()
  const { error } = await sb.from("scheduled_messages").delete().eq("id", id)
  if (error) throw new Error(error.message)
  revalidatePath("/dashboard")
}

export async function addMomentAction(input: {
  title?: string
  message?: string
  photo_url?: string | null
  video_url?: string | null
  trigger_visit?: number | null
  trigger_date?: string | null
  repeat_every?: number | null
}) {
  const tenantId = await requireMyTenantId()
  await enforceRateLimit(`moment:${tenantId}`, 60, 3600)
  const sb = await getSaasServerClient()
  const { error } = await sb.from("scheduled_moments").insert({
    tenant_id: tenantId,
    title: cleanText(input?.title, LIMITS.title),
    message: cleanText(input?.message, LIMITS.message),
    photo_url: cleanHttpUrl(input?.photo_url),
    video_url: cleanHttpUrl(input?.video_url),
    trigger_visit: cleanInt(input?.trigger_visit, 1, 100000),
    trigger_date: cleanDate(input?.trigger_date),
    repeat_every: cleanInt(input?.repeat_every, 1, 3650),
  })
  if (error) throw new Error(error.message)
  revalidatePath("/dashboard")
}

export async function deleteMomentAction(id: string) {
  await requireMyTenantId()
  assertUuid(id)
  const sb = await getSaasServerClient()
  const { error } = await sb.from("scheduled_moments").delete().eq("id", id)
  if (error) throw new Error(error.message)
  revalidatePath("/dashboard")
}

export async function updateNamesAction(input: { recipient: string; giver: string }) {
  const tenantId = await requireMyTenantId()
  const sb = await getSaasServerClient()
  const { error } = await sb
    .from("tenants")
    .update({ recipient_name: cleanText(input?.recipient, LIMITS.name), giver_name: cleanText(input?.giver, LIMITS.name) })
    .eq("id", tenantId)
  if (error) throw new Error(error.message)
  revalidatePath("/dashboard")
}

// Upload an intro video or song. Size + mime + extension are strictly validated
// (never accept executable/HTML/SVG content, and cap cost).
//
// We store the storage PATH, not a URL. The bucket is private, so every viewer
// gets a short-lived signed URL minted at render time — which is what makes
// "revoke their access" also cover the video and the song.
export async function uploadMediaAction(formData: FormData) {
  const tenantId = await requireMyTenantId()
  await enforceRateLimit(`upload:${tenantId}`, 20, 3600) // 20/hour per gift
  const kindRaw = String(formData.get("kind") || "")
  const file = formData.get("file") as File | null
  const { kind, ext } = validateUpload(kindRaw, file)

  const path = `${tenantId}/${kind}-${Date.now()}.${ext}`
  const admin = getAdminClient()
  const { error: upErr } = await admin.storage.from("tenant-media").upload(path, file!, {
    cacheControl: "31536000", upsert: false, contentType: file!.type || undefined,
  })
  if (upErr) throw new Error(upErr.message)

  const sb = await getSaasServerClient()
  const { data: t } = await sb.from("tenants").select("customization").eq("id", tenantId).single()
  const key = kind === "intro" ? "introVideoUrl" : "songUrl"
  const customization = { ...((t?.customization as Record<string, unknown>) ?? {}), [key]: path }
  const { error } = await sb.from("tenants").update({ customization }).eq("id", tenantId)
  if (error) throw new Error(error.message)
  revalidatePath("/dashboard")
}

export async function clearMediaAction(kind: "intro" | "song") {
  const tenantId = await requireMyTenantId()
  if (kind !== "intro" && kind !== "song") throw new Error("Bad media kind")
  const sb = await getSaasServerClient()
  const { data: t } = await sb.from("tenants").select("customization").eq("id", tenantId).single()
  const customization = { ...((t?.customization as Record<string, unknown>) ?? {}) }
  delete customization[kind === "intro" ? "introVideoUrl" : "songUrl"]
  const { error } = await sb.from("tenants").update({ customization }).eq("id", tenantId)
  if (error) throw new Error(error.message)
  revalidatePath("/dashboard")
}

export async function signOutAction() {
  const sb = await getSaasServerClient()
  await sb.auth.signOut()
  revalidatePath("/dashboard")
}

// GDPR right to erasure: permanently delete the buyer's account and ALL their
// gift data (tenants + cascaded rows). Runs against the user's own session.
export async function deleteAccountAction() {
  const uid = await requireUserId()
  const admin = getAdminClient()
  // Remove uploaded media first (storage isn't covered by the DB cascade).
  const sb = await getSaasServerClient()
  const { data: tenants } = await sb.from("tenants").select("id")
  for (const t of tenants ?? []) {
    const { data: files } = await admin.storage.from("tenant-media").list(t.id as string)
    if (files?.length) {
      await admin.storage.from("tenant-media").remove(files.map((f) => `${t.id}/${f.name}`))
    }
  }
  // Deleting the auth user cascades to tenants → all content rows (ON DELETE CASCADE).
  const { error } = await admin.auth.admin.deleteUser(uid)
  if (error) throw new Error(error.message)
  await sb.auth.signOut()
}

// ── "I miss you" (owner side) ────────────────────────────────────────────────
// The buyer sends from their OWN dashboard, so their identity comes from their
// session — not from a role they pick. They are always the gift's `giver`, and a
// ping goes only to the `recipient` devices of their own tenant, which
// requireMyTenantId() resolved through their RLS-scoped session.

// The public VAPID key + who they'd be reaching. Safe to expose to the browser.
export async function getOwnerMissYouConfigAction() {
  const tenantId = await requireLiveTenantId()
  const sb = await getSaasServerClient()
  const { data } = await sb.from("tenants").select("recipient_name").eq("id", tenantId).single()
  return {
    publicKey: await getVapidPublicKey(),
    recipientName: (data?.recipient_name as string | null) ?? "Your love",
  }
}

export async function registerOwnerDeviceAction(subscription: {
  endpoint?: unknown
  p256dh?: unknown
  auth?: unknown
}) {
  const tenantId = await requireLiveTenantId()
  await enforceRateLimit(`push-reg-owner:${tenantId}`, 20, 3600) // 20/hour per gift

  const endpoint = cleanHttpUrl(subscription?.endpoint)
  const p256dh = cleanText(subscription?.p256dh, 255)
  const auth = cleanText(subscription?.auth, 255)
  if (!endpoint || !p256dh || !auth) throw new Error("Invalid push subscription")

  await registerPushSubscription(tenantId, "giver", { endpoint, p256dh, auth }, null)
  return { ok: true }
}

export async function sendOwnerMissYouAction(count: unknown) {
  const tenantId = await requireLiveTenantId()
  await enforceRateLimit(`miss-you-owner:${tenantId}`, 30, 3600) // 30/hour per gift

  const sb = await getSaasServerClient()
  const { data } = await sb.from("tenants").select("giver_name").eq("id", tenantId).single()
  const fromName = (data?.giver_name as string | null) ?? "Your love"

  const partnerDevices = await countPartnerDevices(tenantId, "giver")
  if (partnerDevices === 0) {
    // Nothing to send to yet — tell the sender instead of silently succeeding.
    return { ok: false, reason: "no-partner-device" as const, sent: 0 }
  }

  const n = cleanInt(count, 1, 99) ?? 1
  const result = await srvSendMissYou(tenantId, "giver", fromName, n)
  return { ok: result.sent > 0, reason: null, ...result }
}

// ── First-run guide ──────────────────────────────────────────────────────────
// Stored on the tenant rather than in localStorage so the guide doesn't reappear
// when the owner opens the dashboard on their phone after setting it up on a
// laptop. Kept inside `customization` to avoid a migration for one flag.
export async function markTourSeenAction() {
  const tenantId = await requireMyTenantId()
  const sb = await getSaasServerClient()
  const { data: t } = await sb.from("tenants").select("customization").eq("id", tenantId).single()
  const customization = {
    ...((t?.customization as Record<string, unknown>) ?? {}),
    tourSeenAt: new Date().toISOString(),
  }
  const { error } = await sb.from("tenants").update({ customization }).eq("id", tenantId)
  if (error) throw new Error(error.message)
  revalidatePath("/dashboard")
}
