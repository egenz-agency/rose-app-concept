"use client"
import { useState, useCallback, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useSceneStore } from "@/lib/store/sceneStore"

// A non-destructive preview: drops a single petal from the rose so you can see
// exactly what happens when a day is missed (Beauty-&-the-Beast style), then
// quietly restores the rose. Nothing is saved.
export function MissedDayPreview() {
  const phase          = useSceneStore((s) => s.phase)
  const rose           = useSceneStore((s) => s.rose)
  const petalsFallen   = useSceneStore((s) => s.petalsFallen)
  const addFallenPetal = useSceneStore((s) => s.addFallenPetal)
  const setFallenPetals = useSceneStore((s) => s.setFallenPetals)

  const [busy, setBusy]   = useState(false)
  const [caption, setCaption] = useState(false)
  const resetRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isVisible = phase === "IDLE"
  const realFallen = Math.max(0, 40 - (rose?.petalsRemaining ?? 40))

  const preview = useCallback(() => {
    if (busy) return
    setBusy(true)
    setCaption(true)

    // Drop the next petal — a real falling-leaf animation in the 3D scene
    const next = petalsFallen.length
    if (next < 40) addFallenPetal(next)

    // Restore the rose to its true state after the petal has drifted away
    if (resetRef.current) clearTimeout(resetRef.current)
    resetRef.current = setTimeout(() => {
      setFallenPetals(Array.from({ length: realFallen }, (_, i) => i))
      setBusy(false)
      setCaption(false)
    }, 6500)
  }, [busy, petalsFallen.length, addFallenPetal, setFallenPetals, realFallen])

  return (
    <>
      <AnimatePresence>
        {isVisible && (
          <motion.button
            onClick={preview}
            className="fixed z-30 flex items-center gap-2.5 rounded-full px-4 py-2.5"
            style={{
              bottom: "120px",   /* stacked above the Preview-growth button */
              left: "20px",
              background: "rgba(8, 1, 6, 0.80)",
              border: "1px solid rgba(184, 148, 74, 0.22)",
              backdropFilter: "blur(20px)",
              cursor: busy ? "default" : "pointer",
              opacity: busy ? 0.6 : 1,
              boxShadow: "inset 0 1px 0 rgba(255,248,240,0.06), 0 8px 24px rgba(0,0,0,0.5)",
            }}
            initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
            animate={{ opacity: busy ? 0.6 : 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 8, filter: "blur(4px)" }}
            transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.6 }}
            whileHover={!busy ? { scale: 1.04, borderColor: "rgba(184,148,74,0.4)" } : {}}
            whileTap={!busy ? { scale: 0.96 } : {}}
          >
            <PetalIcon />
            <span
              className="t-label"
              style={{ fontSize: "9.5px", letterSpacing: "0.2em", color: "rgba(242,236,224,0.7)" }}
            >
              {busy ? "A petal falls…" : "Preview a missed day"}
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Caption that appears while the petal drifts down */}
      <AnimatePresence>
        {caption && (
          <motion.div
            className="fixed left-1/2 z-30 pointer-events-none"
            style={{ bottom: "16%", transform: "translateX(-50%)", textAlign: "center" }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <p
              className="t-display"
              style={{ fontSize: "clamp(18px, 3.5vw, 26px)", fontStyle: "italic", color: "rgba(242,236,224,0.82)" }}
            >
              A day without you, and a petal falls.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function PetalIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(184,148,74,0.8)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3c4 4 5 8 0 18C7 11 8 7 12 3z" />
    </svg>
  )
}
