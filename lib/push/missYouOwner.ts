"use client"
import {
  getOwnerMissYouConfigAction,
  registerOwnerDeviceAction,
  sendOwnerMissYouAction,
} from "@/app/dashboard/actions"
import {
  isPushSupported,
  permissionState,
  subscribeThisDevice,
  type EnableResult,
  type SendOutcome,
} from "./pushCore"

// The GIVER half of "I miss you" — his own authenticated dashboard.
//
// Identity comes from his session, so there is no role to pick and no gift slug
// to pass: the server resolves his tenant through his RLS-scoped session, marks
// the device as that gift's `giver`, and pings only the recipient's devices.

const ENABLED_KEY = "missYou.owner.enabled"

export { isPushSupported, permissionState }
export type { EnableResult, SendOutcome }

export function isEnabled(): boolean {
  if (!isPushSupported() || permissionState() !== "granted") return false
  return typeof window !== "undefined" && window.localStorage.getItem(ENABLED_KEY) === "1"
}

// Who he'd be reaching (the recipient), for the enable copy and status messages.
export async function fetchPartnerName(): Promise<{ partnerName: string; configured: boolean }> {
  try {
    const cfg = await getOwnerMissYouConfigAction()
    return { partnerName: cfg.recipientName, configured: !!cfg.publicKey }
  } catch {
    return { partnerName: "her", configured: false }
  }
}

export async function enableMissYou(): Promise<EnableResult> {
  if (!isPushSupported()) return "unsupported"

  let publicKey: string | null = null
  try {
    publicKey = (await getOwnerMissYouConfigAction()).publicKey
  } catch {
    return "error"
  }
  if (!publicKey) return "unconfigured"

  const sub = await subscribeThisDevice(publicKey)
  if (!sub.ok) return sub.reason

  try {
    await registerOwnerDeviceAction(sub.keys)
    if (typeof window !== "undefined") window.localStorage.setItem(ENABLED_KEY, "1")
    return "granted"
  } catch {
    return "error"
  }
}

export async function sendMissYou(count: number): Promise<SendOutcome> {
  try {
    const res = await sendOwnerMissYouAction(count)
    if (res.ok) return "sent"
    return res.reason === "no-partner-device" ? "no-partner-device" : "error"
  } catch {
    return "error"
  }
}
