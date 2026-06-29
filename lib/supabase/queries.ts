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

// Local-calendar date string (YYYY-MM-DD). Uses local time to match date-fns
// `isToday` (which the visit/petal logic relies on) and the date the owner
// picked in the admin panel's date input — so "today" means the same thing
// everywhere, even late at night when UTC has already rolled to the next day.
function localDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

// Find the scheduled message to reveal on this press-and-hold. Returns null if none.
//
// Two cases, in priority order:
//   1. A message dated for TODAY → always returned, every time she holds today,
//      so she can re-watch the same message. It's marked "delivered" on the
//      first reveal (for the admin panel) but keeps re-showing all day because
//      we match it by date, not by the shown flag.
//   2. An UNDELIVERED message that's overdue (past date) or queued for "next
//      visit" (no date) → shown once, then marked delivered.
async function getScheduledMessageReveal(today: Date): Promise<{ message: string; author: string | null } | null> {
  try {
    const sb = getSupabaseClient()
    const todayStr = localDateStr(today)
    const { data } = await sb
      .from("scheduled_messages")
      .select("*")
      .order("scheduled_for", { ascending: true, nullsFirst: true })
      .order("created_at", { ascending: true })
    const list = (data ?? []) as ScheduledMessage[]

    // 1. Dated exactly for today → re-showable all day
    let pick = list.find((m) => m.scheduled_for === todayStr)
    // 2. Otherwise an undelivered overdue / next-visit message
    if (!pick) pick = list.find((m) => !m.shown && (!m.scheduled_for || m.scheduled_for < todayStr))
    if (!pick) return null

    // Mark delivered on first reveal (today's keeps re-showing regardless)
    if (!pick.shown) {
      await sb
        .from("scheduled_messages")
        .update({ shown: true, shown_at: new Date().toISOString() })
        .eq("id", pick.id)
    }
    return { message: pick.message, author: pick.author }
  } catch {
    return null
  }
}

// Resolve whatever scheduled content should reveal on this hold: a due moment
// (photo / clip / message) wins; otherwise a scheduled message becomes a
// message-only moment so it still shows. Runs on every press-and-hold — not
// just the first visit of the day — so a message can re-appear when she holds
// the rose again later the same day.
async function getDueReveal(totalVisits: number, now: Date): Promise<Moment | null> {
  let moment = await consumeDueMoment(totalVisits, now)
  if (!moment) {
    const sm = await getScheduledMessageReveal(now)
    if (sm) {
      moment = {
        id: `msg-${Date.now()}`, title: sm.author, message: sm.message,
        photo_url: null, video_url: null, trigger_visit: null, trigger_date: null,
        repeat_every: null, shown: true, shown_at: null, created_at: new Date().toISOString(),
      }
    }
  }
  return moment
}

// ── Moments: scheduled photo / clip / message (managed from /rosesecret) ──
export interface Moment {
  id: string
  title: string | null
  message: string | null
  photo_url: string | null
  video_url: string | null
  trigger_visit: number | null   // show on/after this visit number
  trigger_date: string | null    // OR show on/after this date (ISO)
  repeat_every: number | null    // OR recur every N visits (e.g. 3 = every 3rd visit)
  shown: boolean
  shown_at: string | null
  created_at: string
}

export async function fetchMoments(): Promise<Moment[]> {
  try {
    const sb = getSupabaseClient()
    const { data } = await sb
      .from("scheduled_moments")
      .select("*")
      .order("shown", { ascending: true })
      .order("trigger_visit", { ascending: true, nullsFirst: false })
      .order("trigger_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true })
    return (data ?? []) as Moment[]
  } catch {
    return []
  }
}

export async function createMoment(input: {
  title?: string
  message?: string
  photo_url?: string | null
  video_url?: string | null
  trigger_visit?: number | null
  trigger_date?: string | null
  repeat_every?: number | null
}): Promise<Moment | null> {
  const sb = getSupabaseClient()
  const { data, error } = await sb
    .from("scheduled_moments")
    .insert({
      title:         input.title?.trim() || null,
      message:       input.message?.trim() || null,
      photo_url:     input.photo_url || null,
      video_url:     input.video_url || null,
      trigger_visit: input.trigger_visit ?? null,
      trigger_date:  input.trigger_date || null,
      repeat_every:  input.repeat_every ?? null,
    })
    .select()
    .single()
  if (error) throw error
  return (data ?? null) as Moment | null
}

export async function deleteMoment(id: string): Promise<void> {
  const sb = getSupabaseClient()
  const { error } = await sb.from("scheduled_moments").delete().eq("id", id)
  if (error) throw error
}

// Upload a photo/clip to the public 'moments' storage bucket; return its URL.
export async function uploadMomentFile(file: File): Promise<string> {
  const sb = getSupabaseClient()
  const ext  = file.name.split(".").pop() || "bin"
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error } = await sb.storage.from("moments").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  })
  if (error) throw error
  const { data } = sb.storage.from("moments").getPublicUrl(path)
  return data.publicUrl
}

// Pick the next due moment for this visit. One-time moments are marked shown;
// recurring ones (repeat_every) fire again every N visits and are NOT marked.
async function consumeDueMoment(totalVisits: number, today: Date): Promise<Moment | null> {
  try {
    const sb = getSupabaseClient()
    const todayStr = localDateStr(today)
    const { data } = await sb
      .from("scheduled_moments")
      .select("*")
      .eq("shown", false)
      .order("trigger_visit", { ascending: true, nullsFirst: false })
      .order("trigger_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true })
    const list = (data ?? []) as Moment[]
    const due = list.find((m) => {
      if (m.repeat_every && m.repeat_every > 0) return totalVisits > 0 && totalVisits % m.repeat_every === 0
      if (m.trigger_visit != null) return totalVisits >= m.trigger_visit
      if (m.trigger_date != null) return m.trigger_date <= todayStr
      return false
    })
    if (!due) return null
    // Recurring moments keep firing — leave them unshown. One-time ones are spent.
    if (!due.repeat_every) {
      await sb
        .from("scheduled_moments")
        .update({ shown: true, shown_at: new Date().toISOString() })
        .eq("id", due.id)
    }
    return due
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
  moment: Moment | null
}> {
  const sb = getSupabaseClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: current } = await sb.from("rose_state").select("*").eq("id", ROSE_ID).single() as { data: any }
  if (!current) throw new Error("Rose state not found")

  const now = new Date()
  const lastVisit = current.last_visited ? parseISO(current.last_visited) : null
  const isFirstToday = !lastVisit || !isToday(lastVisit)

  if (!isFirstToday) {
    // Already visited today — tending again doesn't drop petals or advance the
    // chapter, but she can still re-watch today's scheduled message / moment.
    const message = await getRandomMessage()
    const milestone = await buildMilestoneInfo(current.total_visits, false)
    const moment = await getDueReveal(current.total_visits, now)
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
      moment,
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

  const message = await getRandomMessage()

  // Did this visit cross a new chapter milestone?
  const prevChapter = chapterForVisits(current.total_visits)
  const newChapter  = chapterForVisits(newTotalVisits)
  const milestone   = await buildMilestoneInfo(newTotalVisits, newChapter > prevChapter)

  // Scheduled content surfaces as a prominent "moment" reveal.
  const moment = await getDueReveal(newTotalVisits, now)

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
    moment,
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
