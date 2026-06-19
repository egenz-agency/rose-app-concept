"use client"
import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useSceneStore } from "@/lib/store/sceneStore"
import { SproutIcon, CloseIcon, PlayIcon, ArrowRightIcon } from "./Icons"

// Five stages of the rose lifecycle
const STAGES = [
  { petals: 40, label: "Full bloom",    sub: "Every petal in place. The rose at its most alive.", color: "#a01835" },
  { petals: 30, label: "Flourishing",   sub: "Still radiant. One week of care shows.", color: "#8a1528" },
  { petals: 20, label: "Fading",        sub: "She has missed some days. The rose grows quiet.", color: "#6a1020" },
  { petals: 10, label: "Withering",     sub: "Only ten petals remain. The dome grows cold.", color: "#3a0812" },
  { petals: 0,  label: "Asleep",        sub: "All petals have fallen. The rose waits to be revived.", color: "#1a0408" },
]

export function GrowthSimulator() {
  const phase               = useSceneStore((s) => s.phase)
  const setSimulationPetals = useSceneStore((s) => s.setSimulationPetals)
  const [open, setOpen]     = useState(false)
  const [stage, setStage]   = useState(0)
  const [playing, setPlaying] = useState(false)
  const playRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const isVisible = phase === "IDLE" || phase === "CARING"

  // Sync 3D scene to current stage
  useEffect(() => {
    if (open) setSimulationPetals(STAGES[stage].petals)
    else      setSimulationPetals(null)
  }, [open, stage, setSimulationPetals])

  // Cleanup on unmount
  useEffect(() => () => { setSimulationPetals(null) }, [setSimulationPetals])

  // Auto-play through stages
  const handlePlay = () => {
    if (playing) {
      if (playRef.current) clearInterval(playRef.current)
      setPlaying(false)
      return
    }
    setPlaying(true)
    setStage(0)
    let i = 0
    playRef.current = setInterval(() => {
      i++
      if (i >= STAGES.length) {
        clearInterval(playRef.current!)
        setPlaying(false)
        return
      }
      setStage(i)
    }, 1800)
  }

  const handleClose = () => {
    if (playRef.current) clearInterval(playRef.current)
    setPlaying(false)
    setOpen(false)
  }

  const current = STAGES[stage]

  return (
    <>
      {/* Trigger button — bottom left, above the Next.js dev badge */}
      <AnimatePresence>
        {isVisible && !open && (
          <motion.button
            onClick={() => setOpen(true)}
            className="fixed z-30 flex items-center gap-2.5 rounded-full px-4 py-2.5"
            style={{
              bottom: "72px",   /* clear the ~56px Next.js dev badge */
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
            transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.5 }}
            whileHover={{ scale: 1.04, borderColor: "rgba(184,148,74,0.4)" }}
            whileTap={{ scale: 0.96 }}
          >
            {/* Pulse ring to draw attention */}
            <motion.div
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{ border: "1px solid rgba(184,148,74,0.3)" }}
              animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
            />
            <SproutIcon size={13} color="rgba(184,148,74,0.8)" />
            <span
              className="t-label"
              style={{ fontSize: "9.5px", letterSpacing: "0.2em", color: "rgba(242,236,224,0.7)" }}
            >
              Preview growth
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Simulator panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center pb-6 px-4 pt-24"
            style={{ background: "rgba(8,1,6,0.65)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
          >
            <motion.div
              className="w-full max-w-[420px]"
              initial={{ opacity: 0, y: 40, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 28, scale: 0.97 }}
              transition={{ duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <div className="glass-bezel rounded-[26px]">
                <div className="glass-bezel-inner rounded-[25px] px-7 py-8 flex flex-col gap-7">

                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex flex-col gap-1">
                      <span className="t-label" style={{ fontSize: "9px", letterSpacing: "0.28em" }}>
                        Growth preview
                      </span>
                      <h2
                        className="t-display"
                        style={{ fontSize: "26px", fontStyle: "italic" }}
                      >
                        How the rose grows
                      </h2>
                    </div>
                    <button
                      onClick={handleClose}
                      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.07)",
                        cursor: "pointer",
                        marginTop: "2px",
                      }}
                    >
                      <CloseIcon size={13} color="rgba(242,236,224,0.45)" />
                    </button>
                  </div>

                  {/* Stage info */}
                  <motion.div
                    key={stage}
                    className="rounded-2xl px-5 py-5 flex flex-col gap-2"
                    style={{
                      background: "rgba(255,255,255,0.025)",
                      border: `1px solid ${current.color}44`,
                      boxShadow: `inset 0 1px 0 rgba(255,255,255,0.04), 0 0 24px ${current.color}18`,
                    }}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className="t-display"
                        style={{ fontSize: "20px", fontStyle: "italic", color: "rgba(242,236,224,0.9)" }}
                      >
                        {current.label}
                      </span>
                      <div className="flex items-baseline gap-1">
                        <span className="t-stat" style={{ fontSize: "28px", color: current.color === "#1a0408" ? "rgba(242,236,224,0.3)" : "rgba(184,148,74,0.9)", lineHeight: 1 }}>
                          {current.petals}
                        </span>
                        <span style={{ fontSize: "11px", color: "rgba(242,236,224,0.25)" }}>/40</span>
                      </div>
                    </div>
                    <p className="t-serif" style={{ fontSize: "13.5px", color: "rgba(242,236,224,0.5)", lineHeight: 1.55 }}>
                      {current.sub}
                    </p>

                    {/* Mini petal bar */}
                    <div style={{ display: "flex", gap: "3px", marginTop: "4px", flexWrap: "wrap" }}>
                      {Array.from({ length: 40 }, (_, i) => (
                        <motion.div
                          key={i}
                          style={{ width: "8px", height: "8px", borderRadius: "50%" }}
                          animate={{
                            background: i < current.petals ? current.color : "rgba(255,255,255,0.04)",
                            boxShadow: i < current.petals ? `0 0 4px ${current.color}80` : "none",
                          }}
                          transition={{ duration: 0.5, delay: i * 0.012, ease: "easeOut" }}
                        />
                      ))}
                    </div>
                  </motion.div>

                  {/* Stage scrubber */}
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      {STAGES.map((s, i) => (
                        <button
                          key={i}
                          onClick={() => { if (!playing) setStage(i) }}
                          className="flex flex-col items-center gap-1.5"
                          style={{ cursor: playing ? "not-allowed" : "pointer", opacity: playing && i !== stage ? 0.35 : 1 }}
                        >
                          <motion.div
                            className="rounded-full"
                            style={{ width: "10px", height: "10px" }}
                            animate={{
                              background: i === stage ? s.color || "#8a1528" : "rgba(255,255,255,0.08)",
                              scale: i === stage ? 1.4 : 1,
                              boxShadow: i === stage ? `0 0 8px ${s.color}80` : "none",
                            }}
                            transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                          />
                          {i === stage && (
                            <span className="t-label" style={{ fontSize: "7.5px", letterSpacing: "0.15em", whiteSpace: "nowrap" }}>
                              {["Full", "Good", "Fading", "Low", "Gone"][i]}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>

                    {/* Progress line */}
                    <div style={{ height: "1px", background: "rgba(255,255,255,0.06)", borderRadius: "1px", position: "relative" }}>
                      <motion.div
                        style={{
                          position: "absolute", top: 0, left: 0, height: "100%",
                          background: "linear-gradient(to right, rgba(138,21,40,0.7), rgba(184,148,74,0.6))",
                          borderRadius: "1px",
                          boxShadow: "0 0 6px rgba(184,148,74,0.3)",
                        }}
                        animate={{ width: `${(stage / (STAGES.length - 1)) * 100}%` }}
                        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-3">
                    <motion.button
                      onClick={handlePlay}
                      className="rounded-full py-3 flex items-center justify-center gap-2"
                      style={{
                        background: playing ? "rgba(184,148,74,0.12)" : "linear-gradient(135deg,rgba(138,21,40,0.85),rgba(90,8,20,0.92))",
                        border: "1px solid rgba(184,148,74,0.24)",
                        cursor: "pointer",
                      }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      {playing
                        ? <PulseStop />
                        : <PlayIcon size={13} color="rgba(242,236,224,0.75)" />}
                      <span className="t-serif" style={{ fontSize: "13px", color: "rgba(242,236,224,0.8)" }}>
                        {playing ? "Stop" : "Watch it grow"}
                      </span>
                    </motion.button>

                    <div className="grid grid-cols-2 gap-2">
                      <motion.button
                        onClick={() => !playing && setStage((s) => Math.max(0, s - 1))}
                        className="rounded-full py-3 flex items-center justify-center"
                        style={{
                          background: "rgba(255,255,255,0.025)",
                          border: "1px solid rgba(255,255,255,0.07)",
                          cursor: playing ? "not-allowed" : "pointer",
                          opacity: playing ? 0.4 : 1,
                        }}
                        whileHover={!playing ? { scale: 1.04 } : {}}
                        whileTap={!playing ? { scale: 0.96 } : {}}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(242,236,224,0.5)" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12,19 5,12 12,5" />
                        </svg>
                      </motion.button>
                      <motion.button
                        onClick={() => !playing && setStage((s) => Math.min(STAGES.length - 1, s + 1))}
                        className="rounded-full py-3 flex items-center justify-center"
                        style={{
                          background: "rgba(255,255,255,0.025)",
                          border: "1px solid rgba(255,255,255,0.07)",
                          cursor: playing ? "not-allowed" : "pointer",
                          opacity: playing ? 0.4 : 1,
                        }}
                        whileHover={!playing ? { scale: 1.04 } : {}}
                        whileTap={!playing ? { scale: 0.96 } : {}}
                      >
                        <ArrowRightIcon size={13} color="rgba(242,236,224,0.5)" />
                      </motion.button>
                    </div>
                  </div>

                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function PulseStop() {
  return (
    <motion.div
      style={{ width: 10, height: 10, borderRadius: "2px", background: "rgba(184,148,74,0.85)" }}
      animate={{ opacity: [1, 0.4, 1] }}
      transition={{ duration: 0.8, repeat: Infinity }}
    />
  )
}
