"use client"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useSceneStore } from "@/lib/store/sceneStore"
import { useConstellation } from "./useConstellation"

/**
 * Which stars have woken since she last went up to look.
 *
 * The count of lifetime unlocks she has already seen is kept in localStorage. On
 * a device that has never seen this gift it is seeded to the current count, so an
 * existing couple isn't told that thirty stars are "new" — only what wakes from
 * here on is announced.
 */

const STORAGE_PREFIX = "rose_sky_seen_unlocks:"

function read(seed: string): number | null {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + seed)
    if (raw === null) return null
    const n = Number(raw)
    return Number.isFinite(n) ? n : null
  } catch {
    return null
  }
}

function write(seed: string, n: number) {
  try {
    localStorage.setItem(STORAGE_PREFIX + seed, String(n))
  } catch {
    // Storage blocked — nothing announced, which is the quiet failure we want.
  }
}

export interface NewStars {
  /** How many have woken since she last looked. */
  count: number
  /** Their slots in the current chapter, so they can be made to pulse. */
  slots: Set<number>
  /** Call once she has been up and seen them. */
  markSeen: () => void
}

const NONE: Set<number> = new Set()

export function useNewStars(): NewStars {
  const rose = useSceneStore((s) => s.rose)
  const previewDays = useSceneStore((s) => s.previewDays)
  const view = useConstellation()
  const seed = view.seed

  const lifetime = 1 + (rose?.totalVisits ?? 0)
  const [seenCount, setSeenCount] = useState<number | null>(null)

  // Seed on first sight of this gift, then keep the local mirror in step.
  useEffect(() => {
    const stored = read(seed)
    if (stored === null) {
      write(seed, lifetime)
      setSeenCount(lifetime)
    } else {
      setSeenCount(stored)
    }
    // Only when the gift changes — `lifetime` must not re-seed on every tending.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed])

  const markSeen = useCallback(() => {
    write(seed, lifetime)
    setSeenCount(lifetime)
  }, [seed, lifetime])

  return useMemo(() => {
    // The growth preview is a simulation; nothing in it has really woken.
    if (previewDays !== null || seenCount === null || rose === null) {
      return { count: 0, slots: NONE, markSeen }
    }
    const count = Math.max(0, lifetime - seenCount)
    if (count === 0) return { count: 0, slots: NONE, markSeen }

    // The newest are the last to have been unlocked in the current chapter.
    const slots = new Set(view.unlockedSlots.slice(-count))
    return { count, slots, markSeen }
  }, [previewDays, seenCount, rose, lifetime, view.unlockedSlots, markSeen])
}
