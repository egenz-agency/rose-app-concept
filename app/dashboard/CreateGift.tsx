"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { createGiftAction } from "./actions"

// Shown when a logged-in buyer has no gift yet. Until Stripe checkout exists
// (Phase 5), this is the onboarding step: pick a link name + names.
export function CreateGift({ email }: { email: string }) {
  const router = useRouter()
  const [slug, setSlug] = useState("")
  const [recipient, setRecipient] = useState("")
  const [giver, setGiver] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError(null)
    try {
      await createGiftAction({ slug, recipient, giver })
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
      setBusy(false)
    }
  }

  const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-")

  return (
    <div style={{ height: "100dvh", overflowY: "auto", WebkitOverflowScrolling: "touch", background: "#0a0205", padding: "48px 24px", display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 460 }}>
        <p style={{ color: "rgba(242,236,224,0.45)", fontSize: 12, fontFamily: "'EB Garamond', serif" }}>{email}</p>
        <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontStyle: "italic", fontSize: 32, color: "#f2ece0", margin: "4px 0 6px" }}>
          Create your gift
        </h1>
        <p style={{ color: "rgba(242,236,224,0.55)", fontSize: 14, marginBottom: 26, fontFamily: "'EB Garamond', serif" }}>
          Choose a private link and who it&apos;s for. You can change the rest later.
        </p>

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <label style={labelStyle}>
            Link name
            <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="maria-and-ivan" required style={inputStyle} />
            <span style={hintStyle}>your gift will live at <b>/r/{cleanSlug || "…"}</b></span>
          </label>
          <label style={labelStyle}>
            Her name (the recipient)
            <input value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="Maria" style={inputStyle} />
          </label>
          <label style={labelStyle}>
            Your name (from)
            <input value={giver} onChange={(e) => setGiver(e.target.value)} placeholder="Ivan" style={inputStyle} />
          </label>
          <button type="submit" disabled={busy} style={buttonStyle(busy)}>
            {busy ? "Creating…" : "Create my gift"}
          </button>
          {error && <p style={{ color: "#e58", fontSize: 13 }}>{error}</p>}
        </form>
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 6, color: "rgba(242,236,224,0.8)", fontSize: 13, fontFamily: "'EB Garamond', serif" }
const inputStyle: React.CSSProperties = { padding: "12px 14px", borderRadius: 10, border: "1px solid rgba(184,148,74,0.28)", background: "rgba(255,255,255,0.04)", color: "#f2ece0", fontSize: 15, outline: "none" }
const hintStyle: React.CSSProperties = { color: "rgba(242,236,224,0.4)", fontSize: 12 }
const buttonStyle = (busy: boolean): React.CSSProperties => ({ marginTop: 8, padding: "13px 16px", borderRadius: 999, border: "1px solid rgba(184,148,74,0.3)", background: "linear-gradient(135deg, rgba(138,21,40,0.92), rgba(100,12,28,0.95))", color: "#f2ece0", fontSize: 15, cursor: "pointer", fontFamily: "'EB Garamond', serif", opacity: busy ? 0.6 : 1 })
