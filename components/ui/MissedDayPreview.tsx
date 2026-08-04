"use client"
import { useState, useCallback, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useSceneStore } from "@/lib/store/sceneStore"

const MAX_PETALS = 40

// A hands-on preview of the "a petal falls every 3 hours" mechanic: every press
// drops one more petal onto the glass-dome floor, so pressing repeatedly lets
// you watch them accumulate without waiting real hours. Once all 40 have
// fallen, the next press clears the floor and starts over. Nothing is saved.
export function MissedDayPreview() {
  const phase          = useSceneStore((s) => s.phase)
  const universeMode = useSceneStore((s) => s.universeMode)
  const petalsFallen   = useSceneStore((s) => s.petalsFallen)
  const addFallenPetal = useSceneStore((s) => s.addFallenPetal)
  const setFallenPetals = useSceneStore((s) => s.setFallenPetals)

  const [caption, setCaption] = useState<null | "fall" | "reset">(null)
  const captionRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Belongs to the rose — hidden once the camera climbs to the constellation.
  const isVisible = phase === "IDLE" && universeMode === "rose"
  const allFallen = petalsFallen.length >= MAX_PETALS

  const preview = useCallback(() => {
    const fallen = useSceneStore.getState().petalsFallen
    if (fallen.length >= MAX_PETALS) {
      // Every petal is down — clear the floor and start the cycle again.
      setFallenPetals([])
      setCaption("reset")
    } else {
      // Drop the next petal — a real falling-leaf animation onto the dome floor.
      addFallenPetal(fallen.length)
      setCaption("fall")
    }
    if (captionRef.current) clearTimeout(captionRef.current)
    captionRef.current = setTimeout(() => setCaption(null), 2600)
  }, [addFallenPetal, setFallenPetals])

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
              cursor: "pointer",
              boxShadow: "inset 0 1px 0 rgba(255,248,240,0.06), 0 8px 24px rgba(0,0,0,0.5)",
            }}
            initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 8, filter: "blur(4px)" }}
            transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.6 }}
            whileHover={{ scale: 1.04, borderColor: "rgba(184,148,74,0.4)" }}
            whileTap={{ scale: 0.96 }}
          >
            <PetalIcon />
            <span
              className="t-label"
              style={{ fontSize: "9.5px", letterSpacing: "0.2em", color: "rgba(242,236,224,0.7)" }}
            >
              {allFallen ? "Clear the fallen petals" : "Preview a missed day"}
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Caption that appears as a petal drifts down (or the floor is cleared) */}
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
              {caption === "reset"
                ? "A new beginning — the petals return."
                : "Hours without you, and a petal falls."}
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
