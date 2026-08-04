"use client"
import { useState, useEffect, useRef, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useSceneStore } from "@/lib/store/sceneStore"
import { useConstellation, chapterMilestones } from "@/lib/constellation/useConstellation"
import { SproutIcon, PlayIcon, CloseIcon, CheckIcon, StarIcon } from "./Icons"

/**
 * Walk the sky forward in time.
 *
 * Proving the progression works shouldn't cost a hundred days of real waiting.
 * This replays the growth as if the rose were tended once a day: stars wake in
 * the constellation's own order, memories fill them, chapters complete and seal,
 * and the completion sequence fires — all from local state. Nothing is written,
 * and turning it off restores the real sky untouched.
 */

/** One simulated day per tick while playing. */
const TICK_MS = 260

export function ConstellationPreview() {
  const universeMode = useSceneStore((s) => s.universeMode)
  const activeSlot = useSceneStore((s) => s.activeSlot)
  const guideActive = useSceneStore((s) => s.guideActive)
  const overtureActive = useSceneStore((s) => s.overtureActive)
  const previewDays = useSceneStore((s) => s.previewDays)
  const previewFill = useSceneStore((s) => s.previewFill)
  const setPreviewDays = useSceneStore((s) => s.setPreviewDays)
  const setPreviewFill = useSceneStore((s) => s.setPreviewFill)
  const rose = useSceneStore((s) => s.rose)
  const triggerReveal = useSceneStore((s) => s.triggerReveal)

  const view = useConstellation()
  const [open, setOpen] = useState(false)
  const [playing, setPlaying] = useState(false)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)
  // The completion moment lasts a single simulated day before the chapter seals
  // and the next begins. Playback holds there so it can actually be watched.
  const isComplete = useRef(false)
  const passComplete = useRef(false)
  useEffect(() => {
    isComplete.current = view.isComplete
  }, [view.isComplete])

  const realDays = rose?.totalVisits ?? 0
  const on = previewDays !== null
  const days = previewDays ?? realDays

  // Enough runway to watch four chapters build and seal.
  const milestones = useMemo(() => chapterMilestones(view.seed, 4), [view.seed])
  const maxDays = milestones[milestones.length - 1].day + 6

  const stop = () => {
    if (timer.current) clearInterval(timer.current)
    timer.current = null
    setPlaying(false)
  }

  // Advance a day at a time while playing, and stop at the end of the runway.
  useEffect(() => {
    if (!playing) return
    timer.current = setInterval(() => {
      const current = useSceneStore.getState().previewDays ?? 0
      const atEnd = current >= maxDays
      // Stop on a completed sky, unless the user just pressed play again to
      // carry on past it into the following chapter.
      const holdHere = isComplete.current && !passComplete.current
      if (atEnd || holdHere) {
        if (timer.current) clearInterval(timer.current)
        timer.current = null
        setPlaying(false)
        return
      }
      passComplete.current = false
      setPreviewDays(current + 1)
    }, TICK_MS)
    return () => {
      if (timer.current) clearInterval(timer.current)
      timer.current = null
    }
  }, [playing, maxDays, setPreviewDays])

  // Leaving the sky, or unmounting, always restores the real state.
  useEffect(() => {
    if (universeMode === "rose") {
      stop()
      setOpen(false)
      setPreviewDays(null)
    }
  }, [universeMode, setPreviewDays])

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current)
    useSceneStore.getState().setPreviewDays(null)
  }, [])

  const enter = () => {
    setOpen(true)
    if (previewDays === null) setPreviewDays(realDays)
  }

  const exit = () => {
    stop()
    setOpen(false)
    setPreviewDays(null)
  }

  const visible =
    universeMode === "universe" && activeSlot === null && !guideActive && !overtureActive

  return (
    <>
      {/* A standing badge, so a previewed sky can never be mistaken for the real one */}
      <AnimatePresence>
        {on && visible && (
          <motion.div
            className="fixed z-40 pointer-events-none rounded-full px-3 py-1.5"
            style={{
              top: "26px",
              right: "20px",
              background: "rgba(184,148,74,0.12)",
              border: "1px solid rgba(184,148,74,0.3)",
              backdropFilter: "blur(16px)",
            }}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
          >
            <span
              className="t-label"
              style={{ fontSize: "8.5px", letterSpacing: "0.24em", color: "rgba(201,168,76,0.95)" }}
            >
              Preview · day {days}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {visible && (
          <motion.div
            className="fixed z-40"
            style={{ left: "20px", bottom: "26px" }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.5 }}
          >
            {!open ? (
              <motion.button
                onClick={enter}
                className="flex items-center gap-2 rounded-full px-4 py-2.5"
                style={{
                  background: "rgba(8,1,6,0.6)",
                  border: "1px solid rgba(184,148,74,0.16)",
                  backdropFilter: "blur(20px)",
                  cursor: "pointer",
                }}
                whileHover={{ y: -1, borderColor: "rgba(184,148,74,0.32)" }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 420, damping: 30 }}
              >
                <SproutIcon size={12} color="rgba(201,168,76,0.7)" />
                <span
                  className="t-label"
                  style={{ fontSize: "9px", letterSpacing: "0.2em", color: "rgba(242,236,224,0.55)" }}
                >
                  Preview growth
                </span>
              </motion.button>
            ) : (
              <motion.div
                className="w-[330px] max-w-[calc(100vw-40px)]"
                initial={{ opacity: 0, y: 14, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 140, damping: 20 }}
              >
                <div className="glass-bezel rounded-[20px]">
                  <div className="glass-bezel-inner rounded-[19px] px-6 py-5 flex flex-col gap-4">

                    {/* Heading + close */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-col gap-1 min-w-0">
                        <span
                          className="t-label"
                          style={{ fontSize: "8.5px", letterSpacing: "0.24em" }}
                        >
                          Preview growth
                        </span>
                        <p
                          className="t-serif"
                          style={{ fontSize: "12.5px", color: "rgba(242,236,224,0.42)", lineHeight: 1.55 }}
                        >
                          One day of care per step. Nothing here is saved.
                        </p>
                      </div>
                      <motion.button
                        onClick={exit}
                        aria-label="Close preview"
                        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                        style={{
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          cursor: "pointer",
                        }}
                        whileHover={{ background: "rgba(255,255,255,0.08)" }}
                        whileTap={{ scale: 0.92 }}
                      >
                        <CloseIcon size={12} color="rgba(242,236,224,0.45)" />
                      </motion.button>
                    </div>

                    {/* Readout */}
                    <div className="flex items-baseline justify-between gap-3">
                      <span
                        className="t-display"
                        style={{ fontSize: "20px", fontStyle: "italic", color: "rgba(255,226,170,0.92)" }}
                      >
                        Day {days}
                      </span>
                      <span
                        className="t-serif"
                        style={{ fontSize: "12px", color: "rgba(242,236,224,0.5)" }}
                      >
                        {view.unlockedCount} of {view.constellation.stars.length} awake
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <span
                        className="t-serif"
                        style={{ fontSize: "12px", color: "rgba(201,168,76,0.75)", fontStyle: "italic" }}
                      >
                        {view.isComplete ? view.constellation.name : view.title}
                      </span>
                      {view.completed.length > 0 && (
                        <span
                          className="t-label"
                          style={{ fontSize: "8px", letterSpacing: "0.18em", opacity: 0.55 }}
                        >
                          {view.completed.length} sealed
                        </span>
                      )}
                    </div>

                    {/* Scrubber */}
                    <input
                      type="range"
                      min={0}
                      max={maxDays}
                      value={days}
                      onChange={(e) => { stop(); setPreviewDays(Number(e.target.value)) }}
                      className="constellation-scrub"
                      aria-label="Days of care"
                    />

                    {/* Transport + milestones */}
                    <div className="flex items-center gap-2">
                      <motion.button
                        onClick={() => {
                          if (playing) return stop()
                          // Resuming from a completed sky means "carry on".
                          passComplete.current = isComplete.current
                          setPlaying(true)
                        }}
                        className="flex items-center gap-2 rounded-full px-4 py-2"
                        style={{
                          background: playing ? "rgba(184,148,74,0.18)" : "rgba(184,148,74,0.09)",
                          border: "1px solid rgba(184,148,74,0.26)",
                          cursor: "pointer",
                        }}
                        whileHover={{ y: -1 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {playing
                          ? <span style={{ width: 9, height: 9, background: "rgba(201,168,76,0.9)", borderRadius: 1, display: "block" }} />
                          : <PlayIcon size={10} color="rgba(201,168,76,0.85)" />}
                        <span
                          className="t-label"
                          style={{ fontSize: "8.5px", letterSpacing: "0.2em", color: "rgba(242,236,224,0.8)" }}
                        >
                          {playing ? "Pause" : view.isComplete ? "Next chapter" : "Play"}
                        </span>
                      </motion.button>

                      <motion.button
                        onClick={() => { stop(); setPreviewDays(0) }}
                        className="t-label rounded-full px-3 py-2"
                        style={{
                          fontSize: "8.5px", letterSpacing: "0.2em",
                          background: "none", border: "none",
                          color: "rgba(242,236,224,0.35)", cursor: "pointer",
                        }}
                        whileHover={{ color: "rgba(242,236,224,0.65)" }}
                        whileTap={{ scale: 0.97 }}
                      >
                        Day one
                      </motion.button>

                      <motion.button
                        onClick={() => { stop(); setPreviewDays(milestones[0].day) }}
                        className="t-label rounded-full px-3 py-2 ml-auto"
                        style={{
                          fontSize: "8.5px", letterSpacing: "0.2em",
                          background: "none", border: "none",
                          color: "rgba(242,236,224,0.35)", cursor: "pointer",
                        }}
                        whileHover={{ color: "rgba(242,236,224,0.65)" }}
                        whileTap={{ scale: 0.97 }}
                      >
                        Full sky
                      </motion.button>
                    </div>

                    {/* The connections, without leaving the panel — the centre-screen
                        button steps aside while this is open. */}
                    <motion.button
                      onClick={() => triggerReveal()}
                      className="flex items-center justify-center gap-2 rounded-full py-2.5"
                      style={{
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(184,148,74,0.18)",
                        cursor: "pointer",
                      }}
                      whileHover={{ y: -1, borderColor: "rgba(184,148,74,0.34)" }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <StarIcon size={11} color="rgba(201,168,76,0.7)" />
                      <span
                        className="t-label"
                        style={{ fontSize: "8.5px", letterSpacing: "0.2em", color: "rgba(242,236,224,0.7)" }}
                      >
                        Reveal connections
                      </span>
                    </motion.button>

                    {/* Whether the woken stars also hold memories */}
                    <motion.button
                      onClick={() => setPreviewFill(!previewFill)}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 -mx-1"
                      style={{
                        background: "rgba(255,255,255,0.02)",
                        border: "1px solid rgba(255,255,255,0.05)",
                        cursor: "pointer",
                      }}
                      whileTap={{ scale: 0.99 }}
                    >
                      <span
                        className="w-4 h-4 rounded-[5px] flex items-center justify-center shrink-0"
                        style={{
                          background: previewFill ? "rgba(184,148,74,0.7)" : "transparent",
                          border: `1px solid ${previewFill ? "rgba(201,168,76,0.8)" : "rgba(255,255,255,0.18)"}`,
                          transition: "all 0.25s ease",
                        }}
                      >
                        {previewFill && <CheckIcon size={9} color="rgba(20,6,10,0.9)" />}
                      </span>
                      <span
                        className="t-serif text-left"
                        style={{ fontSize: "12px", color: "rgba(242,236,224,0.55)", lineHeight: 1.45 }}
                      >
                        Write a memory each day
                        <span style={{ color: "rgba(242,236,224,0.3)" }}>
                          {" "}— needed to complete a chapter
                        </span>
                      </span>
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
