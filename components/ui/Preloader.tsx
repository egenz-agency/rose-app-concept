"use client"
import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

export function Preloader({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = useState(0)
  const [gone, setGone] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const iv = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(iv)
          // Wait for her tap — a real user gesture so the intro video can play
          // immediately WITH sound (browsers block unmuted autoplay otherwise).
          setTimeout(() => setReady(true), 400)
          return 100
        }
        return Math.min(100, p + Math.random() * 14)
      })
    }, 80)
    return () => clearInterval(iv)
  }, [])

  const enter = () => {
    if (!ready || gone) return
    setGone(true)
    setTimeout(onComplete, 900)
  }

  return (
    <AnimatePresence>
      {!gone && (
        <motion.div
          onClick={enter}
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-10"
          style={{ background: "#080106", cursor: ready ? "pointer" : "default" }}
          exit={{ opacity: 0, transition: { duration: 1.1, ease: [0.32, 0.72, 0, 1] } }}
        >
          {/* Animated rose icon */}
          <motion.div
            animate={{ opacity: [0.3, 0.85, 0.3] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}
          >
            {/* SVG rose mark */}
            <svg width="32" height="44" viewBox="0 0 32 44" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Stem */}
              <line x1="16" y1="22" x2="16" y2="44" stroke="rgba(138,21,40,0.6)" strokeWidth="1.25" strokeLinecap="round"/>
              {/* Left leaf */}
              <path d="M16 32 Q10 28 10 22" stroke="rgba(138,21,40,0.5)" strokeWidth="1.1" fill="none" strokeLinecap="round"/>
              {/* Right leaf */}
              <path d="M16 32 Q22 28 22 22" stroke="rgba(138,21,40,0.5)" strokeWidth="1.1" fill="none" strokeLinecap="round"/>
              {/* Back petals */}
              <path d="M16 8 C16 4 20 2 22 5 C24 8 21 13 16 14" fill="rgba(138,21,40,0.25)" stroke="rgba(138,21,40,0.45)" strokeWidth="1"/>
              <path d="M16 8 C16 4 12 2 10 5 C8 8 11 13 16 14" fill="rgba(138,21,40,0.25)" stroke="rgba(138,21,40,0.45)" strokeWidth="1"/>
              <path d="M16 8 C20 7 24 10 23 14 C22 18 17 19 16 18" fill="rgba(138,21,40,0.3)" stroke="rgba(138,21,40,0.5)" strokeWidth="1"/>
              <path d="M16 8 C12 7 8 10 9 14 C10 18 15 19 16 18" fill="rgba(138,21,40,0.3)" stroke="rgba(138,21,40,0.5)" strokeWidth="1"/>
              {/* Front petals */}
              <path d="M16 10 C19 9 22 12 21 16 C20 20 17 21 16 20 C15 21 12 20 11 16 C10 12 13 9 16 10Z" fill="rgba(138,21,40,0.55)" stroke="rgba(200,40,60,0.7)" strokeWidth="1.1"/>
              {/* Center */}
              <circle cx="16" cy="14" r="3.5" fill="rgba(180,30,50,0.7)" stroke="rgba(220,60,80,0.8)" strokeWidth="1"/>
              <circle cx="16" cy="14" r="1.5" fill="rgba(220,60,80,0.8)"/>
            </svg>
          </motion.div>

          <div className="flex flex-col items-center gap-4">
            {ready ? (
              <motion.span
                className="t-label"
                style={{ fontSize: "10px", letterSpacing: "0.34em", color: "rgba(184,148,74,0.85)" }}
                animate={{ opacity: [0.45, 1, 0.45] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
              >
                Tap to begin
              </motion.span>
            ) : (
              <span
                className="t-label"
                style={{ fontSize: "9px", letterSpacing: "0.32em", color: "rgba(184,148,74,0.55)" }}
              >
                Awakening the rose
              </span>
            )}

            {/* Progress track */}
            <div
              style={{
                width: "120px",
                height: "1px",
                background: "rgba(255,255,255,0.05)",
                borderRadius: "1px",
                overflow: "hidden",
              }}
            >
              <motion.div
                style={{
                  height: "100%",
                  background: "linear-gradient(90deg, rgba(138,21,40,0.8), rgba(184,148,74,0.9))",
                  borderRadius: "1px",
                  boxShadow: "0 0 8px rgba(184,148,74,0.4)",
                  width: `${Math.min(progress, 100)}%`,
                }}
                transition={{ duration: 0.12, ease: "linear" }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
