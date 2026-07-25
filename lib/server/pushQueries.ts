import "server-only"
import webpush from "web-push"
import { getAdminClient } from "@/lib/supabase/admin"

// ── "I miss you" push, scoped to a single gift ───────────────────────────────
//
// Security model (mirrors the rest of tenantQueries): every function here takes a
// `tenantId` that the CALLER already resolved from a gift slug via
// getAccessibleTenant() — which enforces the secret access-token cookie. A ping
// is only ever delivered to the OTHER role inside the SAME tenant, so it is
// structurally impossible for one couple's ping to reach another couple.

export type GiftRole = "giver" | "recipient"

export function otherRole(role: GiftRole): GiftRole {
  return role === "giver" ? "recipient" : "giver"
}

export function isGiftRole(v: unknown): v is GiftRole {
  return v === "giver" || v === "recipient"
}

export interface PushSubscriptionInput {
  endpoint: string
  p256dh: string
  auth: string
}

interface VapidKeys {
  publicKey: string
  privateKey: string
  subject: string
}

async function loadVapid(): Promise<VapidKeys | null> {
  const sb = getAdminClient()
  const { data } = await sb.from("app_config").select("key,value")
  const map = Object.fromEntries((data ?? []).map((r: { key: string; value: string }) => [r.key, r.value]))
  const publicKey = map["vapid_public_key"]
  const privateKey = map["vapid_private_key"]
  if (!publicKey || !privateKey) return null
  return { publicKey, privateKey, subject: map["vapid_subject"] ?? "mailto:noreply@example.com" }
}

// The browser needs the PUBLIC key to create a subscription. Safe to expose.
export async function getVapidPublicKey(): Promise<string | null> {
  const v = await loadVapid()
  return v?.publicKey ?? null
}

// Save (or refresh) this device's subscription for one side of one gift.
// Keyed on the endpoint, so re-enabling on the same device updates in place —
// and switching role on that device moves it rather than duplicating.
export async function registerPushSubscription(
  tenantId: string,
  role: GiftRole,
  sub: PushSubscriptionInput,
  userAgent: string | null
): Promise<void> {
  const sb = getAdminClient()
  const { error } = await sb.from("push_subscriptions").upsert(
    {
      tenant_id: tenantId,
      role,
      endpoint: sub.endpoint,
      p256dh: sub.p256dh,
      auth: sub.auth,
      user_agent: userAgent,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" }
  )
  if (error) throw new Error(error.message)
}

// Does the other side have at least one device registered? Used to tell the
// sender "they'll feel it" vs "they haven't turned it on yet".
export async function countPartnerDevices(tenantId: string, role: GiftRole): Promise<number> {
  const sb = getAdminClient()
  const { count } = await sb
    .from("push_subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("role", otherRole(role))
  return count ?? 0
}

export interface SendResult {
  recipients: number
  sent: number
  removed: number
}

// Send an "I miss you" ping to the other person in THIS gift.
export async function sendMissYou(
  tenantId: string,
  fromRole: GiftRole,
  fromName: string,
  count: number
): Promise<SendResult> {
  const vapid = await loadVapid()
  if (!vapid) throw new Error("Push is not configured for this deployment")
  webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey)

  const sb = getAdminClient()
  const { data: subs } = await sb
    .from("push_subscriptions")
    .select("endpoint,p256dh,auth")
    .eq("tenant_id", tenantId)
    .eq("role", otherRole(fromRole))

  const list = subs ?? []
  const n = Math.max(1, Math.min(99, count))
  const title = n > 1 ? `${fromName} misses you ×${n} 💗` : `${fromName} misses you 💗`
  const payload = JSON.stringify({
    title,
    body: "Thinking of you right now — tap to reach back.",
    url: "/",
  })

  let sent = 0
  let removed = 0
  for (const s of list) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint as string, keys: { p256dh: s.p256dh as string, auth: s.auth as string } },
        payload
      )
      sent++
    } catch (err: unknown) {
      const code = (err as { statusCode?: number })?.statusCode ?? 0
      // 404/410 = the browser dropped this subscription; prune it.
      if (code === 404 || code === 410) {
        await sb.from("push_subscriptions").delete().eq("endpoint", s.endpoint as string)
        removed++
      }
    }
  }

  return { recipients: list.length, sent, removed }
}
