"use client"
import { motion, AnimatePresence } from "framer-motion"
import { useSceneStore } from "@/lib/store/sceneStore"

const VIEWS = [
  { id: "close" as const,   label: "Near",   hint: "Close on the bloom" },
  { id: "default" as const, label: "Dome",   hint: "The whole dome" },
  { id: "wide" as const,    label: "Heavens", hint: "Pull back to the stars" },
]

export function ViewControls() {
  const phase = useSceneStore((s) => s.phase)
  const viewPreset = useSceneStore((s) => s.viewPreset)
  const setViewPreset = useSceneStore((s) => s.setViewPreset)

  const isVisible = phase === "IDLE"

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed right-6 top-1/2 z-30 flex flex-col gap-1.5"
          style={{ transform: "translateY(-50%)" }}
          initial={{ opacity: 0, x: 20, filter: "blur(8px)" }}
          animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, x: 14, filter: "blur(6px)" }}
          transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <span
            className="t-label mb-1 text-right"
            style={{
              fontSize: "9px",
              letterSpacing: "0.28em",
              color: "rgba(184,148,74,0.5)",
            }}
          >
            View
          </span>
          {VIEWS.map((v) => {
            const isActive = viewPreset === v.id
            return (
              <motion.button
                key={v.id}
                onClick={() => setViewPreset(v.id)}
                title={v.hint}
                className="flex items-center justify-end gap-2 px-4 py-2 rounded-full"
                style={{
                  background: isActive ? "rgba(138, 21, 40, 0.42)" : "rgba(8, 1, 6, 0.7)",
                  border: `1px solid ${isActive ? "rgba(184, 148, 74, 0.32)" : "rgba(184, 148, 74, 0.14)"}`,
                  backdropFilter: "blur(20px)",
                  boxShadow: "inset 0 1px 0 rgba(255,248,240,0.05), 0 6px 22px rgba(0,0,0,0.45)",
                  cursor: "pointer",
                }}
                whileHover={{ scale: 1.04, x: -2 }}
                whileTap={{ scale: 0.96 }}
              >
                <span
                  className="t-label"
                  style={{
                    fontSize: "10px",
                    letterSpacing: "0.2em",
                    color: isActive ? "rgba(242,236,224,0.92)" : "rgba(242,236,224,0.5)",
                    transition: "color 0.4s ease",
                  }}
                >
                  {v.label}
                </span>
                <span
                  className="w-1 h-1 rounded-full"
                  style={{
                    background: isActive ? "var(--gold)" : "rgba(184,148,74,0.35)",
                    boxShadow: isActive ? "0 0 6px rgba(184,148,74,0.8)" : "none",
                  }}
                />
              </motion.button>
            )
          })}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
