"use client"
import { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useSceneStore } from "@/lib/store/sceneStore"
import { useNewStars } from "@/lib/constellation/useNewStars"
import { SparkleIcon } from "./Icons"

/**
 * "A new star has woken."
 *
 * Shown down at the rose, because that is where the waking happens — she tends
 * the flower, and something answers in the sky above it. It carries the way up
 * with it, and it stays out of the way of everything else at the bottom of the
 * screen by sitting just under the nav.
 *
 * The stars themselves keep pulsing until she goes and looks; this is only the
 * invitation, so it retires on its own after a while.
 */

const DWELL_MS = 9000

export function StarWokeToast() {
  const phase = useSceneStore((s) => s.phase)
  const universeMode = useSceneStore((s) => s.universeMode)
  const setUniverseMode = useSceneStore((s) => s.setUniverseMode)
  const magicActive = useSceneStore((s) => s.magicActive)
  const isEmergence = useSceneStore((s) => s.isEmergence)
  const activePanelId = useSceneStore((s) => s.activePanelId)
  const { count, markSeen } = useNewStars()

  const [dismissed, setDismissed] = useState(false)
  // Re-announce when the number of waiting stars changes, not on every render.
  const announced = useRef(-1)

  useEffect(() => {
    if (count > 0 && count !== announced.current) {
      announced.current = count
      setDismissed(false)
    }
    if (count === 0) announced.current = -1
  }, [count])

  // Retire on its own — the pulsing stars are the lasting reminder.
  useEffect(() => {
    if (dismissed || count === 0) return
    const t = window.setTimeout(() => setDismissed(true), DWELL_MS)
    return () => window.clearTimeout(t)
  }, [dismissed, count])

  // Going up to look is what marks them seen.
  useEffect(() => {
    if (universeMode === "rose") return
    const t = window.setTimeout(markSeen, 1200)
    return () => window.clearTimeout(t)
  }, [universeMode, markSeen])

  const visible =
    count > 0 &&
    !dismissed &&
    phase === "IDLE" &&
    universeMode === "rose" &&
    !magicActive &&
    !isEmergence &&
    activePanelId === null

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          onClick={() => {
            setDismissed(true)
            setUniverseMode("ascending")
          }}
          className="fixed z-30 flex items-center gap-3 rounded-full pl-5 pr-4 py-3"
          style={{
            top: "84px",
            left: "50%",
            x: "-50%",
            background: "rgba(8,1,6,0.78)",
            border: "1px solid rgba(184,148,74,0.28)",
            backdropFilter: "blur(20px)",
            boxShadow: "inset 0 1px 0 rgba(255,248,240,0.07), 0 12px 34px rgba(0,0,0,0.55)",
            cursor: "pointer",
          }}
          initial={{ opacity: 0, y: -14, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -10, filter: "blur(5px)" }}
          transition={{ type: "spring", stiffness: 140, damping: 20 }}
          whileHover={{ y: -1, borderColor: "rgba(184,148,74,0.45)" }}
          whileTap={{ scale: 0.98 }}
        >
          <motion.span
            className="flex items-center justify-center"
            animate={{ opacity: [0.55, 1, 0.55] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
          >
            <SparkleIcon size={14} color="rgba(255,214,150,0.95)" />
          </motion.span>

          <span
            className="t-serif"
            style={{ fontSize: "14px", color: "rgba(242,236,224,0.9)", letterSpacing: "0.02em" }}
          >
            {count === 1
              ? "A new star has woken in your sky."
              : `${count} new stars have woken in your sky.`}
          </span>

          <span
            className="t-label shrink-0"
            style={{
              fontSize: "8.5px",
              letterSpacing: "0.2em",
              color: "rgba(201,168,76,0.9)",
              paddingLeft: "4px",
            }}
          >
            Look up
          </span>
        </motion.button>
      )}
    </AnimatePresence>
  )
}
