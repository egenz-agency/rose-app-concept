"use client"
import { useEffect } from "react"

// Registers the service worker so the app is installable as a PWA
// (Add to Home Screen) and works offline for visited content.
//
// NOT in development: the SW caches Next's dev chunks, which change on every
// edit, so a stale chunk gets served, the app fails to boot, and the page ends
// up in a reload loop. Set NEXT_PUBLIC_ENABLE_SW=true to test PWA install or
// push notifications locally.
const ENABLED =
  process.env.NODE_ENV === "production" || process.env.NEXT_PUBLIC_ENABLE_SW === "true"

export function PWARegister() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return

    if (!ENABLED) {
      // Tear down anything a previous run left installed — a registered SW
      // outlives the code change that stopped registering it, so without this
      // the loop would persist in browsers that already have one.
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => regs.forEach((r) => r.unregister()))
        .catch(() => {})
      return
    }

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {})
    }
    if (document.readyState === "complete") register()
    else {
      window.addEventListener("load", register, { once: true })
      return () => window.removeEventListener("load", register)
    }
  }, [])
  return null
}
