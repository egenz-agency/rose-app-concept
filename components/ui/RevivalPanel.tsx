"use client"
import { useState, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useSceneStore } from "@/lib/store/sceneStore"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { reviveRose } from "@/lib/supabase/queries"
import { TRANSITION_PANEL, TRANSITION_ITEM } from "@/lib/animation/easings"

const REVIVAL_HOLD_MS = 3000
const EMBER_R = 46
const EMBER_CIRC = 2 * Math.PI * EMBER_R

export function RevivalPanel() {
  const phase         = useSceneStore((s) => s.phase)
  const setPhase      = useSceneStore((s) => s.setPhase)
  const rose          = useSceneStore((s) => s.rose)
  const setRose       = useSceneStore((s) => s.setRose)
  const setFallenPetals = useSceneStore((s) => s.setFallenPetals)
  const triggerBloom  = useSceneStore((s) => s.triggerBloom)
  const queryClient   = useQueryClient()

  const [emberProgress, setEmberProgress] = useState(0)
  const [isHolding, setIsHolding]         = useState(false)
  const holdStartRef  = useRef<number | null>(null)
  const holdRafRef    = useRef<number | null>(null)

  const isVisible   = phase === "REVIVAL"
  const noRevivals  = (rose?.revivalsRemaining ?? 0) === 0

  const mutation = useMutation({
    mutationFn: reviveRose,
    onSuccess: (newRose) => {
      setRose(newRose)
      setFallenPetals([])
      triggerBloom()
      queryClient.invalidateQueries({ queryKey: ["rose-state"] })
      setTimeout(() => setPhase("IDLE"), 3500)
    },
  })

  const cancelHold = useCallback(() => {
    if (holdRafRef.current) cancelAnimationFrame(holdRafRef.current)
    holdStartRef.current = null
    setEmberProgress(0)
    setIsHolding(false)
  }, [])

  const startHold = useCallback(() => {
    if (mutation.isPending) return
    if (noRevivals) { setPhase("FINAL_DEATH"); return }

    holdStartRef.current = performance.now()
    setIsHolding(true)

    const tick = () => {
      if (!holdStartRef.current) return
      const elapsed  = performance.now() - holdStartRef.current
      const progress = Math.min(elapsed / REVIVAL_HOLD_MS, 1)
      setEmberProgress(progress)
      if (progress >= 1) {
        setEmberProgress(0)
        setIsHolding(false)
        mutation.mutate()
      } else {
        holdRafRef.current = requestAnimationFrame(tick)
      }
    }
    holdRafRef.current = requestAnimationFrame(tick)
  }, [mutation, noRevivals, setPhase])

  const revivalOffset = EMBER_CIRC * (1 - emberProgress)

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-40 flex items-center justify-center px-4"
          style={{ background: "rgba(5, 0, 2, 0.92)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2 }}
        >
          <motion.div
            className="w-full max-w-sm text-center flex flex-col items-center gap-8"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={TRANSITION_PANEL}
          >
            {/* Revival lives counter */}
            {!noRevivals && (
              <div className="flex items-center gap-2">
                {Array.from({ length: 3 }, (_, i) => (
                  <motion.div
                    key={i}
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: i < (rose?.revivalsRemaining ?? 0)
                        ? "rgba(200,40,60,0.85)"
                        : "rgba(255,255,255,0.1)",
                      boxShadow: i < (rose?.revivalsRemaining ?? 0)
                        ? "0 0 6px rgba(200,40,60,0.6)"
                        : "none",
                    }}
                    animate={i < (rose?.revivalsRemaining ?? 0)
                      ? { opacity: [0.7, 1, 0.7] }
                      : {}}
                    transition={{ duration: 2, repeat: Infinity, delay: i * 0.4 }}
                  />
                ))}
              </div>
            )}

            <div className="flex flex-col gap-3">
              <p
                className="text-[9px] uppercase tracking-[0.3em]"
                style={{ color: "rgba(201,168,76,0.4)" }}
              >
                {noRevivals ? "The final petal has fallen" : "All petals have fallen"}
              </p>
              <h2
                className="text-3xl font-light"
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  color: noRevivals ? "#f5f0e8" : "#e8d5c4",
                  lineHeight: 1.2,
                }}
              >
                {noRevivals
                  ? "The rose has faded forever."
                  : "The rose has fallen into sleep."}
              </h2>
              <p
                className="text-base font-light"
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  color: "rgba(232,213,196,0.55)",
                  lineHeight: 1.6,
                }}
              >
                {noRevivals
                  ? "Every love story has its last page. This is yours."
                  : "A single ember still burns. Hold it and breathe her back to life."}
              </p>
            </div>

            {/* Ember hold mechanic */}
            {!noRevivals && (
              <motion.div
                className="relative flex items-center justify-center"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ ...TRANSITION_ITEM, delay: 0.8 }}
              >
                {/* Ember glow */}
                <motion.div
                  className="absolute rounded-full"
                  style={{
                    width: 80, height: 80,
                    background: "radial-gradient(circle, rgba(200,60,40,0.4) 0%, transparent 70%)",
                    filter: `blur(${8 + emberProgress * 16}px)`,
                  }}
                  animate={{ scale: [1, 1.2 + emberProgress * 0.3, 1], opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                />

                {/* SVG progress ring */}
                <svg width="120" height="120" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r={EMBER_R} fill="none" stroke="rgba(201,168,76,0.08)" strokeWidth="1" />
                  {emberProgress > 0.01 && (
                    <circle
                      cx="60" cy="60" r={EMBER_R}
                      fill="none"
                      stroke="#c9a84c"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeDasharray={EMBER_CIRC}
                      strokeDashoffset={revivalOffset}
                      transform="rotate(-90 60 60)"
                      style={{ transition: "stroke-dashoffset 0.016s linear" }}
                    />
                  )}
                  {/* Ember dot */}
                  <circle cx="60" cy="60" r={8 + emberProgress * 6} fill={`rgba(200,80,40,${0.3 + emberProgress * 0.5})`} />
                  <circle cx="60" cy="60" r={4} fill={`rgba(255,150,80,${0.5 + emberProgress * 0.4})`} />
                </svg>

                {/* Invisible hold target */}
                <div
                  className="absolute inset-0 rounded-full cursor-pointer select-none"
                  style={{ touchAction: "none" }}
                  onPointerDown={startHold}
                  onPointerUp={cancelHold}
                  onPointerLeave={cancelHold}
                  onPointerCancel={cancelHold}
                />
              </motion.div>
            )}

            {/* Hold label */}
            {!noRevivals && (
              <motion.p
                className="text-xs"
                style={{
                  color: `rgba(245,240,232,${0.2 + emberProgress * 0.5})`,
                  fontFamily: "'Cormorant Garamond', serif",
                  fontStyle: "italic",
                  marginTop: "-24px",
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
              >
                {mutation.isPending
                  ? "Restoring…"
                  : isHolding
                  ? "Hold…"
                  : "Press and hold to restore"}
              </motion.p>
            )}

            {/* Final death button */}
            {noRevivals && (
              <motion.button
                onClick={() => setPhase("FINAL_DEATH")}
                className="rounded-full px-10 py-4"
                style={{
                  background: "linear-gradient(135deg, #1a0a00, #0d0508)",
                  border: "1px solid rgba(201,168,76,0.2)",
                  color: "#f5f0e8",
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: "16px",
                  letterSpacing: "0.1em",
                  cursor: "pointer",
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ ...TRANSITION_ITEM, delay: 0.8 }}
              >
                See the ending
              </motion.button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
