"use client"
import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useSceneStore } from "@/lib/store/sceneStore"
import { LetterPaper, RoseCrest, LetterDivider } from "./LetterPaper"

// A scheduled letter/moment, revealed as a wax-sealed envelope that opens: the
// flap lifts, the letter rises out, and the message is shown on cream paper.
export function MomentPanel() {
  const moment          = useSceneStore((s) => s.activeMoment)
  const setActiveMoment = useSceneStore((s) => s.setActiveMoment)
  const [opened, setOpened] = useState(false)

  // Reset to "closed envelope" whenever a new moment arrives — she taps to open.
  useEffect(() => {
    if (!moment) return
    setOpened(false)
  }, [moment])

  const close = () => setActiveMoment(null)
  const hasMedia = !!(moment?.photo_url || moment?.video_url)

  return (
    <AnimatePresence>
      {moment && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-center justify-center px-5"
          style={{ background: "rgba(8,1,6,0.9)", backdropFilter: "blur(10px)", perspective: 1200 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.5 } }}
          onClick={(e) => { if (e.target === e.currentTarget && opened) close() }}
        >
          {!opened ? (
            // ── Closed envelope ───────────────────────────────────────────
            <motion.button
              onClick={() => setOpened(true)}
              initial={{ opacity: 0, scale: 0.8, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: [0, -8, 0] }}
              transition={{ opacity: { duration: 0.5 }, scale: { duration: 0.5 }, y: { duration: 3, repeat: Infinity, ease: "easeInOut" } }}
              style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}
            >
              <Envelope sealed />
              <span style={{ fontFamily: "'EB Garamond', serif", fontSize: 13, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(232,200,130,0.8)" }}>
                A letter for you — tap to open
              </span>
            </motion.button>
          ) : (
            // ── Opened letter ─────────────────────────────────────────────
            <motion.div
              className="w-full"
              style={{ maxWidth: 440, maxHeight: "86dvh" }}
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: -10 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* The flap lifting + paper rising */}
              <motion.div
                style={{ position: "relative", display: "flex", justifyContent: "center", marginBottom: -14 }}
                initial={{ rotateX: 0, opacity: 1 }}
                animate={{ rotateX: -165, opacity: 0 }}
                transition={{ duration: 0.5, ease: "easeIn" }}
              >
                <Flap />
              </motion.div>

              <motion.div
                initial={{ y: 28, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.25, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              >
                <LetterPaper maxHeight="82dvh">
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 9, marginBottom: 18 }}>
                    <RoseCrest />
                    <p style={{ fontFamily: "'EB Garamond', serif", fontSize: 10, letterSpacing: "0.34em", textTransform: "uppercase", color: "rgba(120,30,45,0.6)" }}>
                      My dearest
                    </p>
                  </div>

                  {moment.photo_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={moment.photo_url} alt="" style={{ width: "100%", borderRadius: 10, marginBottom: 16, border: "1px solid rgba(120,30,45,0.18)" }} />
                  )}
                  {moment.video_url && (
                    <video src={moment.video_url} controls playsInline style={{ width: "100%", borderRadius: 10, marginBottom: 16, background: "#000" }} />
                  )}

                  {moment.message && (
                    <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 21, lineHeight: 1.62, color: "#3a2418", fontStyle: "italic", whiteSpace: "pre-wrap", textAlign: "center" }}>
                      {moment.message}
                    </p>
                  )}

                  {moment.title && (
                    <>
                      <div style={{ marginTop: 20 }}><LetterDivider /></div>
                      <p style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontSize: 19, color: "#6e1228", textAlign: "right", marginTop: 10 }}>
                        — {moment.title}
                      </p>
                    </>
                  )}

                  <button
                    onClick={close}
                    className="w-full rounded-full"
                    style={{
                      marginTop: hasMedia ? 18 : 26, padding: "12px",
                      background: "linear-gradient(135deg, #8a1528, #640c1c)",
                      border: "1px solid rgba(184,148,74,0.4)", color: "#f6eeda",
                      fontFamily: "'EB Garamond', serif", fontSize: 14, letterSpacing: "0.08em", cursor: "pointer",
                    }}
                  >
                    Close
                  </button>
                </LetterPaper>
              </motion.div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// The envelope body with a sealed flap (closed state).
export function Envelope({ sealed }: { sealed?: boolean }) {
  return (
    <div style={{ position: "relative", width: 280, height: 188, filter: "drop-shadow(0 24px 50px rgba(0,0,0,0.55))" }}>
      {/* body */}
      <div style={{ position: "absolute", inset: 0, borderRadius: 12, background: "linear-gradient(160deg, #7a1430 0%, #5e0f1e 100%)", border: "1px solid rgba(184,148,74,0.45)" }} />
      {/* bottom pocket fold */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 110, background: "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.18) 100%)", clipPath: "polygon(0 100%, 50% 30%, 100% 100%)", borderRadius: 12 }} />
      {/* closed flap (triangle pointing down) */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 104, background: "linear-gradient(160deg, #8a1730 0%, #6e1226 100%)", clipPath: "polygon(0 0, 100% 0, 50% 100%)", borderTop: "1px solid rgba(184,148,74,0.5)" }} />
      {/* wax seal */}
      {sealed && (
        <div style={{ position: "absolute", top: 64, left: "50%", transform: "translateX(-50%)", width: 46, height: 46, borderRadius: "50%", background: "radial-gradient(circle at 35% 30%, #b8344e, #7c1226 70%)", border: "1px solid rgba(184,148,74,0.55)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(0,0,0,0.4)" }}>
          <span style={{ color: "rgba(246,238,218,0.85)", fontSize: 20, lineHeight: 1 }}>❀</span>
        </div>
      )}
    </div>
  )
}

// Just the flap, used during the opening transition.
export function Flap() {
  return (
    <div style={{ width: 280, height: 104, transformOrigin: "top center", clipPath: "polygon(0 0, 100% 0, 50% 100%)", background: "linear-gradient(160deg, #8a1730 0%, #6e1226 100%)", border: "1px solid rgba(184,148,74,0.5)" }} />
  )
}
