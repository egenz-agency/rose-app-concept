// Poetic names for completed constellations.
//
// Picked deterministically from the constellation's own seed, so the name a
// couple earns on the day they fill their last star is the name that sky was
// always going to have.

import { makeRng } from "./random"

const ADJECTIVES = [
  "Eternal", "Northern", "Celestial", "Midnight", "Golden", "Infinite",
  "Silent", "Velvet", "Amber", "Crimson", "Quiet", "Distant",
  "Gentle", "Endless", "Luminous", "Secret", "Boundless", "Tender",
  "Sapphire", "Winter", "Evening", "Morning", "Sacred", "Ivory",
  "Softest", "Weightless", "Unhurried", "Patient", "Wandering", "Sunlit",
] as const

const NOUNS = [
  "Bloom", "Promise", "Sky", "Garden", "Orbit", "Ember",
  "Vow", "Horizon", "Dawn", "Tide", "Lantern", "Harbour",
  "Echo", "Thread", "Compass", "Meridian", "Solstice", "Hearth",
  "Aurora", "Cradle", "Verse", "Refrain", "Keepsake", "Lullaby",
  "Wingspan", "Anchor", "Crossing", "Nightfall", "Hourglass", "Firelight",
] as const

const OURS = [
  "Sky", "Orbit", "Garden", "Horizon", "Constellation", "Small Forever",
  "Quiet Hour", "Long Way Home", "Whole Sky",
] as const

const TOGETHER = [
  "Infinite", "Weightless", "Golden", "Endless", "Luminous", "Unhurried",
] as const

/**
 * A stable poetic name for one constellation. Four sentence shapes keep the
 * naming from ever sounding like a template.
 */
export function constellationName(seed: string, index: number): string {
  const rng = makeRng(`name:${seed}:${index}`)
  const shape = rng()

  if (shape < 0.62) return `${rng.pick(ADJECTIVES)} ${rng.pick(NOUNS)}`
  if (shape < 0.78) return `Our ${rng.pick(OURS)}`
  if (shape < 0.9) return `${rng.pick(TOGETHER)} Together`
  return `The ${rng.pick(ADJECTIVES)} ${rng.pick(NOUNS)}`
}

/**
 * The working title a constellation carries while it is still being filled.
 * Chapter One, Chapter Two… so an unfinished sky still has an identity.
 */
const ORDINALS = [
  "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
] as const

export function chapterTitle(index: number): string {
  const word = ORDINALS[index] ?? String(index + 1)
  return `Chapter ${word}`
}
