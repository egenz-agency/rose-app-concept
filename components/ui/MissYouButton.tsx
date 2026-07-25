"use client"
import { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useSceneStore } from "@/lib/store/sceneStore"
import {
  isPushSupported,
  isEnabled,
  enableMissYou,
  sendMissYou,
  fetchNames,
  getMyRole,
  type GiftRole,
} from "@/lib/push/missYou"

// Rapid taps are batched into a single "×N" ping so the other person's lock
// screen gets one warm buzz, not forty. This is how long we wait for more taps.
const BATCH_MS = 3500

export function MissYouButton() {
  const phase = useSceneStore((s) => s.phase)
  const slug = useSceneStore((s) => s.tenantSlug)

  const [mounted, setMounted] = useState(false)
  const [supported, setSupported] = useState(true)
  const [enabled, setEnabled] = useState(false)

  const [showEnable, setShowEnable] = useState(false)
  const [names, setNames] = useState<{ giverName: string; recipientName: string } | null>(null)
  const [picked, setPicked] = useState<GiftRole | null>(null)
  const [enabling, setEnabling] = useState(false)
  const [enableError, setEnableError] = useState<string | null>(null)

  const [hearts, setHearts] = useState<number[]>([])
  const [status, setStatus] = useState<null | "reaching" | "sent" | "waiting" | "failed">(null)
  const pendingRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setMounted(true)
    setSupported(isPushSupported())
    if (slug) setEnabled(isEnabled(slug))
  }, [slug])

  const flushSend = useCallback(async () => {
    const count = pendingRef.current
    pendingRef.current = 0
    if (count <= 0 || !slug) return
    setStatus("reaching")
    const outcome = await sendMissYou(slug, count)
    setStatus(outcome === "sent" ? "sent" : outcome === "no-partner-device" ? "waiting" : "failed")
    window.setTimeout(() => setStatus(null), 3000)
  }, [slug])

  const tap = useCallback(() => {
    setHearts((h) => [...h, Date.now() + Math.random()])
    // A soft double-tick on your own phone — the same heartbeat they'll feel.
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate([20, 45, 20])
    pendingRef.current += 1
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(flushSend, BATCH_MS)
  }, [flushSend])

  const openEnable = useCallback(async () => {
    if (!slug) return
    setShowEnable(true)
    setEnableError(null)
    const n = await fetchNames(slug)
    setNames({ giverName: n.giverName, recipientName: n.recipientName })
    if (!n.configured) {
      setEnableError("Push isn't configured for this deployment yet.")
    }
  }, [slug])

  const onButton = () => {
    if (!enabled) {
      void openEnable()
      return
    }
    tap()
  }

  const doEnable = async () => {
    if (!slug || !picked) return
    setEnabling(true)
    setEnableError(null)
    const res = await enableMissYou(slug, picked)
    setEnabling(false)
    if (res === "granted") {
      setEnabled(true)
      setShowEnable(false)
    } else if (res === "denied") {
      setEnableError("Notifications are blocked. Turn them on for this app in your device settings, then try again.")
    } else if (res === "unsupported") {
      setEnableError("Add the app to your home screen first, then open it from there to enable this.")
    } else if (res === "unconfigured") {
      setEnableError("Push isn't configured for this deployment yet.")
    } else {
      setEnableError("Couldn't turn it on — please try again.")
    }
  }

  // Only on a real gift page (needs a slug), while idle, and where push can work.
  if (!mounted || !supported || !slug || phase !== "IDLE") return null

  const myRole = getMyRole(slug)
  const partnerName =
    names && myRole
      ? myRole === "giver"
        ? names.recipientName
        : names.giverName
      : "them"

  return (
    <>
      <motion.button
        onClick={onButton}
        className="fixed z-30 flex items-center gap-2.5 rounded-full px-5 py-3"
        style={{
          bottom: "104px",
          left: "50%",
          x: "-50%",
          background: "rgba(28, 4, 12, 0.82)",
          border: "1px solid rgba(184, 148, 74, 0.28)",
          backdropFilter: "blur(20px)",
          cursor: "pointer",
          boxShadow: "inset 0 1px 0 rgba(255,248,240,0.07), 0 10px 30px rgba(0,0,0,0.55)",
        }}
        initial={{ opacity: 0, y: 14, filter: "blur(6px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.7 }}
        whileHover={{ scale: 1.05, borderColor: "rgba(184,148,74,0.5)" }}
        whileTap={{ scale: 0.94 }}
      >
        <motion.span
          style={{ fontSize: 16, lineHeight: 1, display: "inline-block" }}
          animate={{ scale: [1, 1.16, 0.98, 1.1, 1] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          aria-hidden
        >
          💗
        </motion.span>
        <span
          className="t-label"
          style={{ fontSize: "10px", letterSpacing: "0.22em", color: "rgba(242,236,224,0.82)" }}
        >
          I miss you
        </span>

        {/* Hearts float up from the button on each tap */}
        <AnimatePresence>
          {hearts.map((id) => (
            <motion.span
              key={id}
              onAnimationComplete={() => setHearts((h) => h.filter((x) => x !== id))}
              className="pointer-events-none"
              style={{ position: "absolute", left: "50%", top: 0, fontSize: 18 }}
              initial={{ opacity: 0.9, y: 0, x: "-50%", scale: 0.6 }}
              animate={{
                opacity: 0,
                y: -90 - Math.random() * 40,
                x: `calc(-50% + ${(Math.random() - 0.5) * 60}px)`,
                scale: 1.1,
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
            >
              💗
            </motion.span>
          ))}
        </AnimatePresence>
      </motion.button>

      {/* Status caption while a ping is sent */}
      <AnimatePresence>
        {status && (
          <motion.div
            className="fixed left-1/2 z-30 pointer-events-none"
            style={{ bottom: "158px", transform: "translateX(-50%)", textAlign: "center", maxWidth: "88vw" }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.5 }}
          >
            <span
              className="t-serif"
              style={{ fontSize: "13px", fontStyle: "italic", color: "rgba(242,236,224,0.75)" }}
            >
              {status === "reaching" && "Reaching across the distance…"}
              {status === "sent" && "They'll feel it 💗"}
              {status === "waiting" && `${partnerName} hasn't turned this on yet — they'll feel it once they do.`}
              {status === "failed" && "Couldn't send — try again"}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* First-run: pick which side of the gift this device is, then enable */}
      <AnimatePresence>
        {showEnable && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center px-6"
            style={{ background: "rgba(6,1,4,0.72)", backdropFilter: "blur(6px)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !enabling && setShowEnable(false)}
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[360px] rounded-[22px] px-7 py-7 flex flex-col gap-5"
              style={{
                background: "rgba(20, 3, 9, 0.94)",
                border: "1px solid rgba(184,148,74,0.24)",
                boxShadow: "0 24px 70px rgba(0,0,0,0.6)",
              }}
              initial={{ scale: 0.92, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.94, y: 12 }}
              transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <div className="flex flex-col gap-1.5">
                <span className="t-label" style={{ fontSize: "9px", letterSpacing: "0.26em" }}>
                  Stay close
                </span>
                <h2
                  className="t-display"
                  style={{ fontSize: "23px", fontStyle: "italic", color: "rgba(242,236,224,0.94)" }}
                >
                  Let them feel it when you miss them
                </h2>
                <p
                  className="t-serif"
                  style={{ fontSize: "13.5px", color: "rgba(242,236,224,0.6)", lineHeight: 1.6, marginTop: 4 }}
                >
                  Tap “I miss you” and a gentle notification reaches their phone. Turn it on so you get theirs too.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <label
                  className="t-label"
                  style={{ fontSize: "8.5px", letterSpacing: "0.24em", color: "rgba(184,148,74,0.7)" }}
                >
                  Which of you is this?
                </label>
                <div className="flex flex-col gap-2">
                  {(
                    [
                      ["recipient", names?.recipientName ?? "Me"],
                      ["giver", names?.giverName ?? "My love"],
                    ] as const
                  ).map(([role, label]) => (
                    <button
                      key={role}
                      onClick={() => setPicked(role)}
                      className="rounded-xl px-4 py-3 t-serif text-left"
                      style={{
                        background: picked === role ? "rgba(138,21,40,0.35)" : "rgba(255,255,255,0.04)",
                        border:
                          picked === role
                            ? "1px solid rgba(184,148,74,0.55)"
                            : "1px solid rgba(255,255,255,0.1)",
                        color: "rgba(242,236,224,0.92)",
                        fontSize: "15px",
                        cursor: "pointer",
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <span style={{ fontSize: "11px", color: "rgba(242,236,224,0.4)", lineHeight: 1.5 }}>
                  This phone will receive the other person’s hearts.
                </span>
              </div>

              {enableError && (
                <p className="t-serif" style={{ fontSize: "12px", color: "rgba(220,90,110,0.9)", lineHeight: 1.5 }}>
                  {enableError}
                </p>
              )}

              <div className="flex items-center gap-3 mt-1">
                <button
                  onClick={() => !enabling && setShowEnable(false)}
                  className="t-label"
                  style={{
                    fontSize: "10px",
                    letterSpacing: "0.16em",
                    color: "rgba(242,236,224,0.5)",
                    padding: "10px 14px",
                    cursor: "pointer",
                  }}
                >
                  Not now
                </button>
                <button
                  onClick={doEnable}
                  disabled={enabling || !picked}
                  className="flex-1 rounded-full t-label"
                  style={{
                    fontSize: "10px",
                    letterSpacing: "0.18em",
                    color: "rgba(255,248,240,0.95)",
                    padding: "13px 18px",
                    background: picked
                      ? "linear-gradient(90deg, rgba(138,21,40,0.95), rgba(184,80,74,0.9))"
                      : "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(184,148,74,0.3)",
                    cursor: enabling || !picked ? "default" : "pointer",
                    opacity: enabling ? 0.7 : 1,
                  }}
                >
                  {enabling ? "Turning on…" : "Turn on & allow"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
