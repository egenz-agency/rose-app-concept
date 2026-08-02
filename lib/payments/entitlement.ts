// The single definition of "is this gift live?" — shared by the recipient-facing
// gates and the owner's dashboard, so they can never drift apart.
//
// Model: a gift is bought once and runs for one year. There is no auto-renewal;
// when the year lapses the gift goes dark until the owner buys another year.
// This file has no server-only imports so the dashboard UI can use it too.

export interface GiftEntitlement {
  status: string
  paid: boolean
  expires_at: string | null
}

export type GiftLifecycle =
  | "draft" // never paid — still being built, share link is dead
  | "live" // paid and inside the year
  | "expired" // the paid year ran out
  | "suspended" // switched off by us

export function giftLifecycle(t: GiftEntitlement, now: Date = new Date()): GiftLifecycle {
  if (t.status === "suspended") return "suspended"
  if (!t.paid || !t.expires_at) return "draft"
  return new Date(t.expires_at) > now ? "live" : "expired"
}

// The one check every gate uses. Anything but a paid, unexpired, unsuspended
// gift is treated as not viewable.
export function isGiftLive(t: GiftEntitlement, now: Date = new Date()): boolean {
  return giftLifecycle(t, now) === "live"
}

export function daysUntilExpiry(expiresAt: string | null, now: Date = new Date()): number | null {
  if (!expiresAt) return null
  const ms = new Date(expiresAt).getTime() - now.getTime()
  return Math.ceil(ms / (1000 * 60 * 60 * 24))
}

// Show the renewal prompt for the last stretch of the year, not all year round.
export const RENEWAL_WINDOW_DAYS = 30

export function shouldPromptRenewal(t: GiftEntitlement, now: Date = new Date()): boolean {
  const phase = giftLifecycle(t, now)
  if (phase === "expired") return true
  if (phase !== "live") return false
  const days = daysUntilExpiry(t.expires_at, now)
  return days !== null && days <= RENEWAL_WINDOW_DAYS
}
