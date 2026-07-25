"use client"
import {
  getMissYouConfigAction,
  registerMissYouDeviceAction,
  sendMissYouAction,
} from "@/app/r/[slug]/actions"

// Client half of the gift-scoped "I miss you" feature.
//
// Everything security-relevant happens on the server: the slug is resolved to a
// tenant through the secret access-token cookie, and a ping is only delivered to
// the other role inside that same gift. The browser only ever holds its own
// subscription plus which side of the gift this device belongs to.

export type GiftRole = "giver" | "recipient"

// Which side of the gift this device is, remembered per gift slug.
const roleKey = (slug: string) => `missYou.role.${slug}`

// Web Push needs the VAPID key as a Uint8Array, not base64url.
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/")
  const raw = atob(b64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  )
}

export function getMyRole(slug: string): GiftRole | null {
  if (typeof window === "undefined") return null
  const v = window.localStorage.getItem(roleKey(slug))
  return v === "giver" || v === "recipient" ? v : null
}

function setMyRole(slug: string, role: GiftRole) {
  if (typeof window !== "undefined") window.localStorage.setItem(roleKey(slug), role)
}

export function permissionState(): NotificationPermission | "unsupported" {
  if (!isPushSupported()) return "unsupported"
  return Notification.permission
}

// Enabled once this device has picked a side, granted permission, and registered.
export function isEnabled(slug: string): boolean {
  return isPushSupported() && permissionState() === "granted" && !!getMyRole(slug)
}

// Both names, so the enable step can ask "which of you is this?".
export async function fetchNames(
  slug: string
): Promise<{ giverName: string; recipientName: string; configured: boolean }> {
  try {
    const cfg = await getMissYouConfigAction(slug)
    return {
      giverName: cfg.giverName,
      recipientName: cfg.recipientName,
      configured: !!cfg.publicKey,
    }
  } catch {
    return { giverName: "Your love", recipientName: "Your love", configured: false }
  }
}

export type EnableResult = "granted" | "denied" | "unsupported" | "unconfigured" | "error"

// Ask permission, subscribe, and register this device against one side of the gift.
export async function enableMissYou(slug: string, role: GiftRole): Promise<EnableResult> {
  if (!isPushSupported()) return "unsupported"

  let publicKey: string | null = null
  try {
    publicKey = (await getMissYouConfigAction(slug)).publicKey
  } catch {
    return "error"
  }
  if (!publicKey) return "unconfigured"

  const permission = await Notification.requestPermission()
  if (permission !== "granted") return permission === "denied" ? "denied" : "error"

  try {
    const reg = await navigator.serviceWorker.ready
    let sub = await reg.pushManager.getSubscription()
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      })
    }
    const json = sub.toJSON()
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return "error"

    await registerMissYouDeviceAction(slug, role, {
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    })
    setMyRole(slug, role)
    return "granted"
  } catch {
    return "error"
  }
}

export type SendOutcome = "sent" | "no-partner-device" | "error"

// Send a ping to the other person in this gift. `count` batches rapid taps.
export async function sendMissYou(slug: string, count: number): Promise<SendOutcome> {
  const role = getMyRole(slug)
  if (!role) return "error"
  try {
    const res = await sendMissYouAction(slug, role, count)
    if (res.ok) return "sent"
    return res.reason === "no-partner-device" ? "no-partner-device" : "error"
  } catch {
    return "error"
  }
}
