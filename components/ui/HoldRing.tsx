"use client"
import { motion, AnimatePresence } from "framer-motion"

interface HoldRingProps {
  progress: number // 0 – 1
}

const R  = 88
const CIRC = 2 * Math.PI * R

export function HoldRing({ progress }: HoldRingProps) {
  const dashOffset = CIRC * (1 - progress)
  const visible    = progress > 0.01

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 flex items-center justify-center pointer-events-none"
          style={{ zIndex: 25 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.4 } }}
        >
          <svg
            width="220"
            height="220"
            viewBox="0 0 220 220"
            style={{ filter: `drop-shadow(0 0 ${Math.round(progress * 24)}px rgba(201,168,76,${(0.3 + progress * 0.5).toFixed(2)}))` }}
          >
            {/* Background track */}
            <circle
              cx="110" cy="110" r={R}
              fill="none"
              stroke="rgba(184,148,74,0.08)"
              strokeWidth="1"
            />
            {/* Progress arc */}
            <circle
              cx="110" cy="110" r={R}
              fill="none"
              stroke="#c9a84c"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeDasharray={CIRC}
              strokeDashoffset={dashOffset}
              transform="rotate(-90 110 110)"
              style={{ transition: "stroke-dashoffset 0.016s linear" }}
            />
            {/* Centre pulse dot */}
            <circle
              cx="110" cy="110" r={4 + progress * 4}
              fill={`rgba(201,168,76,${(0.15 + progress * 0.5).toFixed(2)})`}
            />
          </svg>
          {/* "Hold…" label — fades in after a short delay */}
          <motion.p
            className="absolute"
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: "11px",
              letterSpacing: "0.26em",
              textTransform: "uppercase",
              color: `rgba(184,148,74,${(0.3 + progress * 0.5).toFixed(2)})`,
              marginTop: "140px",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {progress < 0.99 ? "Hold…" : ""}
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
