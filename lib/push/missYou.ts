"use client"
import {
  getMissYouConfigAction,
  registerMissYouDeviceAction,
  sendMissYouAction,
} from "@/app/r/[slug]/actions"
import {
  isPushSupported,
  permissionState,
  subscribeThisDevice,
  type EnableResult,
  type SendOutcome,
} from "./pushCore"

// The RECIPIENT half of "I miss you" — the gift page (`/r/[slug]`).
//
// A device here is always the gift's `recipient`; the giver sends from his own
// authenticated dashboard instead. So there's nothing to choose: one tap to
// enable, then taps send. The server resolves the slug through the secret
// access-token cookie and only ever delivers to the giver of THAT gift.

const enabledKey = (slug: string) => `missYou.enabled.${slug}`

export { isPushSupported, permissionState }
export type { EnableResult, SendOutcome }

function markEnabled(slug: string) {
  if (typeof window !== "undefined") window.localStorage.setItem(enabledKey(slug), "1")
}

export function isEnabled(slug: string): boolean {
  if (!isPushSupported() || permissionState() !== "granted") return false
  return typeof window !== "undefined" && window.localStorage.getItem(enabledKey(slug)) === "1"
}

// Who she'd be reaching (the giver), for the enable copy and status messages.
export async function fetchPartnerName(
  slug: string
): Promise<{ partnerName: string; configured: boolean }> {
  try {
    const cfg = await getMissYouConfigAction(slug)
    return { partnerName: cfg.giverName, configured: !!cfg.publicKey }
  } catch {
    return { partnerName: "your love", configured: false }
  }
}

export async function enableMissYou(slug: string): Promise<EnableResult> {
  if (!isPushSupported()) return "unsupported"

  let publicKey: string | null = null
  try {
    publicKey = (await getMissYouConfigAction(slug)).publicKey
  } catch {
    return "error"
  }
  if (!publicKey) return "unconfigured"

  const sub = await subscribeThisDevice(publicKey)
  if (!sub.ok) return sub.reason

  try {
    await registerMissYouDeviceAction(slug, "recipient", sub.keys)
    markEnabled(slug)
    return "granted"
  } catch {
    return "error"
  }
}

// Send a ping to the giver of this gift. `count` batches rapid taps.
export async function sendMissYou(slug: string, count: number): Promise<SendOutcome> {
  try {
    const res = await sendMissYouAction(slug, "recipient", count)
    if (res.ok) return "sent"
    return res.reason === "no-partner-device" ? "no-partner-device" : "error"
  } catch {
    return "error"
  }
}
