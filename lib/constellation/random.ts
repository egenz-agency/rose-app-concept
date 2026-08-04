// Deterministic pseudo-randomness for constellation generation.
//
// Everything about a constellation — its silhouette, its star sizes, its name —
// is derived from a seed (gift identity + constellation number). The same seed
// always rebuilds the same sky, so a couple's constellation is permanent without
// ever storing its geometry, and no two gifts share one.

/** FNV-1a — a stable 32-bit hash of a string. */
export function hashString(str: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** mulberry32 — small, fast, well-distributed seeded PRNG. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** A seeded RNG with the few shapes the generator actually needs. */
export interface Rng {
  (): number
  range: (min: number, max: number) => number
  int: (minInclusive: number, maxInclusive: number) => number
  pick: <T>(items: readonly T[]) => T
  /** Signed jitter in [-amount, amount]. */
  jitter: (amount: number) => number
}

export function makeRng(seed: string | number): Rng {
  const base = typeof seed === "number" ? seed >>> 0 : hashString(seed)
  const next = mulberry32(base) as Rng
  next.range = (min, max) => min + next() * (max - min)
  next.int = (min, max) => min + Math.floor(next() * (max - min + 1))
  next.pick = (items) => items[Math.floor(next() * items.length)]
  next.jitter = (amount) => (next() * 2 - 1) * amount
  return next
}
