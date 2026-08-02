"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getSaasBrowserClient } from "@/lib/supabase/saasBrowser"
import { Turnstile, captchaEnabled, useTurnstileReset } from "@/components/auth/Turnstile"

type Mode = "signin" | "signup" | "magic"

// Buyer auth for the multi-tenant product.
//   • signin — existing account (email + password)
//   • signup — new account (email + password); may require email confirmation
//   • magic  — passwordless link
export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>("signin")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [agreed, setAgreed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  // CAPTCHA token for the auth call. Signup and magic-link both send email, so
  // without this the form can be used to mail arbitrary strangers from our
  // domain. Sign-in is covered too because Supabase requires the token on every
  // auth endpoint once CAPTCHA is switched on for the project.
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const resetCaptcha = useTurnstileReset()

  // If already signed in, skip straight to the dashboard.
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

  function switchMode(next: Mode) {
    setMode(next); setError(null); setMsg(null)
  }

  // Deliberately non-committal, and deliberately IDENTICAL for both outcomes —
  // a brand-new address and one that's already taken produce exactly this text.
  // That's what stops the signup form being used to discover which emails have
  // accounts. If you ever split these two messages apart, the leak comes back.
  // Either way the user lands in sign-in with their email still filled in.
  function setSignupAmbiguous() {
    setMsg(
      "If that email is new, check your inbox to confirm it. If you already have an account, sign in instead."
    )
    setMode("signin")
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null); setMsg(null)

    if (!email.trim()) { setError("Enter your email address."); return }
    if (!agreed) { setError("Please accept the Terms and Privacy Policy to continue."); return }
    if (mode !== "magic" && password.length < 6) {
      setError("Password must be at least 6 characters."); return
    }
    if (captchaEnabled && !captchaToken) {
      setError("Please complete the security check below."); return
    }

    setBusy(true)
    try {
      const sb = getSaasBrowserClient()

      if (mode === "signin") {
        const { error } = await sb.auth.signInWithPassword({
          email: email.trim(), password,
          options: { captchaToken: captchaToken ?? undefined },
        })
        if (error) throw error
        router.push("/dashboard"); router.refresh()
        return
      }

      if (mode === "signup") {
        const { data, error } = await sb.auth.signUp({
          email: email.trim(), password,
          options: { captchaToken: captchaToken ?? undefined },
        })
        if (error) throw error

        // Signing up with an address that already has an account does NOT error:
        // Supabase returns 200 with an obfuscated user so the form can't be used
        // to enumerate accounts. The tell is an empty `identities` array — a
        // genuinely new signup always comes back with one. (With email
        // confirmation switched off it throws "User already registered" instead,
        // which is caught below.) Without this check the user is told to go
        // check an inbox that will never receive anything.
        if (data.user && (data.user.identities?.length ?? 0) === 0) {
          setSignupAmbiguous()
          return
        }

        if (data.session) { router.push("/dashboard"); router.refresh(); return }
        // Email confirmation is on → no session yet. Same message as the
        // already-taken branch above, on purpose.
        setSignupAmbiguous()
        return
      }

      // magic
      const { error } = await sb.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          captchaToken: captchaToken ?? undefined,
        },
      })
      if (error) throw error
      setMsg("Check your email for a magic link 🌹")
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : String(err)
      // The other shape of "this email is taken" — thrown when email
      // confirmation is disabled, instead of the obfuscated user above.
      if (/already registered|already exists|user_already_exists/i.test(raw)) {
        setSignupAmbiguous()
        return
      }
      // Make the most common signin error actionable.
      setError(
        /invalid login credentials/i.test(raw)
          ? "That email and password don't match. If you're new, choose \"Create account\" above."
          : raw
      )
    } finally {
      // Turnstile tokens are single use — a retry with a spent token always
      // fails, so clear and re-arm the widget after every attempt.
      setCaptchaToken(null)
      resetCaptcha()
      setBusy(false)
    }
  }

  const isPassword = mode !== "magic"
  const heading =
    mode === "signup" ? "Create your account" : mode === "magic" ? "Sign in with a link" : "Welcome back"
  const subtitle =
    mode === "signup"
      ? "Set up an account to build and manage your gift."
      : mode === "magic"
      ? "We'll email you a one-tap sign-in link."
      : "Sign in to manage your gift."
  const primaryLabel =
    mode === "signup" ? "Create account" : mode === "magic" ? "Send me a magic link" : "Sign in"

  return (
    <div style={{ height: "100dvh", overflowY: "auto", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0205", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontStyle: "italic", fontSize: 34, color: "#f2ece0", marginBottom: 6, textAlign: "center" }}>
          Your Rose
        </h1>
        <p style={{ color: "rgba(242,236,224,0.55)", fontSize: 14, textAlign: "center", marginBottom: 22, fontFamily: "'EB Garamond', serif" }}>
          {subtitle}
        </p>

        {/* Sign in / Create account toggle */}
        {mode !== "magic" && (
          <div style={segWrap}>
            <button type="button" onClick={() => switchMode("signin")} style={segBtn(mode === "signin")}>Sign in</button>
            <button type="button" onClick={() => switchMode("signup")} style={segBtn(mode === "signup")}>Create account</button>
          </div>
        )}

        <h2 style={{ fontFamily: "'EB Garamond', serif", fontSize: 16, color: "rgba(242,236,224,0.9)", textAlign: "center", margin: "0 0 14px" }}>
          {heading}
        </h2>

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" autoComplete="email" style={inputStyle} />
          {isPassword && (
            <input
              type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === "signup" ? "Create a password (6+ characters)" : "Password"}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              style={inputStyle}
            />
          )}

          <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer", padding: "2px 2px 4px" }}>
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} style={{ marginTop: 3, width: 16, height: 16, accentColor: "#8a1528", cursor: "pointer", flexShrink: 0 }} />
            <span style={{ fontSize: 12.5, lineHeight: 1.5, color: "rgba(242,236,224,0.6)", fontFamily: "'EB Garamond', serif" }}>
              I agree to the{" "}
              <a href="/legal/terms" target="_blank" rel="noreferrer" style={{ color: "rgba(232,200,130,0.8)" }}>Terms</a>{" "}and{" "}
              <a href="/legal/privacy" target="_blank" rel="noreferrer" style={{ color: "rgba(232,200,130,0.8)" }}>Privacy Policy</a>.
            </span>
          </label>

          {/* Renders nothing until NEXT_PUBLIC_TURNSTILE_SITE_KEY is set. */}
          <Turnstile onToken={setCaptchaToken} onExpire={() => setCaptchaToken(null)} />

          <button type="submit" disabled={busy || !agreed} style={primaryBtn(busy || !agreed)}>
            {busy ? "…" : primaryLabel}
          </button>
        </form>

        <button type="button" onClick={() => switchMode(mode === "magic" ? "signin" : "magic")} style={linkBtn}>
          {mode === "magic" ? "Use a password instead" : "Email me a magic link instead"}
        </button>

        {msg && <p style={{ color: "rgba(232,200,130,0.95)", fontSize: 13, textAlign: "center", marginTop: 14, fontFamily: "'EB Garamond', serif" }}>{msg}</p>}
        {error && <p style={{ color: "#e58", fontSize: 13, textAlign: "center", marginTop: 14, fontFamily: "'EB Garamond', serif" }}>{error}</p>}
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = { padding: "13px 16px", borderRadius: 12, border: "1px solid rgba(184,148,74,0.28)", background: "rgba(255,255,255,0.04)", color: "#f2ece0", fontSize: 15, outline: "none", fontFamily: "'EB Garamond', serif" }
const primaryBtn = (disabled: boolean): React.CSSProperties => ({ padding: "13px 16px", borderRadius: 999, border: "1px solid rgba(184,148,74,0.3)", background: "linear-gradient(135deg, rgba(138,21,40,0.92), rgba(100,12,28,0.95))", color: "#f2ece0", fontSize: 15, cursor: disabled ? "not-allowed" : "pointer", fontFamily: "'EB Garamond', serif", letterSpacing: "0.04em", opacity: disabled ? 0.55 : 1 })
const linkBtn: React.CSSProperties = { display: "block", margin: "10px auto 0", background: "none", border: "none", color: "rgba(242,236,224,0.45)", fontSize: 12, cursor: "pointer", textDecoration: "underline", fontFamily: "'EB Garamond', serif" }
const segWrap: React.CSSProperties = { display: "flex", gap: 4, padding: 4, borderRadius: 999, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(184,148,74,0.2)", marginBottom: 18 }
const segBtn = (active: boolean): React.CSSProperties => ({ flex: 1, padding: "9px 12px", borderRadius: 999, border: "none", cursor: "pointer", fontSize: 13.5, fontFamily: "'EB Garamond', serif", letterSpacing: "0.02em", color: active ? "#f2ece0" : "rgba(242,236,224,0.5)", background: active ? "linear-gradient(135deg, rgba(138,21,40,0.9), rgba(100,12,28,0.92))" : "transparent" })
