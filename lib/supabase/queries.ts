import { getSupabaseClient } from "./client"
import { differenceInDays, isToday, parseISO } from "date-fns"
import type { RoseState } from "@/types/scene"

const ROSE_ID = "00000000-0000-0000-0000-000000000001"

// ── Fairytale journey ────────────────────────────────────────────
// One chapter of a 50-part story unlocks every MILESTONE_INTERVAL visits
// (≈ every 5 days). Chapter N is keyed to daily_messages.day_number = N*5.
export const MILESTONE_INTERVAL = 5
export const TOTAL_CHAPTERS     = 50
export const JOURNEY_DAYS       = MILESTONE_INTERVAL * TOTAL_CHAPTERS // 250

export interface MilestoneInfo {
  chapter: number        // 0 before the first milestone, up to TOTAL_CHAPTERS
  milestoneDay: number   // the day_number key for the current chapter (chapter*5)
  phrase: string | null  // the unlocked chapter phrase
  label: string | null   // the chapter's author label, e.g. "Chapter VII"
  isNewMilestone: boolean // a fresh chapter just unlocked on this visit
  totalVisits: number
}

export function chapterForVisits(totalVisits: number): number {
  return Math.max(0, Math.min(TOTAL_CHAPTERS, Math.floor(totalVisits / MILESTONE_INTERVAL)))
}

export async function fetchMilestonePhrase(
  milestoneDay: number
): Promise<{ message: string; author: string | null } | null> {
  if (milestoneDay <= 0) return null
  try {
    const sb = getSupabaseClient()
    const { data } = await sb
      .from("daily_messages")
      .select("message, author")
      .eq("day_number", milestoneDay)
      .single()
    if (!data) return null
    return { message: data.message as string, author: (data.author as string) ?? null }
  } catch {
    return null
  }
}

async function buildMilestoneInfo(totalVisits: number, justUnlocked: boolean): Promise<MilestoneInfo> {
  const chapter = chapterForVisits(totalVisits)
  const milestoneDay = chapter * MILESTONE_INTERVAL
  const phrase = await fetchMilestonePhrase(milestoneDay)
  return {
    chapter,
    milestoneDay,
    phrase: phrase?.message ?? null,
    label: phrase?.author ?? null,
    isNewMilestone: justUnlocked,
    totalVisits,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToRoseState(data: any): RoseState {
  return {
    petalsRemaining: data.petals_remaining,
    revivalsRemaining: data.revivals_remaining,
    lastVisited: data.last_visited,
    streakDays: data.streak_days,
    totalVisits: data.total_visits,
    isDead: data.is_dead,
    isFinalDeath: data.is_final_death,
    gardenStage: data.garden_stage as RoseState["gardenStage"],
  }
}

// ── Scheduled custom messages (managed from /rosesecret) ─────────
export interface ScheduledMessage {
  id: string
  message: string
  author: string | null
  scheduled_for: string | null   // ISO date, or null = "next visit"
  shown: boolean
  shown_at: string | null
  created_at: string
}

export async function fetchScheduledMessages(): Promise<ScheduledMessage[]> {
  try {
    const sb = getSupabaseClient()
    const { data } = await sb
      .from("scheduled_messages")
      .select("*")
      .order("shown", { ascending: true })
      .order("scheduled_for", { ascending: true, nullsFirst: true })
      .order("created_at", { ascending: true })
    return (data ?? []) as ScheduledMessage[]
  } catch {
    return []
  }
}

export async function createScheduledMessage(input: {
  message: string
  author?: string
  scheduled_for?: string | null
}): Promise<ScheduledMessage | null> {
  const sb = getSupabaseClient()
  const { data, error } = await sb
    .from("scheduled_messages")
    .insert({
      message: input.message,
      author: input.author?.trim() || "Your love",
      scheduled_for: input.scheduled_for || null,
    })
    .select()
    .single()
  if (error) throw error
  return (data ?? null) as ScheduledMessage | null
}

export async function deleteScheduledMessage(id: string): Promise<void> {
  const sb = getSupabaseClient()
  const { error } = await sb.from("scheduled_messages").delete().eq("id", id)
  if (error) throw error
}

// Pick the next due custom message (and mark it shown). Returns null if none.
async function consumeDueScheduledMessage(today: Date): Promise<{ message: string; author: string | null } | null> {
  try {
    const sb = getSupabaseClient()
    const todayStr = today.toISOString().slice(0, 10)
    const { data } = await sb
      .from("scheduled_messages")
      .select("*")
      .eq("shown", false)
      .order("scheduled_for", { ascending: true, nullsFirst: true })
      .order("created_at", { ascending: true })
    const list = (data ?? []) as ScheduledMessage[]
    // Due = no date (next-visit queue) OR a date that has arrived
    const due = list.find((m) => !m.scheduled_for || m.scheduled_for <= todayStr)
    if (!due) return null
    await sb
      .from("scheduled_messages")
      .update({ shown: true, shown_at: new Date().toISOString() })
      .eq("id", due.id)
    return { message: due.message, author: due.author }
  } catch {
    return null
  }
}

export async function fetchRoseState(): Promise<RoseState | null> {
  const sb = getSupabaseClient()
  const { data } = await sb.from("rose_state").select("*").eq("id", ROSE_ID).single()
  if (!data) return null
  return rowToRoseState(data)
}

export async function recordVisit(): Promise<{
  rose: RoseState
  message: string
  isFirstToday: boolean
  milestone: MilestoneInfo
}> {
  const sb = getSupabaseClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: current } = await sb.from("rose_state").select("*").eq("id", ROSE_ID).single() as { data: any }
  if (!current) throw new Error("Rose state not found")

  const now = new Date()
  const lastVisit = current.last_visited ? parseISO(current.last_visited) : null
  const isFirstToday = !lastVisit || !isToday(lastVisit)

  if (!isFirstToday) {
    // Already visited today — just return current state + message
    const message = await getRandomMessage()
    const milestone = await buildMilestoneInfo(current.total_visits, false)
    return {
      rose: {
        petalsRemaining: current.petals_remaining,
        revivalsRemaining: current.revivals_remaining,
        lastVisited: current.last_visited,
        streakDays: current.streak_days,
        totalVisits: current.total_visits,
        isDead: current.is_dead,
        isFinalDeath: current.is_final_death,
        gardenStage: current.garden_stage as RoseState["gardenStage"],
      },
      message,
      isFirstToday: false,
      milestone,
    }
  }

  // Calculate missed days (petals to drop)
  const daysMissed = lastVisit ? Math.max(0, differenceInDays(now, lastVisit) - 1) : 0
  const petalsToDrop = Math.min(daysMissed, current.petals_remaining)
  const newPetals = Math.max(0, current.petals_remaining - petalsToDrop)
  const newStreak = lastVisit && differenceInDays(now, lastVisit) === 1 ? current.streak_days + 1 : 1
  const isDead = newPetals === 0
  const isFinalDeath = isDead && current.revivals_remaining === 0

  // Garden stage progression
  const newTotalVisits = current.total_visits + 1
  let gardenStage = current.garden_stage
  if (newTotalVisits >= 365) gardenStage = 4
  else if (newTotalVisits >= 180) gardenStage = 3
  else if (newTotalVisits >= 90) gardenStage = 2
  else if (newTotalVisits >= 30) gardenStage = 1

  await sb.from("rose_state").update({
    petals_remaining: newPetals,
    last_visited: now.toISOString(),
    streak_days: newStreak,
    total_visits: newTotalVisits,
    is_dead: isDead,
    is_final_death: isFinalDeath,
    garden_stage: gardenStage,
  }).eq("id", ROSE_ID)

  // Check and unlock letters
  await checkLetterUnlocks(newTotalVisits)

  // A custom message the owner scheduled takes priority over the random note.
  const scheduled = await consumeDueScheduledMessage(now)
  const message = scheduled?.message ?? (await getRandomMessage())

  // Did this visit cross a new chapter milestone?
  const prevChapter = chapterForVisits(current.total_visits)
  const newChapter  = chapterForVisits(newTotalVisits)
  const milestone   = await buildMilestoneInfo(newTotalVisits, newChapter > prevChapter)

  await sb.from("visit_log").insert({
    visited_at: now.toISOString(),
    petals_at_visit: newPetals,
    message_shown: message,
  })

  return {
    rose: {
      petalsRemaining: newPetals,
      revivalsRemaining: current.revivals_remaining,
      lastVisited: now.toISOString(),
      streakDays: newStreak,
      totalVisits: newTotalVisits,
      isDead: isDead,
      isFinalDeath: isFinalDeath,
      gardenStage: gardenStage as RoseState["gardenStage"],
    },
    message,
    isFirstToday: true,
    milestone,
  }
}

export async function reviveRose(): Promise<RoseState> {
  const sb = getSupabaseClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: current } = await sb.from("rose_state").select("*").eq("id", ROSE_ID).single() as { data: any }
  if (!current) throw new Error("Rose state not found")
  if (current.revivals_remaining === 0) throw new Error("No revivals remaining")

  const newRevivals = current.revivals_remaining - 1
  const isFinalDeath = newRevivals === 0 && current.is_dead

  await sb.from("rose_state").update({
    petals_remaining: 40,
    revivals_remaining: newRevivals,
    is_dead: false,
    is_final_death: isFinalDeath,
  }).eq("id", ROSE_ID)

  return rowToRoseState({
    petals_remaining: 40,
    revivals_remaining: newRevivals,
    last_visited: current.last_visited,
    streak_days: current.streak_days,
    total_visits: current.total_visits,
    is_dead: false,
    is_final_death: false,
    garden_stage: current.garden_stage,
  })
}

async function getRandomMessage(): Promise<string> {
  const sb = getSupabaseClient()
  const { data } = await sb.from("daily_messages").select("message").is("day_number", null)
  if (!data || data.length === 0) return "You are loved."
  return data[Math.floor(Math.random() * data.length)].message
}

async function checkLetterUnlocks(totalVisits: number) {
  const sb = getSupabaseClient()
  const thresholds = [7, 30, 100, 365]
  for (const days of thresholds) {
    if (totalVisits >= days) {
      await sb.from("letters")
        .update({ unlocked: true, unlocked_at: new Date().toISOString() })
        .eq("unlock_days", days)
        .eq("unlocked", false)
    }
  }
}

export type StarRow = {
  id: string; title: string; date: string; memory: string; photos: string[];
  position_x: number; position_y: number; position_z: number; created_at: string;
}

export async function fetchMemoryStars(): Promise<StarRow[]> {
  // Always merge localStorage stars so the app works without Supabase
  const { localStars_getAll } = await import("./localStars")
  const local = localStars_getAll()

  try {
    const sb = getSupabaseClient()
    const { data, error } = await sb
      .from("memory_stars").select("*").order("created_at", { ascending: true })
    if (error || !data) return local
    // Merge: remote first, then local-only entries
    const remoteIds = new Set((data as StarRow[]).map((s) => s.id))
    const localOnly = local.filter((s) => !remoteIds.has(s.id))
    return [...(data as StarRow[]), ...localOnly]
  } catch {
    return local
  }
}

export async function createMemoryStar(star: {
  title: string
  date: string
  memory: string
  photos: string[]
  position: [number, number, number]
}): Promise<StarRow> {
  const payload = {
    title: star.title,
    date: star.date,
    memory: star.memory,
    photos: star.photos,
    position_x: star.position[0],
    position_y: star.position[1],
    position_z: star.position[2],
  }

  try {
    const sb = getSupabaseClient()
    const { data, error } = await sb
      .from("memory_stars").insert(payload).select().single()
    if (!error && data) return data as StarRow
  } catch {
    // Supabase unavailable — fall through to localStorage
  }

  // localStorage fallback: always works offline / with placeholder credentials
  const { localStars_create } = await import("./localStars")
  return localStars_create(payload)
}

export async function fetchLetters(): Promise<{
  id: string; title: string; content: string; unlock_days: number;
  unlocked: boolean; unlocked_at: string | null; created_at: string;
}[]> {
  const sb = getSupabaseClient()
  const { data } = await sb.from("letters").select("*").order("unlock_days", { ascending: true })
  return (data ?? []) as never
}

export async function fetchGalleryPhotos() {
  const sb = getSupabaseClient()
  const { data } = await sb.from("gallery_photos").select("*").order("created_at", { ascending: false })
  return data ?? []
}
