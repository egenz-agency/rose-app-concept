"use server"

import {
  fetchRoseState as srvFetchRoseState,
  recordVisit as srvRecordVisit,
  reviveRose as srvReviveRose,
  fetchMemoryStars as srvFetchMemoryStars,
  createMemoryStar as srvCreateMemoryStar,
  fetchLetters as srvFetchLetters,
  fetchGalleryPhotos as srvFetchGalleryPhotos,
} from "@/lib/server/tenantQueries"
import {
  getVapidPublicKey,
  registerPushSubscription,
  countPartnerDevices,
  sendMissYou as srvSendMissYou,
  isGiftRole,
  type GiftRole,
} from "@/lib/server/pushQueries"
import type { MemoryCapsuleInput } from "@/lib/supabase/starColumns"
import { getAccessibleTenant } from "@/lib/security/giftAccess"
import { cleanText, cleanDate, cleanHttpUrl, cleanInt, LIMITS } from "@/lib/security/validate"
import { enforceRateLimit, clientIp } from "@/lib/security/ratelimit"

// Resolve a gift slug → tenant_id on the server. This is the ONLY place the slug
// becomes a tenant_id; the browser can never address another couple's data.
// getAccessibleTenant also enforces the secret access-token cookie, so a slug
// alone — without the token the recipient was given — resolves to nothing.
async function tenantIdFor(slug: string): Promise<string> {
  const tenant = await getAccessibleTenant(slug)
  if (!tenant) throw new Error("This gift does not exist")
  return tenant.id
}

function sanitizePosition(p: unknown): [number, number, number] {
  const arr = Array.isArray(p) ? p : []
  const c = (v: unknown) => {
    const n = Number(v)
    return Number.isFinite(n) ? Math.max(-12, Math.min(12, n)) : 0
  }
  return [c(arr[0]), c(arr[1]), c(arr[2])]
}

export async function fetchRoseStateAction(slug: string) {
  return srvFetchRoseState(await tenantIdFor(slug))
}

export async function recordVisitAction(slug: string) {
  const id = await tenantIdFor(slug)
  await enforceRateLimit(`visit:${id}:${await clientIp()}`, 40, 60) // 40/min per IP
  return srvRecordVisit(id)
}

export async function reviveRoseAction(slug: string) {
  const id = await tenantIdFor(slug)
  // Revivals are a scarce resource; cap hard to stop a slug-guesser from burning them.
  await enforceRateLimit(`revive:${id}`, 4, 3600) // 4/hour per gift
  return srvReviveRose(id)
}

export async function fetchMemoryStarsAction(slug: string) {
  return srvFetchMemoryStars(await tenantIdFor(slug))
}

export async function createMemoryStarAction(
  slug: string,
  star: MemoryCapsuleInput
) {
  const id = await tenantIdFor(slug)
  await enforceRateLimit(`star:${id}:${await clientIp()}`, 12, 3600) // 12/hour per IP
  const photos = Array.isArray(star?.photos)
    ? (star.photos.slice(0, LIMITS.starPhotos).map((u) => cleanHttpUrl(u)).filter(Boolean) as string[])
    : []
  const clean: MemoryCapsuleInput = {
    title: cleanText(star?.title, LIMITS.title) ?? "A memory",
    date: cleanDate(star?.date) ?? new Date().toISOString().slice(0, 10),
    memory: cleanText(star?.memory, LIMITS.starMemory) ?? "",
    photos,
    position: sanitizePosition(star?.position),
    // ── Memory Constellation capsule ──
    // The slot binds this memory to one star of one generated constellation.
    // Both are bounded here: a crafted value can't address an arbitrary row.
    constellationIndex: cleanInt(star?.constellationIndex, 0, 999) ?? 0,
    slotIndex: cleanInt(star?.slotIndex, 0, 59),
    videoUrl: cleanHttpUrl(star?.videoUrl),
    voiceUrl: cleanHttpUrl(star?.voiceUrl),
    songUrl: cleanHttpUrl(star?.songUrl),
    location: cleanText(star?.location, LIMITS.location),
    quote: cleanText(star?.quote, LIMITS.note),
    isFavorite: star?.isFavorite === true,
    isAnniversary: star?.isAnniversary === true,
  }
  return srvCreateMemoryStar(id, clean)
}

export async function fetchLettersAction(slug: string) {
  return srvFetchLetters(await tenantIdFor(slug))
}

export async function fetchGalleryPhotosAction(slug: string) {
  return srvFetchGalleryPhotos(await tenantIdFor(slug))
}

// ── "I miss you" ─────────────────────────────────────────────────────────────
// All three actions resolve the slug through getAccessibleTenant (secret
// access-token cookie required), so only someone who legitimately has this gift
// can register a device or send a ping — and a ping can only ever reach the
// OTHER role inside THIS gift.

// What the client needs to offer the feature: the VAPID public key, both names
// (so the enable step can ask "which of you is this?"), and whether the other
// side has a device registered yet.
export async function getMissYouConfigAction(slug: string) {
  const tenant = await getAccessibleTenant(slug)
  if (!tenant) throw new Error("This gift does not exist")
  const publicKey = await getVapidPublicKey()
  return {
    publicKey,
    giverName: tenant.giver_name ?? "Your love",
    recipientName: tenant.recipient_name ?? "Your love",
  }
}

export async function registerMissYouDeviceAction(
  slug: string,
  role: string,
  subscription: { endpoint?: unknown; p256dh?: unknown; auth?: unknown }
) {
  const tenant = await getAccessibleTenant(slug)
  if (!tenant) throw new Error("This gift does not exist")
  if (!isGiftRole(role)) throw new Error("Unknown role")
  await enforceRateLimit(`push-reg:${tenant.id}:${await clientIp()}`, 20, 3600) // 20/hour per IP

  const endpoint = cleanHttpUrl(subscription?.endpoint)
  const p256dh = cleanText(subscription?.p256dh, 255)
  const auth = cleanText(subscription?.auth, 255)
  if (!endpoint || !p256dh || !auth) throw new Error("Invalid push subscription")

  await registerPushSubscription(tenant.id, role as GiftRole, { endpoint, p256dh, auth }, null)
  return { ok: true }
}

export async function sendMissYouAction(slug: string, role: string, count: unknown) {
  const tenant = await getAccessibleTenant(slug)
  if (!tenant) throw new Error("This gift does not exist")
  if (!isGiftRole(role)) throw new Error("Unknown role")
  // Taps are batched client-side; this still caps how often a gift can ping.
  await enforceRateLimit(`miss-you:${tenant.id}:${await clientIp()}`, 30, 3600) // 30/hour per IP

  const n = cleanInt(count, 1, 99) ?? 1
  const fromName =
    (role === "giver" ? tenant.giver_name : tenant.recipient_name) ?? "Your love"

  const partnerDevices = await countPartnerDevices(tenant.id, role as GiftRole)
  if (partnerDevices === 0) {
    // Nothing to send to yet — tell the sender instead of silently succeeding.
    return { ok: false, reason: "no-partner-device" as const, sent: 0 }
  }

  const result = await srvSendMissYou(tenant.id, role as GiftRole, fromName, n)
  return { ok: result.sent > 0, reason: null, ...result }
}
