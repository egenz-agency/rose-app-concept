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
import { getAccessibleTenant } from "@/lib/security/giftAccess"
import { cleanText, cleanDate, cleanHttpUrl, LIMITS } from "@/lib/security/validate"
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
  star: { title: string; date: string; memory: string; photos: string[]; position: [number, number, number] }
) {
  const id = await tenantIdFor(slug)
  await enforceRateLimit(`star:${id}:${await clientIp()}`, 12, 3600) // 12/hour per IP
  const photos = Array.isArray(star?.photos)
    ? (star.photos.slice(0, LIMITS.starPhotos).map((u) => cleanHttpUrl(u)).filter(Boolean) as string[])
    : []
  const clean = {
    title: cleanText(star?.title, LIMITS.title) ?? "A memory",
    date: cleanDate(star?.date) ?? new Date().toISOString().slice(0, 10),
    memory: cleanText(star?.memory, LIMITS.starMemory) ?? "",
    photos,
    position: sanitizePosition(star?.position),
  }
  return srvCreateMemoryStar(id, clean)
}

export async function fetchLettersAction(slug: string) {
  return srvFetchLetters(await tenantIdFor(slug))
}

export async function fetchGalleryPhotosAction(slug: string) {
  return srvFetchGalleryPhotos(await tenantIdFor(slug))
}
