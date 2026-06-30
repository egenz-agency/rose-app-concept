"use client"
import { motion, AnimatePresence } from "framer-motion"
import { useSceneStore } from "@/lib/store/sceneStore"

// A small, always-visible streak indicator floating just above the rose while
// idle. Shows the number of consecutive days she has tended it.
function Flame() {
  return (
    <motion.svg
      width="14" height="17" viewBox="0 0 14 17" fill="none"
      style={{ transformOrigin: "center bottom" }}
      animate={{ scaleY: [1, 1.12, 0.97, 1.06, 1], scaleX: [1, 0.96, 1.03, 0.98, 1] }}
      transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
    >
      <defs>
        <linearGradient id="streakFlame" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e8c882" />
          <stop offset="0.55" stopColor="#d4564e" />
          <stop offset="1" stopColor="#8a1528" />
        </linearGradient>
      </defs>
      <path d="M7 0.5 C7.2 4 11 5.2 11 9.4 A4 4 0 0 1 3 9.4 C3 7 4.6 6.6 4.8 4.6 C5.4 6.4 7 6 7 0.5Z" fill="url(#streakFlame)" />
      <path d="M7 8 C7.2 9.6 8.4 10 8.4 11.6 A1.5 1.5 0 0 1 5.6 11.6 C5.6 10.6 6.6 10.4 7 8Z" fill="rgba(255,238,200,0.85)" />
    </motion.svg>
  )
}

export function StreakBadge() {
  const phase  = useSceneStore((s) => s.phase)
  const streak = useSceneStore((s) => s.rose?.streakDays ?? 0)

  const show = phase === "IDLE" && streak > 0

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
            <Flame />
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
