"use client"
import { useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useSceneStore } from "@/lib/store/sceneStore"
import { useConstellation } from "@/lib/constellation/useConstellation"

/**
 * The arrival cinematic.
 *
 * The first time she reaches the sky, the camera flies around the constellation
 * while it is shown **finished** — every star warm, every connection drawn. It is
 * a vision of what the two of them are building, not a state she has earned, and
 * it fades back to the single lit star before she is handed the controls.
 *
 * The camera choreography lives in `ConstellationCamera`; this owns when it plays,
 * the words over it, and the way out.
 */

const STORAGE_PREFIX = "rose_sky_overture_v1:"

/**
 * One line per beat of the camera's choreography. The camera emits the beat, so
 * the words follow the shot rather than a wall clock — they cannot drift apart
 * on a slow device or a throttled tab.
 */
const CAPTIONS = [
  "One day, your sky will look like this.",
  "Every star, a memory the two of you kept.",
  "For now, it is waiting for you.",
] as const

function seen(seed: string): boolean {
  try {
    return localStorage.getItem(STORAGE_PREFIX + seed) === "1"
  } catch {
    return false
  }
}

export function ConstellationOverture() {
  const universeMode = useSceneStore((s) => s.universeMode)
  const overtureActive = useSceneStore((s) => s.overtureActive)
  const setOvertureActive = useSceneStore((s) => s.setOvertureActive)
  const setVisionActive = useSceneStore((s) => s.setVisionActive)
  const overtureBeat = useSceneStore((s) => s.overtureBeat)
  const { seed } = useConstellation()

  const timers = useRef<number[]>([])

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t))
    timers.current = []
  }

  // Play once the flight has landed, the first time only.
  //
  // The only guard is `seen()`, deliberately: a ref guard here would break under
  // StrictMode's double-invoke, where the cleanup cancels the pending timer and a
  // ref would then block it ever being rescheduled. Re-running this effect is
  // safe — it just re-arms the same single timer.
  useEffect(() => {
    if (universeMode !== "universe") return
    if (seen(seed)) return

    const begin = window.setTimeout(() => {
      setVisionActive(true)
      setOvertureActive(true)
    }, 500)
    timers.current.push(begin)

    return clearTimers
  }, [universeMode, seed, setOvertureActive, setVisionActive])

  // Mark it watched the moment it plays, so an interrupted first visit doesn't
  // replay it forever. Re-watching is a deliberate act, not an accident.
  useEffect(() => {
    if (!overtureActive) return
    try {
      localStorage.setItem(STORAGE_PREFIX + seed, "1")
    } catch {
      // Storage blocked — it simply plays again next time.
    }
  }, [overtureActive, seed])

  // Leaving the sky mid-cinematic tears it all down.
  useEffect(() => {
    if (universeMode === "rose") {
      clearTimers()
      setOvertureActive(false)
      setVisionActive(false)
    }
  }, [universeMode, setOvertureActive, setVisionActive])

  useEffect(() => () => clearTimers(), [])

  const skip = () => {
    clearTimers()
    setOvertureActive(false)
    setVisionActive(false)
  }

  const caption = overtureActive ? (CAPTIONS[overtureBeat] ?? null) : null

  return (
    <AnimatePresence>
      {overtureActive && (
        <motion.div
          key="overture"
          className="fixed inset-0 z-40 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
        >
          {/* Letterbox bars — the only signal that this is a scripted moment */}
          <motion.div
            className="absolute inset-x-0 top-0"
            style={{ background: "linear-gradient(to bottom, rgba(4,0,3,0.85), transparent)" }}
            initial={{ height: 0 }}
            animate={{ height: 74 }}
            exit={{ height: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          />
          <motion.div
            className="absolute inset-x-0 bottom-0"
            style={{ background: "linear-gradient(to top, rgba(4,0,3,0.9), transparent)" }}
            initial={{ height: 0 }}
            animate={{ height: 128 }}
            exit={{ height: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          />

          {/* A plain crossfade, deliberately not `mode="wait"`: the incoming line
              must never be held hostage by the outgoing one's exit animation. */}
          <AnimatePresence>
            {caption && (
              <motion.p
                key={caption}
                className="absolute t-display text-center"
                style={{
                  bottom: "58px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  fontSize: "21px",
                  fontStyle: "italic",
                  color: "rgba(255,232,196,0.92)",
                  textShadow: "0 0 30px rgba(255,200,120,0.35), 0 2px 18px rgba(0,0,0,0.8)",
                  maxWidth: "84vw",
                  whiteSpace: "nowrap",
                }}
                initial={{ opacity: 0, y: 10, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
                transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              >
                {caption}
              </motion.p>
            )}
          </AnimatePresence>

          <motion.button
            onClick={skip}
            className="absolute pointer-events-auto rounded-full px-4 py-2"
            style={{
              bottom: "26px",
              right: "20px",
              background: "rgba(8,1,6,0.5)",
              border: "1px solid rgba(255,255,255,0.09)",
              backdropFilter: "blur(16px)",
              cursor: "pointer",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.6, duration: 0.7 }}
            whileHover={{ borderColor: "rgba(184,148,74,0.32)" }}
            whileTap={{ scale: 0.97 }}
          >
            <span
              className="t-label"
              style={{ fontSize: "8.5px", letterSpacing: "0.22em", color: "rgba(242,236,224,0.5)" }}
            >
              Skip
            </span>
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
