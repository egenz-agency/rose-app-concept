"use client"
import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useSceneStore } from "@/lib/store/sceneStore"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { recordVisit, TOTAL_CHAPTERS, JOURNEY_DAYS, type MilestoneInfo } from "@/lib/supabase/queries"
import { CloseIcon } from "./Icons"

export function CarePanel() {
  const phase           = useSceneStore((s) => s.phase)
  const setPhase        = useSceneStore((s) => s.setPhase)
  const rose            = useSceneStore((s) => s.rose)
  const setRose         = useSceneStore((s) => s.setRose)
  const setDailyMessage = useSceneStore((s) => s.setDailyMessage)
  const setFirstVisit   = useSceneStore((s) => s.setFirstVisitToday)
  const addFallenPetal  = useSceneStore((s) => s.addFallenPetal)
  const dailyMessage    = useSceneStore((s) => s.dailyMessage)
  const isFirstToday    = useSceneStore((s) => s.isFirstVisitToday)
  const triggerBloom    = useSceneStore((s) => s.triggerBloom)
  const setDomeLifted   = useSceneStore((s) => s.setDomeLifted)

  const [done, setDone] = useState(false)
  const [milestone, setMilestone] = useState<MilestoneInfo | null>(null)
  const queryClient     = useQueryClient()

  const petals   = rose?.petalsRemaining ?? 40
  const streak   = rose?.streakDays      ?? 0
  const revivals = rose?.revivalsRemaining ?? 3

  // Auto-tend when panel opens (the hold already confirmed intent)
  useEffect(() => {
    if (phase !== "CARING") return
    setDone(false)
    mutation.mutate()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const mutation = useMutation({
    mutationFn: recordVisit,
    onSuccess: (result) => {
      setRose(result.rose)
      setDailyMessage(result.message)
      setFirstVisit(result.isFirstToday)
      setMilestone(result.milestone)
      queryClient.invalidateQueries({ queryKey: ["rose-state"] })

      if (result.isFirstToday) {
        // Trigger 3D bloom animation
        triggerBloom()
        // Drop petals for missed days
        const diff = petals - result.rose.petalsRemaining
        for (let i = 0; i < diff; i++) {
          setTimeout(() => addFallenPetal(petals - 1 - i), i * 700)
        }
      }

      if (result.rose.isDead) {
        setTimeout(() => setPhase("REVIVAL"), 2200)
      } else {
        setDone(true)
      }
    },
  })

  const handleClose = () => {
    setDomeLifted(false)
    setPhase("IDLE")
  }

  return (
    <AnimatePresence>
      {phase === "CARING" && (
        <motion.div
          className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pb-6 px-4"
          initial={{ opacity: 0, y: 48 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 36 }}
          transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <div className="w-full max-w-[420px]">
            <div className="glass-bezel rounded-[24px]">
              <div className="glass-bezel-inner rounded-[23px] px-7 py-7 flex flex-col gap-6">

                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="t-label" style={{ fontSize: "9px", letterSpacing: "0.26em" }}>
                      Daily ritual
                    </span>
                    <h2
                      className="t-display"
                      style={{ fontSize: "26px", fontStyle: "italic" }}
                    >
                      {mutation.isPending
                        ? "Awakening the rose…"
                        : done
                        ? "The rose remembers you."
                        : isFirstToday
                        ? "She has been tended today."
                        : "You visited today."}
                    </h2>
                  </div>
                  <button
                    onClick={handleClose}
                    className="flex items-center justify-center rounded-full w-8 h-8 shrink-0"
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

                {/* Petal grid */}
                <PetalGrid petals={petals} />

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Streak",   value: `${streak}`,   unit: "days" },
                    { label: "Petals",   value: `${petals}`,   unit: "/ 40" },
                    { label: "Revivals", value: `${revivals}`, unit: "left" },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className="rounded-2xl px-3 py-3 flex flex-col gap-0.5"
                      style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)" }}
                    >
                      <div className="flex items-baseline gap-1">
                        <span
                          className="t-stat"
                          style={{ fontSize: "22px", color: "rgba(184,148,74,0.9)", lineHeight: 1 }}
                        >
                          {s.value}
                        </span>
                        <span style={{ fontSize: "10px", color: "rgba(242,236,224,0.28)" }}>
                          {s.unit}
                        </span>
                      </div>
                      <span className="t-label" style={{ fontSize: "8.5px", letterSpacing: "0.22em" }}>
                        {s.label}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Daily message */}
                <AnimatePresence>
                  {dailyMessage && (
                    <motion.div
                      className="rounded-2xl px-5 py-4 relative"
                      style={{
                        background: "rgba(138,21,40,0.10)",
                        border: "1px solid rgba(138,21,40,0.22)",
                      }}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
                    >
                      <div
                        style={{
                          position: "absolute", top: "10px", left: "16px",
                          fontSize: "28px", lineHeight: 1,
                          color: "rgba(138,21,40,0.25)",
                          fontFamily: "Georgia, serif",
                          pointerEvents: "none",
                        }}
                      >
                        &ldquo;
                      </div>
                      <p
                        className="t-serif"
                        style={{
                          fontSize: "14.5px",
                          fontStyle: "italic",
                          color: "rgba(242,236,224,0.78)",
                          lineHeight: 1.65,
                          paddingLeft: "8px",
                        }}
                      >
                        {dailyMessage}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Fairytale journey — chapter progress */}
                <AnimatePresence>
                  {milestone && milestone.chapter > 0 && (
                    <FairytaleJourney milestone={milestone} />
                  )}
                </AnimatePresence>

                {/* Loading state shimmer */}
                {mutation.isPending && (
                  <div className="flex items-center justify-center gap-2 py-2">
                    <PulseRing />
                    <span className="t-serif" style={{ fontSize: "13px", color: "rgba(184,148,74,0.5)", fontStyle: "italic" }}>
                      She is waking…
                    </span>
                  </div>
                )}

              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function FairytaleJourney({ milestone }: { milestone: MilestoneInfo }) {
  const progress = Math.min(1, milestone.totalVisits / JOURNEY_DAYS)

  return (
    <motion.div
      className="rounded-2xl px-5 py-4 flex flex-col gap-3"
      style={{
        background: "rgba(184,148,74,0.06)",
        border: "1px solid rgba(184,148,74,0.18)",
      }}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {/* Heading row */}
      <div className="flex items-center justify-between">
        <span className="t-label" style={{ fontSize: "9px", letterSpacing: "0.26em" }}>
          {milestone.isNewMilestone ? "A new chapter opens" : "Your fairytale"}
        </span>
        <span
          className="t-stat"
          style={{ fontSize: "11px", color: "rgba(184,148,74,0.85)", letterSpacing: "0.04em" }}
        >
          {milestone.label ?? `Chapter ${milestone.chapter}`} · {milestone.chapter}/{TOTAL_CHAPTERS}
        </span>
      </div>

      {/* The unlocked chapter phrase */}
      {milestone.phrase && (
        <p
          className="t-display"
          style={{
            fontSize: "16px",
            fontStyle: "italic",
            lineHeight: 1.5,
            color: "rgba(242,236,224,0.86)",
          }}
        >
          {milestone.phrase}
        </p>
      )}

      {/* Journey progress bar */}
      <div className="flex flex-col gap-1.5">
        <div
          style={{
            height: "3px",
            width: "100%",
            borderRadius: "2px",
            background: "rgba(255,255,255,0.06)",
            overflow: "hidden",
          }}
        >
          <motion.div
            style={{
              height: "100%",
              borderRadius: "2px",
              background: "linear-gradient(to right, rgba(138,21,40,0.9), rgba(184,148,74,0.95))",
            }}
            initial={{ width: 0 }}
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 1.1, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.2 }}
          />
        </div>
        <span style={{ fontSize: "9.5px", color: "rgba(242,236,224,0.32)", letterSpacing: "0.08em" }}>
          Day {milestone.totalVisits} of {JOURNEY_DAYS} — the rose grows with every visit
        </span>
      </div>
    </motion.div>
  )
}

function PetalGrid({ petals }: { petals: number }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
      {Array.from({ length: 40 }, (_, i) => {
        const alive = i < petals
        return (
          <motion.div
            key={i}
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              background: alive ? "rgba(138,21,40,0.85)" : "rgba(255,255,255,0.05)",
              boxShadow: alive ? "0 0 5px rgba(200,40,60,0.5)" : "none",
              border: alive ? "none" : "1px solid rgba(255,255,255,0.06)",
              transition: "all 0.6s cubic-bezier(0.25,0.46,0.45,0.94)",
              transitionDelay: `${i * 18}ms`,
            }}
          />
        )
      })}
    </div>
  )
}

function PulseRing() {
  return (
    <motion.div
      style={{ width: 8, height: 8, borderRadius: "50%", background: "rgba(184,148,74,0.8)" }}
      animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
      transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
    />
  )
}
