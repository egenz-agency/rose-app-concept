"use client"
import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useSceneStore } from "@/lib/store/sceneStore"
import { useConstellation } from "@/lib/constellation/useConstellation"
import { SparkleIcon, RoseIcon, StarIcon, LetterIcon } from "./Icons"

/**
 * The first arrival in the sky.
 *
 * Four short cards, shown once per gift, that explain what this place is before
 * she is left alone in it. It never covers the constellation — it sits low, the
 * sky stays draggable behind it, and it can be dismissed at any point.
 */

const STORAGE_PREFIX = "rose_sky_guide_v1:"

const STEPS = [
  {
    Icon: SparkleIcon,
    title: "This is your sky.",
    body: "No one else will ever be given this constellation. It was drawn for the two of you, and it will always look exactly like this.",
  },
  {
    Icon: RoseIcon,
    title: "Stars wake as you tend the rose.",
    body: "One is already lit. Every time you come back down and care for her, another one opens — always growing outward from the first.",
  },
  {
    Icon: StarIcon,
    title: "Put a memory inside a star.",
    body: "Touch any star that has woken to keep a night, a place, a song or a voice message inside it. What you write stays there for good.",
  },
  {
    Icon: LetterIcon,
    title: "See how they connect.",
    body: "Reveal constellation draws the lines between your stars, holds them for a moment, then lets them fade so the sky stays clear.",
  },
] as const

function guideKey(seed: string) {
  return `${STORAGE_PREFIX}${seed}`
}

function alreadySeen(seed: string): boolean {
  try {
    return localStorage.getItem(guideKey(seed)) === "1"
  } catch {
    // Private mode / storage blocked — better to show it again than to crash.
    return false
  }
}

export function ConstellationGuide() {
  const universeMode = useSceneStore((s) => s.universeMode)
  const activeSlot = useSceneStore((s) => s.activeSlot)
  const setGuideActive = useSceneStore((s) => s.setGuideActive)
  const overtureActive = useSceneStore((s) => s.overtureActive)
  const { seed } = useConstellation()

  const [step, setStep] = useState(0)
  const [open, setOpen] = useState(false)

  const inSky = universeMode === "universe"

  // Wait for the flight to land and the sky to settle before speaking.
  useEffect(() => {
    if (!inSky || overtureActive) return
    if (alreadySeen(seed)) return
    // A beat after the cinematic (or the flight) has settled — never over it.
    const t = window.setTimeout(() => setOpen(true), 1400)
    return () => window.clearTimeout(t)
  }, [inSky, overtureActive, seed])

  // Let the rest of the sky's UI know to step aside.
  useEffect(() => {
    setGuideActive(open)
    return () => setGuideActive(false)
  }, [open, setGuideActive])

  // Leaving the sky closes the guide without marking it read — if she never saw
  // it through, it should still be waiting next time.
  useEffect(() => {
    if (!inSky) {
      setOpen(false)
      setStep(0)
    }
  }, [inSky])

  const finish = () => {
    try {
      localStorage.setItem(guideKey(seed), "1")
    } catch {
      // Nothing to do — the guide simply shows again next time.
    }
    setOpen(false)
  }

  const isLast = step === STEPS.length - 1
  const current = STEPS[step]
  const visible = open && inSky && activeSlot === null

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-8 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.div
            className="w-full max-w-[440px] pointer-events-auto"
            initial={{ y: 26, opacity: 0, filter: "blur(8px)" }}
            animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
            exit={{ y: 18, opacity: 0, filter: "blur(6px)" }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
          >
            <div className="glass-bezel rounded-[22px]">
              <div className="glass-bezel-inner rounded-[21px] px-7 py-6 flex flex-col gap-5">

                {/* Step content — crossfades in place so the card never jumps */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={step}
                    className="flex gap-4"
                    initial={{ opacity: 0, x: 14 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <div
                      className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
                      style={{
                        background: "rgba(184,148,74,0.09)",
                        border: "1px solid rgba(184,148,74,0.2)",
                        marginTop: "2px",
                      }}
                    >
                      <current.Icon size={14} color="rgba(201,168,76,0.8)" />
                    </div>

                    <div className="flex flex-col gap-2 min-w-0">
                      <h3
                        className="t-display"
                        style={{ fontSize: "19px", fontStyle: "italic", lineHeight: 1.25 }}
                      >
                        {current.title}
                      </h3>
                      <p
                        className="t-serif"
                        style={{
                          fontSize: "13.5px",
                          lineHeight: 1.75,
                          color: "rgba(242,236,224,0.58)",
                        }}
                      >
                        {current.body}
                      </p>
                    </div>
                  </motion.div>
                </AnimatePresence>

                <div
                  style={{
                    height: "1px",
                    background:
                      "linear-gradient(to right, transparent, rgba(184,148,74,0.12), transparent)",
                  }}
                />

                <div className="flex items-center justify-between gap-4">
                  {/* Progress — which of the four, without a number in sight */}
                  <div className="flex items-center gap-1.5">
                    {STEPS.map((s, i) => (
                      <motion.span
                        key={s.title}
                        className="rounded-full"
                        animate={{
                          width: i === step ? 16 : 5,
                          backgroundColor:
                            i === step ? "rgba(201,168,76,0.85)" : "rgba(242,236,224,0.2)",
                        }}
                        transition={{ type: "spring", stiffness: 300, damping: 28 }}
                        style={{ height: 5, display: "block" }}
                      />
                    ))}
                  </div>

                  <div className="flex items-center gap-1">
                    {!isLast && (
                      <motion.button
                        onClick={finish}
                        className="t-label rounded-full px-3 py-2"
                        style={{
                          fontSize: "9px",
                          letterSpacing: "0.2em",
                          background: "none",
                          border: "none",
                          color: "rgba(242,236,224,0.35)",
                          cursor: "pointer",
                        }}
                        whileHover={{ color: "rgba(242,236,224,0.6)" }}
                        whileTap={{ scale: 0.97 }}
                      >
                        Skip
                      </motion.button>
                    )}

                    <motion.button
                      onClick={() => (isLast ? finish() : setStep((s) => s + 1))}
                      className="rounded-full px-5 py-2.5"
                      style={{
                        background: "rgba(184,148,74,0.1)",
                        border: "1px solid rgba(184,148,74,0.26)",
                        boxShadow: "inset 0 1px 0 rgba(255,248,240,0.06)",
                        cursor: "pointer",
                      }}
                      whileHover={{ y: -1, background: "rgba(184,148,74,0.16)" }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ type: "spring", stiffness: 420, damping: 30 }}
                    >
                      <span
                        className="t-label"
                        style={{
                          fontSize: "9px",
                          letterSpacing: "0.2em",
                          color: "rgba(242,236,224,0.85)",
                        }}
                      >
                        {isLast ? "Begin" : "Next"}
                      </span>
                    </motion.button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
