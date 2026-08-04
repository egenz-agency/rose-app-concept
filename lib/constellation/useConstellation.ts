"use client"
import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { fetchMemoryStars } from "@/lib/data/roseApi"
import { useSceneStore } from "@/lib/store/sceneStore"
import type { StarRow } from "@/lib/supabase/starColumns"
import { generateConstellation, type Constellation } from "./generate"

// The world coordinates of the sky above the rose. Same scene, same lighting,
// same drifting dust — just much higher up.
export const UNIVERSE_Y = 28
/** Half-width of a constellation once placed in the world. */
export const CONSTELLATION_SCALE = 6.4
/** How far a completed constellation is set back and aside from the current one. */
export const ARCHIVE_SPACING = 17

/** The seed for the legacy single-tenant gift, which has no slug. */
const LEGACY_SEED = "enchanted-rose"

/** Stable empty default — a fresh [] each render would defeat the memo below. */
const NO_ROWS: StarRow[] = []

export interface ConstellationView {
  /** The identity every constellation for this gift is generated from. */
  seed: string
  /** Which chapter is currently being written. New memories are stored against it. */
  chapterIndex: number
  /** The chapter currently being written. */
  constellation: Constellation
  /** Chapters already finished — they hang nearby, permanent. */
  completed: Constellation[]
  /** slot index → the memory living in it. */
  memories: Map<number, StarRow>
  /** How many of this chapter's stars have been woken by tending the rose. */
  unlockedCount: number
  /** How many hold a memory. */
  filledCount: number
  /** Every star woken, every star filled. */
  isComplete: boolean
  /** The name to show: the earned poetic name, or the working chapter title. */
  title: string
  /** Slots that are unlocked, in the order they woke up. */
  unlockedSlots: number[]
  isLoading: boolean
}

/** A star row only counts as a memory once it actually holds something. */
function holdsMemory(row: StarRow): boolean {
  return Boolean(row.title?.trim() || row.memory?.trim())
}

/**
 * Bind stored memories to the slots of one generated constellation.
 *
 * Rows written since the constellation shipped carry their own slot. Rows written
 * before it — and any row whose slot is already taken — come from the shared
 * `orphans` queue and are adopted into the earliest free slot in unlock order, so
 * the sky fills outward from its heart exactly as it woke up. Orphans this
 * chapter has no room for stay in the queue for the next one: nothing a couple
 * ever wrote is lost to the upgrade.
 */
function bindMemories(
  explicit: Map<number, StarRow>,
  orphans: StarRow[],
  chapter: Constellation
): Map<number, StarRow> {
  const bound = new Map<number, StarRow>()
  const valid = new Set(chapter.stars.map((s) => s.index))

  for (const [slot, row] of explicit) {
    if (valid.has(slot)) bound.set(slot, row)
    else orphans.unshift(row) // slot no longer exists — re-home it
  }

  for (const slot of chapter.unlockOrder) {
    if (orphans.length === 0) break
    if (bound.has(slot)) continue
    bound.set(slot, orphans.shift()!)
  }

  return bound
}

/** Split rows into slot-addressed memories per chapter, plus an ordered orphan queue. */
function indexRows(rows: StarRow[]) {
  const explicit = new Map<number, Map<number, StarRow>>()
  const orphans: StarRow[] = []

  for (const row of rows) {
    const chapter = row.constellation_index ?? 0
    const slot = row.slot_index
    if (typeof slot !== "number") {
      orphans.push(row)
      continue
    }
    let forChapter = explicit.get(chapter)
    if (!forChapter) explicit.set(chapter, (forChapter = new Map()))
    // Two rows claiming one slot shouldn't be possible (there's a unique index),
    // but if it ever happens the later one is re-homed rather than dropped.
    if (forChapter.has(slot)) orphans.push(row)
    else forChapter.set(slot, row)
  }

  // Oldest memory takes the earliest slot.
  orphans.sort((a, b) => a.created_at.localeCompare(b.created_at))
  return { explicit, orphans }
}

/**
 * The couple's current sky.
 *
 * One star is lit on the first day. Every time the rose is tended another wakes,
 * following the constellation's own growth order outward from its heart. When
 * every star has been woken AND filled, the chapter is sealed under its poetic
 * name and the next constellation appears alongside it.
 */
export function useConstellation(): ConstellationView {
  const tenantSlug = useSceneStore((s) => s.tenantSlug)
  const rose = useSceneStore((s) => s.rose)
  const previewDays = useSceneStore((s) => s.previewDays)
  const previewFill = useSceneStore((s) => s.previewFill)
  const seed = tenantSlug ?? LEGACY_SEED

  const { data: rows = NO_ROWS, isLoading } = useQuery({
    queryKey: ["memory-stars"],
    queryFn: fetchMemoryStars,
    staleTime: 30_000,
  })

  // Every tending of the rose wakes one more star. The very first is already lit.
  const lifetimeUnlocks = 1 + (rose?.totalVisits ?? 0)

  return useMemo(() => {
    // ── Preview ──
    // Stand in for however many days of tending the owner wants to look at. This
    // replaces the whole read: no stored row is consulted and none is written.
    if (previewDays !== null) {
      return previewView(seed, previewDays, previewFill)
    }

    const { explicit, orphans } = indexRows(rows.filter(holdsMemory))

    // Walk forward through the chapters, sealing each one that is entirely
    // filled, until we reach the one still being written. The orphan queue is
    // consumed as we go, so overflow always carries into the next sky.
    //
    // A finished chapter is only sealed away once the next one has been started.
    // Otherwise the moment a couple wrote their last memory the sky would blink
    // to an empty one — and that moment is the whole point.
    const completed: Constellation[] = []
    let chapterIndex = 0
    let chapter = generateConstellation(seed, 0)
    let memories = bindMemories(explicit.get(0) ?? new Map(), orphans, chapter)
    let consumed = 0

    // A generous ceiling — a couple would need decades of memories to reach it.
    while (chapterIndex < 64) {
      const full = memories.size >= chapter.stars.length
      const nextStarted = (explicit.get(chapterIndex + 1)?.size ?? 0) > 0 || orphans.length > 0
      if (!full || !nextStarted) break

      completed.push(chapter)
      consumed += chapter.stars.length
      chapterIndex++
      chapter = generateConstellation(seed, chapterIndex)
      memories = bindMemories(explicit.get(chapterIndex) ?? new Map(), orphans, chapter)
    }

    const total = chapter.stars.length
    const unlockedCount = Math.max(1, Math.min(total, lifetimeUnlocks - consumed))
    const filledCount = memories.size
    const isComplete = filledCount >= total

    return {
      seed,
      chapterIndex,
      constellation: chapter,
      completed,
      memories,
      unlockedCount,
      filledCount,
      isComplete,
      title: isComplete ? chapter.name : chapter.workingTitle,
      unlockedSlots: chapter.unlockOrder.slice(0, unlockedCount),
      isLoading,
    }
  }, [rows, seed, lifetimeUnlocks, isLoading, previewDays, previewFill])
}

// ── Growth preview ───────────────────────────────────────────────────────────

/**
 * The day on which each of the first `count` chapters finishes, for a couple who
 * tends and writes daily. Lets the preview offer real milestones to jump to
 * instead of an arbitrary slider position.
 */
export function chapterMilestones(seed: string, count = 4): { chapter: number; day: number }[] {
  const out: { chapter: number; day: number }[] = []
  let day = 0
  for (let i = 0; i < count; i++) {
    day += generateConstellation(seed, i).stars.length
    out.push({ chapter: i, day })
  }
  return out
}

/** A stand-in memory, so a previewed star glows the way a real filled one does. */
function previewMemory(seed: string, chapterIndex: number, slot: number): StarRow {
  // Deterministic, so scrubbing back and forth doesn't reshuffle which stars are
  // favourites — and so both of those variants actually show up to be checked.
  const n = slot + chapterIndex * 7
  return {
    id: `preview-${chapterIndex}-${slot}`,
    title: "A memory would live here",
    date: new Date().toISOString().slice(0, 10),
    memory:
      "This star is part of a growth preview — nothing here was written by anyone, " +
      "and nothing is saved. Turn the preview off to see the real sky.",
    photos: [],
    position_x: 0,
    position_y: 0,
    position_z: 0,
    created_at: new Date().toISOString(),
    constellation_index: chapterIndex,
    slot_index: slot,
    is_favorite: n % 7 === 3,
    is_anniversary: n % 13 === 5,
  }
}

/**
 * The sky as it would look after `days` days of tending.
 *
 * With `fill` on this models the realistic path — someone who tends the rose and
 * writes something each day — which is the only way chapters ever complete, so
 * it's also the only way to preview the completion sequence and later chapters.
 * With it off, stars wake but stay empty and the sky stops at the first chapter.
 */
function previewView(seed: string, days: number, fill: boolean): ConstellationView {
  let remaining = 1 + Math.max(0, days)
  const completed: Constellation[] = []
  let chapterIndex = 0
  let chapter = generateConstellation(seed, 0)

  // Seal each chapter the run has outgrown, exactly as the real walk does.
  while (fill && chapterIndex < 64 && remaining > chapter.stars.length) {
    completed.push(chapter)
    remaining -= chapter.stars.length
    chapterIndex++
    chapter = generateConstellation(seed, chapterIndex)
  }

  const total = chapter.stars.length
  const unlockedCount = Math.max(1, Math.min(total, remaining))
  const unlockedSlots = chapter.unlockOrder.slice(0, unlockedCount)

  const memories = new Map<number, StarRow>()
  if (fill) {
    for (const slot of unlockedSlots) {
      memories.set(slot, previewMemory(seed, chapterIndex, slot))
    }
  }

  const isComplete = memories.size >= total

  return {
    seed,
    chapterIndex,
    constellation: chapter,
    completed,
    memories,
    unlockedCount,
    filledCount: memories.size,
    isComplete,
    title: isComplete ? chapter.name : chapter.workingTitle,
    unlockedSlots,
    isLoading: false,
  }
}
