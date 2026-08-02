"use client"
import { useEffect, useRef, useCallback } from "react"

// ────────────────────────────────────────────────────────────────────────────
// Cloudflare Turnstile — CAPTCHA for the auth endpoints.
//
// Why it's needed: signup and magic-link both send an email to whatever address
// is typed in. Without a challenge that's a free spam cannon pointed at
// strangers, sent from OUR domain — which burns sending reputation that is very
// hard to win back. Supabase's own rate limits blunt volume but don't stop it.
//
// Turnstile over hCaptcha: invisible for nearly every real visitor, so it costs
// no conversion on a paid product.
//
// Inert until NEXT_PUBLIC_TURNSTILE_SITE_KEY is set, so a missing key can never
// lock anyone out of their own login — it just falls back to no challenge.
// Supabase must ALSO have CAPTCHA enabled (Auth → Settings) with the matching
// secret, or it ignores the token entirely.
// ────────────────────────────────────────────────────────────────────────────

export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ""
export const captchaEnabled = TURNSTILE_SITE_KEY.length > 0

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"

interface TurnstileApi {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string
  reset: (id?: string) => void
  remove: (id?: string) => void
}
declare global {
  interface Window { turnstile?: TurnstileApi }
}

let scriptPromise: Promise<void> | null = null

function loadScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve()
  if (window.turnstile) return Promise.resolve()
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement("script")
    s.src = SCRIPT_SRC
    s.async = true
    s.defer = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error("Could not load the CAPTCHA."))
    document.head.appendChild(s)
  })
  return scriptPromise
}

export function Turnstile({
  onToken,
  onExpire,
}: {
  onToken: (token: string) => void
  onExpire?: () => void
}) {
  const boxRef = useRef<HTMLDivElement | null>(null)
  const widgetId = useRef<string | null>(null)

  useEffect(() => {
    if (!captchaEnabled) return
    let cancelled = false

    loadScript()
      .then(() => {
        if (cancelled || !boxRef.current || !window.turnstile) return
        // Guard against a double-render in React strict mode.
        if (widgetId.current !== null) return
        widgetId.current = window.turnstile.render(boxRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          theme: "dark",
          callback: (token: string) => onToken(token),
          "expired-callback": () => onExpire?.(),
          "error-callback": () => onExpire?.(),
        })
      })
      .catch(() => onExpire?.())

    return () => {
      cancelled = true
      if (widgetId.current !== null && window.turnstile) {
        try { window.turnstile.remove(widgetId.current) } catch { /* already gone */ }
        widgetId.current = null
      }
    }
    // Mount once; the callbacks are read through closures that stay current
    // enough for a single-purpose widget.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!captchaEnabled) return null
  return <div ref={boxRef} style={{ marginTop: 4 }} />
}

// A Turnstile token is SINGLE USE. After any submit — success or failure — the
// widget has to be reset or the next attempt fails with an already-used token.
export function useTurnstileReset() {
  return useCallback(() => {
    if (typeof window !== "undefined" && window.turnstile) {
      try { window.turnstile.reset() } catch { /* not rendered */ }
    }
  }, [])
}
