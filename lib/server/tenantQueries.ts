import "server-only"
import { differenceInDays, isToday, parseISO } from "date-fns"
import { getAdminClient } from "@/lib/supabase/admin"
import type { RoseState } from "@/types/scene"
import type { Moment, ScheduledMessage, StarRow, MilestoneInfo } from "@/lib/supabase/queries"

// ────────────────────────────────────────────────────────────────────────────
// Server-side, TENANT-SCOPED data layer for the multi-tenant `rose-saas` project.
// Every function takes a `tenantId` and filters by it — one couple can never read
// or write another couple's rows. Runs only on the server (service role); the
// browser reaches these through the server actions in app/r/[slug]/actions.ts.
// ────────────────────────────────────────────────────────────────────────────

// Mirror of the journey constants in lib/supabase/queries.ts (kept tiny + local
// so this server module doesn't pull in the browser client).
export const MILESTONE_INTERVAL = 5
export const TOTAL_CHAPTERS = 50

export function chapterForVisits(totalVisits: number): number {
  return Math.max(0, Math.min(TOTAL_CHAPTERS, Math.floor(totalVisits / MILESTONE_INTERVAL)))
}

// Local-calendar date string (YYYY-MM-DD) — matches date-fns isToday semantics.
function localDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
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

// ── Tenant resolution ────────────────────────────────────────────────────────
export interface TenantRecord {
  id: string
  slug: string
  status: string
  recipient_name: string | null
  giver_name: string | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  customization: Record<string, any>
}

export async function getTenantBySlug(slug: string): Promise<TenantRecord | null> {
  const sb = getAdminClient()
  const { data } = await sb
    .from("tenants")
    .select("id, slug, status, recipient_name, giver_name, customization")
    .eq("slug", slug)
    .single()
  return (data as TenantRecord) ?? null
}

// ── Milestones (the global 50-chapter story; daily_messages is NOT per-tenant) ─
export async function fetchMilestonePhrase(
  milestoneDay: number
): Promise<{ message: string; author: string | null } | null> {
  if (milestoneDay <= 0) return null
  try {
    const sb = getAdminClient()
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

async function getRandomMessage(): Promise<string> {
  const sb = getAdminClient()
  const { data } = await sb.from("daily_messages").select("message").is("day_number", null)
  if (!data || data.length === 0) return "You are loved."
  return data[Math.floor(Math.random() * data.length)].message
}

// ── Scheduled messages (per tenant) ──────────────────────────────────────────
export async function fetchScheduledMessages(tenantId: string): Promise<ScheduledMessage[]> {
  try {
    const sb = getAdminClient()
    const { data } = await sb
      .from("scheduled_messages")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("shown", { ascending: true })
      .order("scheduled_for", { ascending: true, nullsFirst: true })
      .order("created_at", { ascending: true })
    return (data ?? []) as ScheduledMessage[]
  } catch {
    return []
  }
}

export async function createScheduledMessage(
  tenantId: string,
  input: { message: string; author?: string; scheduled_for?: string | null }
): Promise<ScheduledMessage | null> {
  const sb = getAdminClient()
  const { data, error } = await sb
    .from("scheduled_messages")
    .insert({
      tenant_id: tenantId,
      message: input.message,
      author: input.author?.trim() || "Your love",
      scheduled_for: input.scheduled_for || null,
    })
    .select()
    .single()
  if (error) throw error
  return (data ?? null) as ScheduledMessage | null
}

export async function deleteScheduledMessage(tenantId: string, id: string): Promise<void> {
  const sb = getAdminClient()
  const { error } = await sb
    .from("scheduled_messages")
    .delete()
    .eq("tenant_id", tenantId)
    .eq("id", id)
  if (error) throw error
}

async function getScheduledMessageReveal(
  tenantId: string,
  today: Date
): Promise<{ message: string; author: string | null } | null> {
  try {
    const sb = getAdminClient()
    const todayStr = localDateStr(today)
    const { data } = await sb
      .from("scheduled_messages")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("scheduled_for", { ascending: true, nullsFirst: true })
      .order("created_at", { ascending: true })
    const list = (data ?? []) as ScheduledMessage[]

    let pick = list.find((m) => m.scheduled_for === todayStr)
    if (!pick) pick = list.find((m) => !m.shown && (!m.scheduled_for || m.scheduled_for < todayStr))
    if (!pick) return null

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

// ── Moments (per tenant) ─────────────────────────────────────────────────────
export async function fetchMoments(tenantId: string): Promise<Moment[]> {
  try {
    const sb = getAdminClient()
    const { data } = await sb
      .from("scheduled_moments")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("shown", { ascending: true })
      .order("trigger_visit", { ascending: true, nullsFirst: false })
      .order("trigger_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true })
    return (data ?? []) as Moment[]
  } catch {
    return []
  }
}

export async function createMoment(
  tenantId: string,
  input: {
    title?: string
    message?: string
    photo_url?: string | null
    video_url?: string | null
    trigger_visit?: number | null
    trigger_date?: string | null
    repeat_every?: number | null
  }
): Promise<Moment | null> {
  const sb = getAdminClient()
  const { data, error } = await sb
    .from("scheduled_moments")
    .insert({
      tenant_id: tenantId,
      title: input.title?.trim() || null,
      message: input.message?.trim() || null,
      photo_url: input.photo_url || null,
      video_url: input.video_url || null,
      trigger_visit: input.trigger_visit ?? null,
      trigger_date: input.trigger_date || null,
      repeat_every: input.repeat_every ?? null,
    })
    .select()
    .single()
  if (error) throw error
  return (data ?? null) as Moment | null
}

export async function deleteMoment(tenantId: string, id: string): Promise<void> {
  const sb = getAdminClient()
  const { error } = await sb
    .from("scheduled_moments")
    .delete()
    .eq("tenant_id", tenantId)
    .eq("id", id)
  if (error) throw error
}

async function consumeDueMoment(tenantId: string, totalVisits: number, today: Date): Promise<Moment | null> {
  try {
    const sb = getAdminClient()
    const todayStr = localDateStr(today)
    const { data } = await sb
      .from("scheduled_moments")
      .select("*")
      .eq("tenant_id", tenantId)
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

async function getDueReveal(tenantId: string, totalVisits: number, now: Date): Promise<Moment | null> {
  let moment = await consumeDueMoment(tenantId, totalVisits, now)
  if (!moment) {
    const sm = await getScheduledMessageReveal(tenantId, now)
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

// ── Letters (per tenant) ─────────────────────────────────────────────────────
async function checkLetterUnlocks(tenantId: string, totalVisits: number) {
  const sb = getAdminClient()
  const thresholds = [7, 30, 100, 365]
  for (const days of thresholds) {
    if (totalVisits >= days) {
      await sb
        .from("letters")
        .update({ unlocked: true, unlocked_at: new Date().toISOString() })
        .eq("tenant_id", tenantId)
        .eq("unlock_days", days)
        .eq("unlocked", false)
    }
  }
}

export async function fetchLetters(tenantId: string) {
  const sb = getAdminClient()
  const { data } = await sb
    .from("letters")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("unlock_days", { ascending: true })
  return (data ?? []) as {
    id: string; title: string; content: string; unlock_days: number;
    unlocked: boolean; unlocked_at: string | null; created_at: string;
  }[]
}

export async function fetchGalleryPhotos(tenantId: string) {
  const sb = getAdminClient()
  const { data } = await sb
    .from("gallery_photos")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
  return data ?? []
}

// ── Memory stars (per tenant; no localStorage fallback on the server) ─────────
export async function fetchMemoryStars(tenantId: string): Promise<StarRow[]> {
  const sb = getAdminClient()
  const { data } = await sb
    .from("memory_stars")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: true })
  return (data ?? []) as StarRow[]
}

export async function createMemoryStar(
  tenantId: string,
  star: { title: string; date: string; memory: string; photos: string[]; position: [number, number, number] }
): Promise<StarRow> {
  const sb = getAdminClient()
  const { data, error } = await sb
    .from("memory_stars")
    .insert({
      tenant_id: tenantId,
      title: star.title,
      date: star.date,
      memory: star.memory,
      photos: star.photos,
      position_x: star.position[0],
      position_y: star.position[1],
      position_z: star.position[2],
    })
    .select()
    .single()
  if (error) throw error
  return data as StarRow
}

// ── Rose state + visit ───────────────────────────────────────────────────────
export async function fetchRoseState(tenantId: string): Promise<RoseState | null> {
  const sb = getAdminClient()
  const { data } = await sb.from("rose_state").select("*").eq("tenant_id", tenantId).single()
  if (!data) return null
  return rowToRoseState(data)
}

export async function recordVisit(tenantId: string): Promise<{
  rose: RoseState
  message: string
  isFirstToday: boolean
  milestone: MilestoneInfo
  moment: Moment | null
}> {
  const sb = getAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: current } = await sb.from("rose_state").select("*").eq("tenant_id", tenantId).single() as { data: any }
  if (!current) throw new Error("Rose state not found")

  const now = new Date()
  const lastVisit = current.last_visited ? parseISO(current.last_visited) : null
  const isFirstToday = !lastVisit || !isToday(lastVisit)

  if (!isFirstToday) {
    const message = await getRandomMessage()
    const milestone = await buildMilestoneInfo(current.total_visits, false)
    const moment = await getDueReveal(tenantId, current.total_visits, now)
    return {
      rose: rowToRoseState(current),
      message,
      isFirstToday: false,
      milestone,
      moment,
    }
  }

  const daysMissed = lastVisit ? Math.max(0, differenceInDays(now, lastVisit) - 1) : 0
  const petalsToDrop = Math.min(daysMissed, current.petals_remaining)
  const newPetals = Math.max(0, current.petals_remaining - petalsToDrop)
  const newStreak = lastVisit && differenceInDays(now, lastVisit) === 1 ? current.streak_days + 1 : 1
  const isDead = newPetals === 0
  const isFinalDeath = isDead && current.revivals_remaining === 0

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
    updated_at: now.toISOString(),
  }).eq("tenant_id", tenantId)

  await checkLetterUnlocks(tenantId, newTotalVisits)

  const message = await getRandomMessage()

  const prevChapter = chapterForVisits(current.total_visits)
  const newChapter = chapterForVisits(newTotalVisits)
  const milestone = await buildMilestoneInfo(newTotalVisits, newChapter > prevChapter)

  const moment = await getDueReveal(tenantId, newTotalVisits, now)

  await sb.from("visit_log").insert({
    tenant_id: tenantId,
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
      isDead,
      isFinalDeath,
      gardenStage: gardenStage as RoseState["gardenStage"],
    },
    message,
    isFirstToday: true,
    milestone,
    moment,
  }
}

export async function reviveRose(tenantId: string): Promise<RoseState> {
  const sb = getAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: current } = await sb.from("rose_state").select("*").eq("tenant_id", tenantId).single() as { data: any }
  if (!current) throw new Error("Rose state not found")
  if (current.revivals_remaining === 0) throw new Error("No revivals remaining")

  const newRevivals = current.revivals_remaining - 1

  await sb.from("rose_state").update({
    petals_remaining: 40,
    revivals_remaining: newRevivals,
    is_dead: false,
    is_final_death: false,
    updated_at: new Date().toISOString(),
  }).eq("tenant_id", tenantId)

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
