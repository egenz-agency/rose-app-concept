"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { markTourSeenAction } from "./actions"

// ────────────────────────────────────────────────────────────────────────────
// First-run guide.
//
// A stepped modal rather than spotlight tooltips anchored to elements: the
// dashboard reflows a lot (the paywall card, the "I miss you" card and the
// Operator link all appear conditionally), so anchored callouts would point at
// the wrong thing — or at nothing — depending on the gift's state. A modal
// explains the same ground and can't break.
//
// "Seen" lives on the tenant, not localStorage, so it doesn't reappear when the
// owner opens the dashboard on their phone after building the gift on a laptop.
// It can always be reopened from the footer, so nothing is lost by skipping.
// ────────────────────────────────────────────────────────────────────────────

interface Step {
  title: string
  body: string
}

const STEPS: Step[] = [
  {
    title: "This is your side of the gift",
    body:
      "She never sees this page. Everything you write here quietly appears on her rose over the coming days and months — you set it up once, and it keeps giving."
  },
  {
    title: "The private link is the gift",
    body:
      "At the top you'll find the link to send her. It's private: only someone holding that exact link can open the rose. Send it however you like — a message, a card, in person."
  },
  {
    title: "Her rose needs tending",
    body:
      "She opens the link and holds the dome to tend the rose. Visit daily and it blooms and grows a garden; miss three days in a row and it dies — though it can be revived. That's the heart of it."
  },
  {
    title: "Write messages for later",
    body:
      "Under “Scheduled messages” you can leave notes that surface on her visits — either on a date you choose, or the next time she opens it. Write a few now and forget about them; she'll find them when you're not around."
  },
  {
    title: "Moments: photos, clips, memories",
    body:
      "Moments are richer — a photo or a short video with a note, triggered on a particular visit number, a date, or on a repeat. An anniversary. Her birthday. Every tenth visit."
  },
  {
    title: "Make it yours",
    body:
      "Under “Customize” set both your names, an intro video that plays when she first opens it, and a song for the background. These are the details that make it feel made for her, because it was."
  },
  {
    title: "Reach her any time",
    body:
      "Once the gift is live, the “I miss you” button sends a gentle notification straight to her phone. She can send one back from her rose. It works best when you've both added the app to your home screens."
  },
]

export function DashboardTour({ open }: { open: boolean }) {
  const router = useRouter()
  const [visible, setVisible] = useState(open)
  const [i, setI] = useState(0)
  const [saving, setSaving] = useState(false)

  if (!visible) return null

  const step = STEPS[i]
  const last = i === STEPS.length - 1

  async function finish() {
    setSaving(true)
    // Close immediately — the guide should never feel like it's hanging on the
    // network. If the write fails the worst case is seeing it once more.
    setVisible(false)
    try { await markTourSeenAction(); router.refresh() } catch { /* shown again next time */ }
  }

  return (
    <div style={backdrop} role="dialog" aria-modal="true" aria-label="Getting started">
      <div style={panel}>
        <div style={counter}>
          {i + 1} of {STEPS.length}
        </div>

        <h2 style={title}>{step.title}</h2>
        <p style={body}>{step.body}</p>

        {/* Progress pips double as a hint that this is short */}
        <div style={{ display: "flex", gap: 6, justifyContent: "center", margin: "22px 0 20px" }}>
          {STEPS.map((_, n) => (
            <span
              key={n}
              style={{
                width: n === i ? 18 : 6, height: 6, borderRadius: 999,
                background: n === i ? "#e8c882" : "rgba(232,200,130,0.25)",
                transition: "width .2s"
              }}
            />
          ))}
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "space-between", alignItems: "center" }}>
          <button
            onClick={finish}
            disabled={saving}
            style={{ ...ghost, visibility: last ? "hidden" : "visible" }}
          >
            Skip
          </button>

          <div style={{ display: "flex", gap: 8 }}>
            {i > 0 && (
              <button onClick={() => setI((n) => n - 1)} style={ghost}>Back</button>
            )}
            <button
              onClick={() => (last ? finish() : setI((n) => n + 1))}
              disabled={saving}
              style={primary}
            >
              {last ? "Start building" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Lets the owner reopen the guide later — a tour you can only ever see once is
// a tour people skip and then wish they hadn't.
export function ReopenTourButton() {
  const [open, setOpen] = useState(false)
  if (open) return <DashboardTour open />
  return (
    <button onClick={() => setOpen(true)} style={footerLink}>
      How this works
    </button>
  )
}

const backdrop: React.CSSProperties = {
  position: "fixed", inset: 0, zIndex: 60,
  background: "rgba(6,2,4,0.82)", backdropFilter: "blur(6px)",
  display: "flex", alignItems: "center", justifyContent: "center", padding: 20
}
const panel: React.CSSProperties = {
  width: "100%", maxWidth: 440, background: "#140510",
  border: "1px solid rgba(184,148,74,0.32)", borderRadius: 18,
  padding: "26px 26px 22px", color: "#f2ece0",
  boxShadow: "0 24px 70px rgba(0,0,0,0.6)"
}
const counter: React.CSSProperties = {
  fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase",
  color: "rgba(232,200,130,0.6)", marginBottom: 12
}
const title: React.CSSProperties = {
  fontSize: 25, lineHeight: 1.25, margin: "0 0 12px"
}
const body: React.CSSProperties = {
  fontSize: 15, lineHeight: 1.65,
  color: "rgba(242,236,224,0.72)", margin: 0, minHeight: 96
}
const primary: React.CSSProperties = {
  padding: "10px 22px", borderRadius: 999,
  border: "1px solid rgba(232,200,130,0.5)", background: "rgba(232,200,130,0.14)",
  color: "#f6eeda", fontSize: 14, cursor: "pointer" }
const ghost: React.CSSProperties = {
  padding: "10px 16px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.12)",
  background: "transparent", color: "rgba(242,236,224,0.55)", fontSize: 13,
  cursor: "pointer" }
const footerLink: React.CSSProperties = {
  background: "none", border: "none", padding: 0,
  color: "rgba(242,236,224,0.5)", textDecoration: "none", fontSize: 12,
  cursor: "pointer" }
