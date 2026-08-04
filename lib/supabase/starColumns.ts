// The memory_stars row shape, shared by the browser data layer and the
// server-side tenant data layer.
//
// Deliberately dependency-free: lib/server/tenantQueries.ts is a `server-only`
// module and must never pull the browser Supabase client into its bundle, so
// these helpers live apart from lib/supabase/queries.ts.

export type StarRow = {
  id: string; title: string; date: string; memory: string; photos: string[];
  position_x: number; position_y: number; position_z: number; created_at: string;
  // ── Memory Constellation capsule fields ──
  // Optional because they only exist once migration 006 (008 on rose-saas) has
  // been applied, and because rows written before constellations existed simply
  // don't have them.
  constellation_index?: number | null
  slot_index?: number | null
  video_url?: string | null
  voice_url?: string | null
  song_url?: string | null
  location?: string | null
  quote?: string | null
  is_favorite?: boolean | null
  is_anniversary?: boolean | null
}

/**
 * Everything one memory capsule can hold. The first five fields are the original
 * memory-star shape; the rest arrived with the Memory Constellation and are all
 * optional, so a capsule can be as small as a title and a sentence.
 */
export interface MemoryCapsuleInput {
  title: string
  date: string
  memory: string
  photos: string[]
  position: [number, number, number]
  constellationIndex?: number
  slotIndex?: number | null
  videoUrl?: string | null
  voiceUrl?: string | null
  songUrl?: string | null
  location?: string | null
  quote?: string | null
  isFavorite?: boolean
  isAnniversary?: boolean
}

/** The base columns every deployment has, migration applied or not. */
export function baseStarColumns(star: MemoryCapsuleInput) {
  return {
    title: star.title,
    date: star.date,
    memory: star.memory,
    photos: star.photos,
    position_x: star.position[0],
    position_y: star.position[1],
    position_z: star.position[2],
  }
}

/** The columns added by the constellation migration. Split out so a write can retry without them. */
export function capsuleStarColumns(star: MemoryCapsuleInput) {
  return {
    constellation_index: star.constellationIndex ?? 0,
    slot_index: star.slotIndex ?? null,
    video_url: star.videoUrl ?? null,
    voice_url: star.voiceUrl ?? null,
    song_url: star.songUrl ?? null,
    location: star.location ?? null,
    quote: star.quote ?? null,
    is_favorite: star.isFavorite ?? false,
    is_anniversary: star.isAnniversary ?? false,
  }
}

/**
 * True when a write failed only because the capsule columns aren't there yet —
 * i.e. the constellation migration hasn't been run on this database. Anything
 * else is a real error and must not be swallowed.
 */
export function isMissingColumnError(error: unknown): boolean {
  const e = error as { code?: string; message?: string } | null
  if (!e) return false
  // PGRST204: PostgREST can't find the column in its schema cache.
  // 42703: Postgres "undefined column".
  return e.code === "PGRST204" || e.code === "42703"
}

/** Does this row already hold something worth reading? */
export function isFilled(star: Pick<StarRow, "title" | "memory">): boolean {
  return Boolean(star.title?.trim() || star.memory?.trim())
}
