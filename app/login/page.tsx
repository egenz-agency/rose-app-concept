"use client"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { getSaasBrowserClient } from "@/lib/supabase/saasBrowser"
import { Turnstile, captchaEnabled, useTurnstileReset } from "@/components/auth/Turnstile"
import { SupportLinks } from "@/components/ui/SupportLinks"

// Buyer auth — passwordless, one flow for everyone.
//
//   1. enter email  → a numeric code is emailed (length set in Supabase)
//   2. enter code   → signed in (the account is created if it's their first time)
//
// Why no password: buyers open this a handful of times a year, so nobody
// remembers one. A password also drags in a reset flow that goes through email
// anyway — so it protects nothing that the inbox doesn't already gate, while
// adding a whole surface to support.
//
// Why a CODE and not a magic link: Gmail/Outlook and corporate filters pre-fetch
// URLs in email. Supabase's link is single-use, so a scanner burns it before the
// human clicks. A code can't be consumed that way, and it works when mail is
// read on a phone while the browser is on a laptop.
//
// Sign-up and sign-in being identical also means the form leaks nothing about
// which addresses have accounts.

type Step = "email" | "code"

const RESEND_SECONDS = 45

// Supabase's email OTP length is a PROJECT SETTING (Authentication → Sign In /
// Providers → Email OTP Length), adjustable from 6 to 10 digits. Hardcoding 6
// silently truncated longer codes via maxLength, so the button could never
// enable and the code could never be entered.
//
// Set NEXT_PUBLIC_OTP_LENGTH to match the project exactly if you want the
// tightest UX (auto-submit when full, exact placeholder). Left unset, the field
// accepts any length in range and simply requires the minimum — which works
// whatever the dashboard is set to.
const OTP_MIN = 6
const OTP_MAX = 10
const OTP_EXACT = (() => {
  const n = Number(process.env.NEXT_PUBLIC_OTP_LENGTH)
  return Number.isInteger(n) && n >= OTP_MIN && n <= OTP_MAX ? n : null
})()
const OTP_REQUIRED = OTP_EXACT ?? OTP_MIN

export default function LoginPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>("email")
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [agreed, setAgreed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)
  const codeRef = useRef<HTMLInputElement | null>(null)

  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const resetCaptcha = useTurnstileReset()

  // Already signed in → straight to the dashboard.
  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const { data } = await getSaasBrowserClient().auth.getSession()
        if (active && data.session) router.replace("/dashboard")
      } catch { /* not signed in / client not ready */ }
    })()
    return () => { active = false }
  }, [router])

  // Resend cooldown — stops someone hammering the send button and burning
  // Supabase's per-address rate limit (which locks them out far longer).
  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((n) => n - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault()
    setError(null); setMsg(null)

    if (!email.trim()) { setError("Enter your email address."); return }
    if (!agreed) { setError("Please accept the Terms and Privacy Policy to continue."); return }
    if (captchaEnabled && !captchaToken) { setError("Please complete the security check below."); return }

    setBusy(true)
    try {
      const { error } = await getSaasBrowserClient().auth.signInWithOtp({
        email: email.trim(),
        options: {
          // Creates the account on first sign-in — which is why there's no
          // separate "create account" path to get wrong.
          shouldCreateUser: true,
          captchaToken: captchaToken ?? undefined
        }
      })
      if (error) throw error

      setStep("code")
      setCooldown(RESEND_SECONDS)
      setMsg(`We sent a code to ${email.trim()}.`)
      setTimeout(() => codeRef.current?.focus(), 50)
    } catch (err: unknown) {
      setError(friendlyError(err))
    } finally {
      // Turnstile tokens are single use.
      setCaptchaToken(null)
      resetCaptcha()
      setBusy(false)
    }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault()
    setError(null); setMsg(null)

    const token = code.replace(/\D/g, "")
    if (token.length < OTP_REQUIRED) {
      setError(`Enter the ${OTP_EXACT ? `${OTP_EXACT}-digit ` : ""}code from your email.`); return
    }

    setBusy(true)
    try {
      const { error } = await getSaasBrowserClient().auth.verifyOtp({
        email: email.trim(),
        token,
        type: "email"
      })
      if (error) throw error
      router.push("/dashboard")
      router.refresh()
    } catch (err: unknown) {
      setError(friendlyError(err))
      setCode("")
      codeRef.current?.focus()
    } finally {
      setBusy(false)
    }
  }

  function startOver() {
    setStep("email"); setCode(""); setError(null); setMsg(null); setCooldown(0)
  }

  return (
    <div className="ui-surface" style={{ height: "100dvh", overflowY: "auto", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0205", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <h1 style={{ fontSize: 34, color: "#f2ece0", marginBottom: 6, textAlign: "center" }}>
          Your Rose
        </h1>
        <p style={{ color: "rgba(242,236,224,0.55)", fontSize: 14, textAlign: "center", marginBottom: 24 }}>
          {step === "email"
            ? "Enter your email and we'll send you a sign-in code."
            : "Check your inbox for the code."}
        </p>

        {step === "email" ? (
          <form onSubmit={sendCode} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com" autoComplete="email" autoFocus style={inputStyle}
            />

            <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer", padding: "2px 2px 4px" }}>
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} style={{ marginTop: 3, width: 16, height: 16, accentColor: "#8a1528", cursor: "pointer", flexShrink: 0 }} />
              <span style={{ fontSize: 12.5, lineHeight: 1.5, color: "rgba(242,236,224,0.6)" }}>
                I agree to the{" "}
                <a href="/legal/terms" target="_blank" rel="noreferrer" style={{ color: "rgba(232,200,130,0.8)" }}>Terms</a>{" "}and{" "}
                <a href="/legal/privacy" target="_blank" rel="noreferrer" style={{ color: "rgba(232,200,130,0.8)" }}>Privacy Policy</a>.
              </span>
            </label>

            <Turnstile onToken={setCaptchaToken} onExpire={() => setCaptchaToken(null)} />

            <button type="submit" disabled={busy || !agreed} style={primaryBtn(busy || !agreed)}>
              {busy ? "Sending…" : "Email me a code"}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyCode} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input
              ref={codeRef}
              // inputMode numeric + one-time-code lets phones surface the code
              // from the notification instead of making them switch apps.
              type="text" inputMode="numeric" autoComplete="one-time-code"
              pattern="[0-9]*" maxLength={OTP_EXACT ?? OTP_MAX} required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, OTP_EXACT ?? OTP_MAX))}
              placeholder={"".padStart(OTP_EXACT ?? OTP_MIN, "•")}
              style={{ ...inputStyle, textAlign: "center", fontSize: 26, letterSpacing: "0.5em", fontFamily: "monospace", paddingLeft: 24 }}
            />

            <button type="submit" disabled={busy || code.length < OTP_REQUIRED} style={primaryBtn(busy || code.length < OTP_REQUIRED)}>
              {busy ? "Signing in…" : "Sign in"}
            </button>

            <button
              type="button"
              onClick={() => sendCode()}
              disabled={busy || cooldown > 0}
              style={{ ...linkBtn, cursor: cooldown > 0 ? "default" : "pointer", opacity: cooldown > 0 ? 0.5 : 1 }}
            >
              {cooldown > 0 ? `Send a new code in ${cooldown}s` : "Send a new code"}
            </button>

            <button type="button" onClick={startOver} style={linkBtn}>
              Use a different email
            </button>
          </form>
        )}

        {msg && <p style={{ color: "rgba(232,200,130,0.95)", fontSize: 13, textAlign: "center", marginTop: 14 }}>{msg}</p>}
        {error && <p style={{ color: "#e58", fontSize: 13, textAlign: "center", marginTop: 14 }}>{error}</p>}

        <SupportLinks context="sign-in page" style={{ marginTop: 28 }} />
      </div>
    </div>
  )
}

// Supabase's raw auth errors are unhelpful to a buyer ("Token has expired or is
// invalid"). Translate the ones they'll actually hit.
function friendlyError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err)
  if (/expired|invalid/i.test(raw) && /token|otp|code/i.test(raw)) {
    return "That code is wrong or has expired. Ask for a new one."
  }
  if (/rate limit|too many|after \d+ seconds/i.test(raw)) {
    return "Too many attempts just now. Wait a minute and try again."
  }
  if (/captcha/i.test(raw)) {
    return "The security check failed. Reload the page and try again."
  }
  return raw
}

const inputStyle: React.CSSProperties = { padding: "13px 16px", borderRadius: 12, border: "1px solid rgba(184,148,74,0.28)", background: "rgba(255,255,255,0.04)", color: "#f2ece0", fontSize: 15, outline: "none" }
// Serif carried positive tracking well; a sans at this size just reads thin and
// washed out. Weight 500 and slightly negative tracking give the button the
// solidity the serif was getting from its letterforms.
const primaryBtn = (disabled: boolean): React.CSSProperties => ({
  padding: "14px 16px", borderRadius: 999,
  border: "1px solid rgba(184,148,74,0.32)",
  background: "linear-gradient(135deg, rgba(138,21,40,0.92), rgba(100,12,28,0.95))",
  color: "#f6eeda",
  fontSize: 15, fontWeight: 500, letterSpacing: "-0.01em",
  cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.45 : 1,
})
const linkBtn: React.CSSProperties = { display: "block", margin: "2px auto 0", background: "none", border: "none", color: "rgba(242,236,224,0.45)", fontSize: 12, cursor: "pointer", textDecoration: "underline" }
