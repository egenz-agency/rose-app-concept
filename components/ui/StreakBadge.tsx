"use client"
import { motion, AnimatePresence } from "framer-motion"
import { useSceneStore } from "@/lib/store/sceneStore"

// A small, always-visible streak indicator floating just above the rose while
// idle. Shows the number of consecutive days she has tended it.
function Heart() {
  return (
    <motion.span
      style={{ fontSize: 15, lineHeight: 1, display: "inline-block", transformOrigin: "center" }}
      animate={{ scale: [1, 1.18, 0.98, 1.1, 1] }}
      transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      aria-hidden
    >
      ❤️
    </motion.span>
  )
}

export function StreakBadge() {
  const phase  = useSceneStore((s) => s.phase)
  const streak = useSceneStore((s) => s.rose?.streakDays ?? 0)

  const show = phase === "IDLE"

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed left-1/2 z-20 pointer-events-none"
          style={{ top: 84, transform: "translateX(-50%)" }}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.7, delay: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <div
            style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "8px 18px", borderRadius: 999,
              background: "rgba(8,1,6,0.5)",
              border: "1px solid rgba(184,148,74,0.22)",
              backdropFilter: "blur(14px)",
              boxShadow: "inset 0 1px 0 rgba(255,248,240,0.06), 0 8px 28px rgba(0,0,0,0.45)",
            }}
          >
            <Heart />
            <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 17, lineHeight: 1, color: "rgba(242,236,224,0.92)" }}>
              {streak}
            </span>
            <span style={{ fontFamily: "'EB Garamond', serif", fontSize: 9, letterSpacing: "0.24em", textTransform: "uppercase", color: "rgba(184,148,74,0.72)" }}>
              day{streak !== 1 ? "s" : ""} streak
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
