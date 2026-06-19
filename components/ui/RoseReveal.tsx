"use client"
import { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useSceneStore } from "@/lib/store/sceneStore"

// Plays after the video ends — grows the rose from bud to bloom
// before the Instructions panel appears.
const GROW_DURATION_MS = 8500   // total grow time — stretched to breathe
const TARGET_PETALS    = 32     // show a "grown but not complete" rose
const TICK_MS          = 60     // how often we increment petals

const COPY_SEQUENCE = [
  { delay: 0,    text: null },
  { delay: 1400, text: "She is waking…" },
  { delay: 4000, text: "Still alive." },
  { delay: 6800, text: "She is yours." },
]

export function RoseReveal() {
  const phase               = useSceneStore((s) => s.phase)
  const setPhase            = useSceneStore((s) => s.setPhase)
  const setSimulationPetals = useSceneStore((s) => s.setSimulationPetals)

  const [line, setLine]         = useState<string | null>(null)
  const [exiting, setExiting]   = useState(false)
  const tickRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const copyRefs = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    if (phase !== "ROSE_REVEAL") return

    // Start rose at 0 petals
    setSimulationPetals(0)

    // Grow petals incrementally over GROW_DURATION_MS
    let current = 0
    const steps = GROW_DURATION_MS / TICK_MS
    const increment = TARGET_PETALS / steps

    tickRef.current = setInterval(() => {
      current = Math.min(current + increment, TARGET_PETALS)
      setSimulationPetals(Math.round(current))
      if (current >= TARGET_PETALS) {
        clearInterval(tickRef.current!)
        tickRef.current = null
      }
    }, TICK_MS)

    // Copy text sequence
    COPY_SEQUENCE.forEach(({ delay, text }) => {
      const t = setTimeout(() => setLine(text), delay)
      copyRefs.current.push(t)
    })

    // After grow completes, pause briefly then exit
    const exitTimer = setTimeout(() => {
      setExiting(true)
      setTimeout(() => {
        setSimulationPetals(null)      // hand back to real petal data
        setExiting(false)
        setLine(null)
        setPhase("INSTRUCTIONS")
      }, 1400)
    }, GROW_DURATION_MS + 800)

    copyRefs.current.push(exitTimer)

    return () => {
      if (tickRef.current) clearInterval(tickRef.current)
      copyRefs.current.forEach(clearTimeout)
      copyRefs.current = []
    }
  }, [phase, setPhase, setSimulationPetals])

  const isActive = phase === "ROSE_REVEAL"

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          className="fixed inset-0 z-40 flex flex-col items-center justify-center pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: exiting ? 0 : 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.0, ease: [0.32, 0.72, 0, 1] }}
        >
          {/* Dark vignette overlay — lets 3D scene show through */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "radial-gradient(ellipse at center, rgba(8,1,6,0.2) 0%, rgba(8,1,6,0.75) 100%)",
              pointerEvents: "none",
            }}
          />

          {/* Text line */}
          <AnimatePresence mode="wait">
            {line && (
              <motion.p
                key={line}
                className="t-display glow-crimson relative z-10"
                style={{
                  position: "absolute",
                  bottom: "14%",
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: "100%",
                  fontSize: "clamp(22px, 4.5vw, 38px)",
                  fontStyle: "italic",
                  color: "rgba(242, 236, 224, 0.88)",
                  letterSpacing: "-0.01em",
                  textAlign: "center",
                  padding: "0 2rem",
                }}
                initial={{ opacity: 0, y: 20, filter: "blur(12px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -8, filter: "blur(8px)" }}
                transition={{ duration: 1.6, ease: [0.25, 0.46, 0.45, 0.94] }}
              >
                {line}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Subtle gold particle shimmer at the bottom */}
          <div
            className="relative z-10"
            style={{
              position: "absolute",
              bottom: "6%",
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              gap: "6px",
            }}
          >
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                style={{
                  width: "3px",
                  height: "3px",
                  borderRadius: "50%",
                  background: "rgba(184,148,74,0.6)",
                }}
                animate={{ opacity: [0.2, 0.8, 0.2], y: [0, -6, 0] }}
                transition={{
                  duration: 1.8,
                  repeat: Infinity,
                  delay: i * 0.4,
                  ease: "easeInOut",
                }}
              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
