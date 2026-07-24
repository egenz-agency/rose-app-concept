"use client"
import { getSupabaseClient } from "@/lib/supabase/client"

// Public VAPID key — safe to ship to the browser. The matching private key lives
// only in Supabase (app_config table) and is read by the send-miss-you edge fn.
export const VAPID_PUBLIC_KEY =
  "BMvOo4EMe26MZMfZXrZaZTgXSeoo4tkg4_1R0GnX78ID3UOHFDLAIhV-dE_NqiMzBsVJxBtJ3kyqKj0-em4BXLc"

const NAME_KEY = "missYou.name"

// Web Push subscriptions need the VAPID key as a Uint8Array, not base64url.
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

export function getMyName(): string | null {
  if (typeof window === "undefined") return null
  return window.localStorage.getItem(NAME_KEY)
}

export function setMyName(name: string) {
  if (typeof window !== "undefined") window.localStorage.setItem(NAME_KEY, name.trim())
}

export function permissionState(): NotificationPermission | "unsupported" {
  if (!isPushSupported()) return "unsupported"
  return Notification.permission
}

// True once this device has a name, granted permission, and a live subscription.
export function isEnabled(): boolean {
  return isPushSupported() && permissionState() === "granted" && !!getMyName()
}

// Ask permission, subscribe, and persist the subscription against this person.
// Returns "granted" on success, or a reason it couldn't be enabled.
export async function enableMissYou(
  name: string
): Promise<"granted" | "denied" | "unsupported" | "error"> {
  if (!isPushSupported()) return "unsupported"
  const trimmed = name.trim()
  if (!trimmed) return "error"

  const permission = await Notification.requestPermission()
  if (permission !== "granted") return permission === "denied" ? "denied" : "error"

  try {
    const reg = await navigator.serviceWorker.ready
    let sub = await reg.pushManager.getSubscription()
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      })
    }
    const json = sub.toJSON()
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return "error"

    setMyName(trimmed)
    const supabase = getSupabaseClient()
    await supabase.from("push_subscriptions").upsert(
      {
        person: trimmed,
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
        user_agent: navigator.userAgent,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "endpoint" }
    )
    return "granted"
  } catch {
    return "error"
  }
}

// Send a "miss you" ping to the OTHER person. `count` batches rapid taps so the
// recipient gets one "×N" notification instead of many.
export async function sendMissYou(count: number): Promise<boolean> {
  const fromName = getMyName()
  if (!fromName) return false
  try {
    const supabase = getSupabaseClient()
    const { error } = await supabase.functions.invoke("send-miss-you", {
      body: { fromName, count },
    })
    return !error
  } catch {
    return false
  }
}
