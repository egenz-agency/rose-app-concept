"use client"
import { motion, AnimatePresence } from "framer-motion"
import { useSceneStore } from "@/lib/store/sceneStore"
import { ArrowRightIcon, SparkleIcon } from "./Icons"

const STEPS = [
  "Visit every day and the rose stays in full bloom",
  "Miss a day — one petal falls and remains on the ground",
  "Three revivals keep the rose from fading forever",
  "Unlock letters, stars, and a garden as you return",
]

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.09, delayChildren: 0.35 } } }
const item    = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] } } }

export function InstructionsPanel() {
  const phase         = useSceneStore((s) => s.phase)
  const setPhase      = useSceneStore((s) => s.setPhase)
  const setIsEmergence = useSceneStore((s) => s.setIsEmergence)

  return (
    <AnimatePresence>
      {phase === "INSTRUCTIONS" && (
        <motion.div
          className="fixed inset-0 z-40 flex items-center justify-center px-5"
          style={{ background: "rgba(8, 1, 6, 0.58)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.9 } }}
        >
          <motion.div
            className="w-full max-w-[360px]"
            initial={{ opacity: 0, scale: 0.94, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -8 }}
            transition={{ duration: 0.65, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            {/* Double-bezel card */}
            <div className="glass-bezel rounded-[28px]">
              <div className="glass-bezel-inner rounded-[27px] px-7 py-8 flex flex-col gap-6">

                {/* Header */}
                <motion.div
                  className="flex flex-col gap-3"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
                >
                  <motion.div
                    initial={{ scale: 0.6, opacity: 0, rotate: -15 }}
                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                    transition={{ delay: 0.08, duration: 0.8, ease: [0.34, 1.56, 0.64, 1] }}
                  >
                    <svg width="36" height="44" viewBox="0 0 32 44" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ filter: "drop-shadow(0 0 10px rgba(200,40,60,0.5))" }}>
                      <line x1="16" y1="22" x2="16" y2="44" stroke="rgba(138,21,40,0.6)" strokeWidth="1.25" strokeLinecap="round"/>
                      <path d="M16 32 Q10 28 10 22" stroke="rgba(138,21,40,0.5)" strokeWidth="1.1" fill="none" strokeLinecap="round"/>
                      <path d="M16 32 Q22 28 22 22" stroke="rgba(138,21,40,0.5)" strokeWidth="1.1" fill="none" strokeLinecap="round"/>
                      <path d="M16 8 C16 4 20 2 22 5 C24 8 21 13 16 14" fill="rgba(138,21,40,0.25)" stroke="rgba(138,21,40,0.45)" strokeWidth="1"/>
                      <path d="M16 8 C16 4 12 2 10 5 C8 8 11 13 16 14" fill="rgba(138,21,40,0.25)" stroke="rgba(138,21,40,0.45)" strokeWidth="1"/>
                      <path d="M16 8 C20 7 24 10 23 14 C22 18 17 19 16 18" fill="rgba(138,21,40,0.3)" stroke="rgba(138,21,40,0.5)" strokeWidth="1"/>
                      <path d="M16 8 C12 7 8 10 9 14 C10 18 15 19 16 18" fill="rgba(138,21,40,0.3)" stroke="rgba(138,21,40,0.5)" strokeWidth="1"/>
                      <path d="M16 10 C19 9 22 12 21 16 C20 20 17 21 16 20 C15 21 12 20 11 16 C10 12 13 9 16 10Z" fill="rgba(138,21,40,0.55)" stroke="rgba(200,40,60,0.7)" strokeWidth="1.1"/>
                      <circle cx="16" cy="14" r="3.5" fill="rgba(180,30,50,0.7)" stroke="rgba(220,60,80,0.8)" strokeWidth="1"/>
                      <circle cx="16" cy="14" r="1.5" fill="rgba(220,60,80,0.8)"/>
                    </svg>
                  </motion.div>

                  <div className="flex flex-col gap-2">
                    <span className="t-label" style={{ fontSize: "9px", letterSpacing: "0.3em" }}>
                      An enchanted gift for you
                    </span>
                    <h1
                      className="t-display glow-crimson"
                      style={{ fontSize: "32px", lineHeight: 1.08 }}
                    >
                      The rose is yours.
                    </h1>
                    <p className="t-serif" style={{ fontSize: "15px", color: "rgba(242,236,224,0.52)" }}>
                      Care for it each day and it will bloom forever.
                    </p>
                  </div>
                </motion.div>

                {/* Steps */}
                <motion.ul
                  className="flex flex-col gap-3"
                  variants={stagger}
                  initial="hidden"
                  animate="show"
                >
                  {STEPS.map((s, i) => (
                    <motion.li
                      key={i}
                      variants={item}
                      className="flex items-start gap-3"
                    >
                      <div style={{ marginTop: "3px", flexShrink: 0 }}>
                        <SparkleIcon size={11} color="rgba(184,148,74,0.65)" />
                      </div>
                      <span
                        className="t-serif"
                        style={{ fontSize: "14.5px", lineHeight: 1.55, color: "rgba(242,236,224,0.6)" }}
                      >
                        {s}
                      </span>
                    </motion.li>
                  ))}
                </motion.ul>

                {/* Divider */}
                <div style={{ height: "1px", background: "linear-gradient(to right, transparent, rgba(184,148,74,0.18), transparent)" }} />

                {/* CTA */}
                <motion.button
                  onClick={() => { setIsEmergence(true); setPhase("IDLE") }}
                  className="group w-full rounded-full flex items-center justify-between px-6 py-3.5 relative overflow-hidden"
                  style={{
                    background: "linear-gradient(135deg, rgba(138,21,40,0.9), rgba(100,12,28,0.95))",
                    border: "1px solid rgba(184, 148, 74, 0.28)",
                    cursor: "pointer",
                  }}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.85, duration: 0.5 }}
                  whileHover={{ scale: 1.015 }}
                  whileTap={{ scale: 0.975 }}
                >
                  {/* Shimmer sweep */}
                  <motion.div
                    className="absolute inset-0 pointer-events-none"
                    style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)", x: "-100%" }}
                    animate={{ x: ["-100%", "200%"] }}
                    transition={{ duration: 2.8, repeat: Infinity, repeatDelay: 1.2, ease: "linear" }}
                  />

                  <span
                    className="t-serif"
                    style={{ fontSize: "15px", color: "rgba(242,236,224,0.88)", letterSpacing: "0.06em" }}
                  >
                    Begin the magic
                  </span>

                  {/* Button-in-button arrow */}
                  <motion.div
                    className="w-7 h-7 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(255,255,255,0.08)" }}
                    animate={{ x: [0, 2, 0] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <ArrowRightIcon size={13} color="rgba(242,236,224,0.7)" />
                  </motion.div>
                </motion.button>

              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
