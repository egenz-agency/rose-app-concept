"use server"

import {
  getTenantBySlug,
  fetchRoseState as srvFetchRoseState,
  recordVisit as srvRecordVisit,
  reviveRose as srvReviveRose,
  fetchMemoryStars as srvFetchMemoryStars,
  createMemoryStar as srvCreateMemoryStar,
  fetchLetters as srvFetchLetters,
  fetchGalleryPhotos as srvFetchGalleryPhotos,
} from "@/lib/server/tenantQueries"

// Resolve a gift slug → tenant_id on the server. This is the ONLY place the slug
// becomes a tenant_id; the browser can never address another couple's data.
async function tenantIdFor(slug: string): Promise<string> {
  const tenant = await getTenantBySlug(slug)
  if (!tenant) throw new Error("This gift does not exist")
  if (tenant.status === "suspended") throw new Error("This gift is no longer available")
  return tenant.id
}

export async function fetchRoseStateAction(slug: string) {
  return srvFetchRoseState(await tenantIdFor(slug))
}

export async function recordVisitAction(slug: string) {
  return srvRecordVisit(await tenantIdFor(slug))
}

export async function reviveRoseAction(slug: string) {
  return srvReviveRose(await tenantIdFor(slug))
}

export async function fetchMemoryStarsAction(slug: string) {
  return srvFetchMemoryStars(await tenantIdFor(slug))
}

export async function createMemoryStarAction(
  slug: string,
  star: { title: string; date: string; memory: string; photos: string[]; position: [number, number, number] }
) {
  return srvCreateMemoryStar(await tenantIdFor(slug), star)
}

export async function fetchLettersAction(slug: string) {
  return srvFetchLetters(await tenantIdFor(slug))
}

export async function fetchGalleryPhotosAction(slug: string) {
  return srvFetchGalleryPhotos(await tenantIdFor(slug))
}
