"use client"
import { useState, useEffect, useRef, useCallback } from "react"
import {
  isPushSupported,
  isEnabled,
  enableMissYou,
  sendMissYou,
  fetchPartnerName,
} from "@/lib/push/missYouOwner"

// Rapid taps batch into one "×N" ping so her lock screen gets one warm buzz.
const BATCH_MS = 3500

// His side of "I miss you", on his own dashboard. His identity comes from his
// session — nothing to pick — and pings go only to her devices for this gift.
export function MissYouOwner({ recipientName }: { recipientName: string | null }) {
  const [mounted, setMounted] = useState(false)
  const [supported, setSupported] = useState(true)
  const [enabled, setEnabled] = useState(false)
  const [partnerName, setPartnerName] = useState(recipientName || "her")

  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<null | "reaching" | "sent" | "waiting" | "failed">(null)
  const [error, setError] = useState<string | null>(null)
  const [hearts, setHearts] = useState<number[]>([])

  const pendingRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setMounted(true)
    setSupported(isPushSupported())
    setEnabled(isEnabled())
  }, [])

  const flushSend = useCallback(async () => {
    const count = pendingRef.current
    pendingRef.current = 0
    if (count <= 0) return
    setStatus("reaching")
    const outcome = await sendMissYou(count)
    setStatus(outcome === "sent" ? "sent" : outcome === "no-partner-device" ? "waiting" : "failed")
    window.setTimeout(() => setStatus(null), 3500)
  }, [])

  const tap = useCallback(() => {
    setHearts((h) => [...h, Date.now() + Math.random()])
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate([20, 45, 20])
    pendingRef.current += 1
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(flushSend, BATCH_MS)
  }, [flushSend])

  const turnOn = async () => {
    setBusy(true)
    setError(null)
    const n = await fetchPartnerName()
    setPartnerName(n.partnerName)
    const res = await enableMissYou()
    setBusy(false)
    if (res === "granted") {
      setEnabled(true)
    } else if (res === "denied") {
      setError("Notifications are blocked. Turn them on for this site in your browser/device settings, then try again.")
    } else if (res === "unsupported") {
      setError("This browser can't do push notifications. On iPhone, add this dashboard to your home screen and open it from there.")
    } else if (res === "unconfigured") {
      setError("Push isn't configured for this deployment yet.")
    } else {
      setError("Couldn't turn it on — please try again.")
    }
  }

  if (!mounted) return null

  return (
    <div style={card}>
      <div style={sectionLabel}>Across the distance</div>

      {!supported ? (
        <p style={hint}>
          This browser can’t send push notifications. On iPhone, add this dashboard to your home
          screen and open it from there.
        </p>
      ) : !enabled ? (
        <>
          <p style={{ ...hint, marginTop: 0 }}>
            Turn this on and you can tap a heart any time to let {partnerName} know you miss her —
            it reaches her phone as a gentle notification. You’ll feel hers the same way.
          </p>
          <button onClick={turnOn} disabled={busy} style={addBtn(busy)}>
            {busy ? "Turning on…" : "Turn on “I miss you”"}
          </button>
        </>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <button onClick={tap} style={{ ...heartBtn, position: "relative" }}>
              <span style={{ fontSize: 18, lineHeight: 1 }} aria-hidden>
                💗
              </span>
              <span>I miss you</span>
              {hearts.map((id) => (
                <span
                  key={id}
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: 0,
                    fontSize: 16,
                    pointerEvents: "none",
                    animation: "missYouFloat 1.4s ease-out forwards",
                  }}
                  onAnimationEnd={() => setHearts((h) => h.filter((x) => x !== id))}
                >
                  💗
                </span>
              ))}
            </button>
            <span style={{ ...hint, margin: 0 }}>
              Tap as many times as you like — she gets one notification.
            </span>
          </div>

          {status && (
            <p style={{ ...hint, marginBottom: 0, color: "rgba(242,236,224,0.65)" }}>
              {status === "reaching" && "Reaching across the distance…"}
              {status === "sent" && `${partnerName} will feel it 💗`}
              {status === "waiting" &&
                `${partnerName} hasn’t turned this on yet — open her gift link on her phone, tap the heart there once, and allow notifications.`}
              {status === "failed" && "Couldn’t send — please try again."}
            </p>
          )}
        </>
      )}

      {error && (
        <p style={{ ...hint, color: "rgba(220,90,110,0.9)", marginBottom: 0 }}>{error}</p>
      )}

      <style>{`
        @keyframes missYouFloat {
          from { opacity: 0.9; transform: translate(-50%, 0) scale(0.7); }
          to   { opacity: 0;   transform: translate(-50%, -70px) scale(1.1); }
        }
      `}</style>
    </div>
  )
}

const card: React.CSSProperties = {
  border: "1px solid rgba(184,148,74,0.18)",
  borderRadius: 14,
  padding: 16,
  marginTop: 10,
  background: "rgba(255,255,255,0.02)",
}
const sectionLabel: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "rgba(232,200,130,0.7)",
  marginBottom: 8,
}
const hint: React.CSSProperties = {
  margin: "10px 0 12px",
  fontSize: 12.5,
  lineHeight: 1.5,
  color: "rgba(242,236,224,0.45)",
  fontFamily: "'EB Garamond', serif",
}
const addBtn = (busy: boolean): React.CSSProperties => ({
  alignSelf: "flex-start",
  padding: "9px 18px",
  borderRadius: 999,
  border: "1px solid rgba(184,148,74,0.3)",
  background: "rgba(138,21,40,0.85)",
  color: "#f2ece0",
  fontSize: 13,
  cursor: busy ? "default" : "pointer",
  opacity: busy ? 0.6 : 1,
  fontFamily: "'EB Garamond', serif",
})
const heartBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "11px 20px",
  borderRadius: 999,
  border: "1px solid rgba(184,148,74,0.4)",
  background: "linear-gradient(135deg, rgba(138,21,40,0.95), rgba(100,12,28,0.98))",
  color: "#f2ece0",
  fontSize: 13.5,
  cursor: "pointer",
  fontFamily: "'EB Garamond', serif",
}
