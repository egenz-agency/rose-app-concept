"use client"
import { useEffect, useState } from "react"

// A brief, dismissible cookie NOTICE (not a consent wall). We only use strictly
// necessary + functional storage, which is exempt from consent — so this simply
// informs and links to the policy. If analytics/marketing are added later, this
// should become a real consent banner with accept/reject.
const KEY = "rose_cookie_notice_ack"

export function CookieNotice() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setShow(true)
    } catch { /* storage blocked — don't show */ }
  }, [])

  if (!show) return null

  const dismiss = () => {
    try { localStorage.setItem(KEY, "1") } catch {}
    setShow(false)
  }

  return (
    <div
      role="dialog"
      aria-label="Cookie notice"
      style={{
        position: "fixed", left: 12, right: 12, bottom: 12, zIndex: 90,
        maxWidth: 560, margin: "0 auto",
        display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
        padding: "12px 16px", borderRadius: 14,
        background: "rgba(10,2,5,0.92)", border: "1px solid rgba(184,148,74,0.28)",
        backdropFilter: "blur(14px)", color: "rgba(242,236,224,0.85)",
        fontFamily: "'EB Garamond', serif", fontSize: 13.5,
        boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
      }}
    >
      <span style={{ flex: 1, minWidth: 200 }}>
        We use only essential cookies to keep you signed in.{" "}
        <a href="/legal/cookies" style={{ color: "rgba(232,200,130,0.85)" }}>Learn more</a>.
      </span>
      <button
        onClick={dismiss}
        style={{
          padding: "8px 18px", borderRadius: 999, cursor: "pointer",
          background: "linear-gradient(135deg, rgba(138,21,40,0.9), rgba(100,12,28,0.95))",
          border: "1px solid rgba(184,148,74,0.3)", color: "#f2ece0", fontFamily: "'EB Garamond', serif", fontSize: 13,
        }}
      >
        Got it
      </button>
    </div>
  )
}
