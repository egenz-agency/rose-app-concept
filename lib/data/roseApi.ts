"use client"

// Single entry point the client components use for rose data. It dispatches to
// one of two backends based on the current tenant slug in the store:
//
//   • tenantSlug set  → the multi-tenant product (/r/[slug]). Calls go through
//     secured SERVER ACTIONS, so the browser never touches Supabase directly and
//     can only ever reach its own tenant's data.
//   • tenantSlug null → the owner's legacy personal gift at "/". Calls use the
//     original browser-side queries against the enchanted-rose project.
//
// Components keep calling fetchRoseState(), recordVisit(), etc. with the same
// signatures — they don't need to know which mode they're in.

import * as legacy from "@/lib/supabase/queries"
import { useSceneStore } from "@/lib/store/sceneStore"
import {
  fetchRoseStateAction,
  recordVisitAction,
  reviveRoseAction,
  fetchMemoryStarsAction,
  createMemoryStarAction,
  fetchLettersAction,
  fetchGalleryPhotosAction,
} from "@/app/r/[slug]/actions"

function slug(): string | null {
  return useSceneStore.getState().tenantSlug
}

export function fetchRoseState() {
  const s = slug()
  return s ? fetchRoseStateAction(s) : legacy.fetchRoseState()
}

export function recordVisit() {
  const s = slug()
  return s ? recordVisitAction(s) : legacy.recordVisit()
}

export function reviveRose() {
  const s = slug()
  return s ? reviveRoseAction(s) : legacy.reviveRose()
}

export function fetchMemoryStars() {
  const s = slug()
  return s ? fetchMemoryStarsAction(s) : legacy.fetchMemoryStars()
}

export function createMemoryStar(star: {
  title: string
  date: string
  memory: string
  photos: string[]
  position: [number, number, number]
}) {
  const s = slug()
  return s ? createMemoryStarAction(s, star) : legacy.createMemoryStar(star)
}

export function fetchLetters() {
  const s = slug()
  return s ? fetchLettersAction(s) : legacy.fetchLetters()
}

export function fetchGalleryPhotos() {
  const s = slug()
  return s ? fetchGalleryPhotosAction(s) : legacy.fetchGalleryPhotos()
}
