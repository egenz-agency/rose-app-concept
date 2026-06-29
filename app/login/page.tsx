"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { getSaasBrowserClient } from "@/lib/supabase/saasBrowser"

// Buyer auth. Primary: email + password (instant, no email needed — works even
// when Supabase's email rate limit is hit). Secondary: passwordless magic link.
export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<"password" | "magic">("password")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function signIn(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError(null); setMsg(null)
    const sb = getSaasBrowserClient()
    const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password })
    if (error) { setError(error.message); setBusy(false); return }
    router.push("/dashboard"); router.refresh()
  }

  async function signUp() {
    if (!email.trim() || password.length < 6) { setError("Enter an email and a password (6+ characters)."); return }
    setBusy(true); setError(null); setMsg(null)
    const sb = getSaasBrowserClient()
    const { data, error } = await sb.auth.signUp({ email: email.trim(), password })
    if (error) { setError(error.message); setBusy(false); return }
    if (data.session) { router.push("/dashboard"); router.refresh(); return }
    // Email confirmation is on → no session yet
    setMsg("Account created. Check your email to confirm, then sign in.")
    setBusy(false)
  }

  async function sendMagic(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setBusy(true); setError(null); setMsg(null)
    const sb = getSaasBrowserClient()
    const { error } = await sb.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) { setError(error.message); setBusy(false); return }
    setMsg("Check your email for a magic link 🌹")
    setBusy(false)
  }

  return (
    <div style={{ height: "100dvh", overflowY: "auto", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0205", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontStyle: "italic", fontSize: 34, color: "#f2ece0", marginBottom: 6, textAlign: "center" }}>
          Your Rose
        </h1>
        <p style={{ color: "rgba(242,236,224,0.55)", fontSize: 14, textAlign: "center", marginBottom: 28, fontFamily: "'EB Garamond', serif" }}>
          Sign in to create &amp; manage your gift
        </p>

        {mode === "password" ? (
          <form onSubmit={signIn} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" autoComplete="email" style={inputStyle} />
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" autoComplete="current-password" style={inputStyle} />
            <button type="submit" disabled={busy} style={primaryBtn(busy)}>{busy ? "…" : "Sign in"}</button>
            <button type="button" onClick={signUp} disabled={busy} style={secondaryBtn}>Create account</button>
            <button type="button" onClick={() => { setMode("magic"); setError(null); setMsg(null) }} style={linkBtn}>
              Use a magic link instead
            </button>
          </form>
        ) : (
          <form onSubmit={sendMagic} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" autoComplete="email" style={inputStyle} />
            <button type="submit" disabled={busy} style={primaryBtn(busy)}>{busy ? "Sending…" : "Send me a magic link"}</button>
            <button type="button" onClick={() => { setMode("password"); setError(null); setMsg(null) }} style={linkBtn}>
              Use a password instead
            </button>
          </form>
        )}

        {msg && <p style={{ color: "rgba(232,200,130,0.9)", fontSize: 13, textAlign: "center", marginTop: 14 }}>{msg}</p>}
        {error && <p style={{ color: "#e58", fontSize: 13, textAlign: "center", marginTop: 14 }}>{error}</p>}
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = { padding: "13px 16px", borderRadius: 12, border: "1px solid rgba(184,148,74,0.28)", background: "rgba(255,255,255,0.04)", color: "#f2ece0", fontSize: 15, outline: "none" }
const primaryBtn = (busy: boolean): React.CSSProperties => ({ padding: "13px 16px", borderRadius: 999, border: "1px solid rgba(184,148,74,0.3)", background: "linear-gradient(135deg, rgba(138,21,40,0.92), rgba(100,12,28,0.95))", color: "#f2ece0", fontSize: 15, cursor: "pointer", fontFamily: "'EB Garamond', serif", letterSpacing: "0.04em", opacity: busy ? 0.6 : 1 })
const secondaryBtn: React.CSSProperties = { padding: "12px 16px", borderRadius: 999, border: "1px solid rgba(184,148,74,0.28)", background: "transparent", color: "rgba(242,236,224,0.85)", fontSize: 14, cursor: "pointer", fontFamily: "'EB Garamond', serif" }
const linkBtn: React.CSSProperties = { background: "none", border: "none", color: "rgba(242,236,224,0.45)", fontSize: 12, cursor: "pointer", textDecoration: "underline", marginTop: 4, fontFamily: "'EB Garamond', serif" }
