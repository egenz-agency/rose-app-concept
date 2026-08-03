"use client"
import { useEffect, useState, useSyncExternalStore } from "react"

// ────────────────────────────────────────────────────────────────────────────
// "Add to home screen" prompt.
//
// Shown only while the app is NOT installed, and disappears the moment it is.
// Three states have to be distinguished, because the platforms differ a lot:
//
//   • Chrome / Edge / Android — fire `beforeinstallprompt`. We capture it and
//     trigger it from our own button, because the browser's own prompt is easy
//     to miss.
//   • iOS Safari — has NO install API at all. The only route is Share → Add to
//     Home Screen, so the button opens short instructions instead. iOS is also
//     where installing matters most: web push only works from an installed PWA.
//   • Already installed — render nothing.
//
// Requires a registered service worker, which is disabled in development (see
// PWARegister). Set NEXT_PUBLIC_ENABLE_SW=true to try this locally.
// ────────────────────────────────────────────────────────────────────────────

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false
  // iOS reports through a non-standard navigator flag rather than display-mode.
  const iosInstalled = (window.navigator as unknown as { standalone?: boolean }).standalone === true
  return window.matchMedia("(display-mode: standalone)").matches || iosInstalled
}

function isIos(): boolean {
  if (typeof window === "undefined") return false
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent)
}

// Installed-state is external browser state, so it's read through
// useSyncExternalStore rather than mirrored into an effect. That keeps it
// correct when the app is installed in another tab or relaunched standalone,
// and avoids a setState-in-effect cascade.
function subscribeInstalled(onChange: () => void): () => void {
  const mq = window.matchMedia("(display-mode: standalone)")
  mq.addEventListener("change", onChange)
  window.addEventListener("appinstalled", onChange)
  return () => {
    mq.removeEventListener("change", onChange)
    window.removeEventListener("appinstalled", onChange)
  }
}

// On the server, claim "installed" so the button never renders during SSR and
// then vanishes on hydration — a flash of a button that shouldn't be there is
// worse than showing it a frame late.
const installedServerSnapshot = () => true
const iosServerSnapshot = () => false
const noopSubscribe = () => () => {}

export function InstallAppButton({
  label = "Install the app",
  hint = "Add it to your home screen so it opens like a real app.",
  compact = false,
  style
}: {
  label?: string
  hint?: string
  /** Drops the explanatory line — for overlaying the 3D scene, where a
   *  paragraph of text would be clutter. */
  compact?: boolean
  style?: React.CSSProperties
}) {
  const installedNow = useSyncExternalStore(subscribeInstalled, isStandalone, installedServerSnapshot)
  const ios = useSyncExternalStore(noopSubscribe, isIos, iosServerSnapshot)

  // Set only when the user accepts our prompt, so the button disappears at once
  // rather than waiting for `appinstalled`, which some browsers delay.
  const [acceptedInstall, setAcceptedInstall] = useState(false)
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null)
  const [showIosHelp, setShowIosHelp] = useState(false)

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      // Suppress the browser's own mini-infobar so ours is the only prompt.
      e.preventDefault()
      setPrompt(e as InstallPromptEvent)
    }
    const onInstalled = () => setPrompt(null)
    window.addEventListener("beforeinstallprompt", onBeforeInstall)
    window.addEventListener("appinstalled", onInstalled)
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall)
      window.removeEventListener("appinstalled", onInstalled)
    }
  }, [])

  if (installedNow || acceptedInstall) return null
  // Nothing to offer: not iOS, and the browser hasn't judged the app installable
  // (missing manifest/SW, or already dismissed). Better silent than a dead button.
  if (!prompt && !ios) return null

  async function install() {
    if (ios) { setShowIosHelp((v) => !v); return }
    if (!prompt) return
    await prompt.prompt()
    const { outcome } = await prompt.userChoice
    // The event is single-use; Chrome re-fires it later if they declined.
    setPrompt(null)
    if (outcome === "accepted") setAcceptedInstall(true)
  }

  return (
    <div style={style}>
      <button
        onClick={install}
        style={compact ? { ...btn, padding: "7px 13px", fontSize: 12.5 } : btn}
      >
        <span aria-hidden style={{ fontSize: 14 }}>⬇</span>
        {label}
      </button>
      {!compact && <p style={hintText}>{hint}</p>}
      {showIosHelp && (
        <p style={{ ...hintText, maxWidth: 260, color: "rgba(232,200,130,0.85)" }}>
          On iPhone: tap <strong>Share</strong> at the bottom of Safari, then{" "}
          <strong>Add to Home Screen</strong>.
        </p>
      )}
    </div>
  )
}

const btn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 8,
  padding: "9px 16px", borderRadius: 999,
  border: "1px solid rgba(232,200,130,0.45)",
  background: "rgba(232,200,130,0.12)",
  color: "#f6eeda", fontSize: 13.5, cursor: "pointer"
  }

const hintText: React.CSSProperties = {
  margin: "8px 0 0", fontSize: 12, lineHeight: 1.5,
  color: "rgba(242,236,224,0.45)" }
