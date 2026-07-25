"use client"

// Shared browser-side plumbing for the "I miss you" push feature. Used by both
// sides: the recipient on her gift page, and the giver on his dashboard.

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  )
}

export function permissionState(): NotificationPermission | "unsupported" {
  if (!isPushSupported()) return "unsupported"
  return Notification.permission
}

// Web Push needs the VAPID key as a Uint8Array, not base64url.
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/")
  const raw = atob(b64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

export interface SubscriptionKeys {
  endpoint: string
  p256dh: string
  auth: string
}

// Ask permission (if needed) and return this device's push subscription keys.
// Throws nothing — returns a discriminated result the caller can map to UI copy.
export type SubscribeResult =
  | { ok: true; keys: SubscriptionKeys }
  | { ok: false; reason: "denied" | "unsupported" | "error" }

export async function subscribeThisDevice(publicKey: string): Promise<SubscribeResult> {
  if (!isPushSupported()) return { ok: false, reason: "unsupported" }

  const permission = await Notification.requestPermission()
  if (permission !== "granted") {
    return { ok: false, reason: permission === "denied" ? "denied" : "error" }
  }

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
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
      return { ok: false, reason: "error" }
    }
    return {
      ok: true,
      keys: { endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth },
    }
  } catch {
    return { ok: false, reason: "error" }
  }
}

export type EnableResult = "granted" | "denied" | "unsupported" | "unconfigured" | "error"
export type SendOutcome = "sent" | "no-partner-device" | "error"
