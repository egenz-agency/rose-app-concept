"use client"
import { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useSceneStore } from "@/lib/store/sceneStore"
import { useConstellation } from "@/lib/constellation/useConstellation"
import { ArrowLeftIcon, StarIcon, SparkleIcon } from "./Icons"

/**
 * Everything on the glass while the camera is up in the sky. The way IN lives in
 * the nav pill (`NavigationHUD`), next to Tend Rose and Letters.
 *
 * Kept deliberately sparse. The constellation is the thing being looked at; the
 * interface is only ever a whisper at the edges of it.
 */
export function ConstellationHUD() {
  const universeMode = useSceneStore((s) => s.universeMode)
  const setUniverseMode = useSceneStore((s) => s.setUniverseMode)
  const triggerReveal = useSceneStore((s) => s.triggerReveal)
  const triggerRecenter = useSceneStore((s) => s.triggerRecenter)
  const activeSlot = useSceneStore((s) => s.activeSlot)
  const igniting = useSceneStore((s) => s.igniting)
  const setIgniting = useSceneStore((s) => s.setIgniting)
  const tenantConfig = useSceneStore((s) => s.tenantConfig)
  const guideActive = useSceneStore((s) => s.guideActive)
  const previewDays = useSceneStore((s) => s.previewDays)
  const overtureActive = useSceneStore((s) => s.overtureActive)
  const setOvertureActive = useSceneStore((s) => s.setOvertureActive)
  const setVisionActive = useSceneStore((s) => s.setVisionActive)

  const view = useConstellation()

  const inSky = universeMode === "universe"
  const travelling = universeMode === "ascending" || universeMode === "descending"

  // ── Completion ─────────────────────────────────────────────────────────────
  // The first time she arrives to find every star filled, the whole sky ignites.
  const celebrated = useRef(false)
  const [showName, setShowName] = useState(false)

  // Re-arm once the sky is no longer complete, so scrubbing the growth preview
  // back and forth replays the moment instead of showing it only once.
  useEffect(() => {
    if (!view.isComplete) {
      celebrated.current = false
      setIgniting(false)
      setShowName(false)
    }
  }, [view.isComplete, setIgniting])

  useEffect(() => {
    if (!inSky || !view.isComplete || celebrated.current) return
    celebrated.current = true
    setIgniting(true)
    // Let the ignition settle, then bring the lines back one final time and
    // give the constellation the name it earned.
    const lines = window.setTimeout(() => triggerReveal(), 1800)
    const name = window.setTimeout(() => setShowName(true), 3200)

    // Their own song, fading in underneath it — only if this gift has one, and
    // only quietly. Reaching the sky was a tap, so playback is already allowed.
    const song = tenantConfig?.songUrl
    let audio: HTMLAudioElement | null = null
    if (song) {
      audio = new Audio(song)
      audio.loop = true
      audio.volume = 0
      audio.play().then(
        () => {
          const fade = window.setInterval(() => {
            if (!audio || audio.volume >= 0.34) return window.clearInterval(fade)
            audio.volume = Math.min(0.34, audio.volume + 0.02)
          }, 220)
        },
        () => { audio = null } // autoplay refused — the silence is fine too
      )
    }

    return () => {
      window.clearTimeout(lines)
      window.clearTimeout(name)
      if (audio) {
        audio.pause()
        audio.src = ""
      }
    }
  }, [inSky, view.isComplete, setIgniting, triggerReveal, tenantConfig])

  // Heading back down puts the celebration away. The constellation stays
  // complete and keeps its earned name — only the fireworks stop.
  const returnToRose = () => {
    setIgniting(false)
    setShowName(false)
    setUniverseMode("descending")
  }

  // Play the arrival cinematic again, on demand — it is a permanent feature of
  // the sky, not something spent on the first visit.
  const watchAgain = () => {
    setVisionActive(true)
    setOvertureActive(true)
  }

  // Double tap anywhere in the empty sky re-centres the view.
  const lastTap = useRef(0)
  useEffect(() => {
    // Never while the cinematic is flying the camera — a stray double tap would
    // yank it mid-shot.
    if (!inSky || overtureActive) return
    const onPointerUp = () => {
      const now = performance.now()
      if (now - lastTap.current < 320) triggerRecenter()
      lastTap.current = now
    }
    window.addEventListener("pointerup", onPointerUp)
    return () => window.removeEventListener("pointerup", onPointerUp)
  }, [inSky, overtureActive, triggerRecenter])

  const remaining = view.constellation.stars.length - view.filledCount

  return (
    <>
      {/* ── Up in the sky ─────────────────────────────────────────────── */}
      {/* The HUD steps aside entirely while a memory capsule is open. */}
      <AnimatePresence>
        {inSky && activeSlot === null && !guideActive && !overtureActive && (
          <motion.div
            key="sky-hud"
            className="fixed inset-0 z-30 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, delay: 0.1 }}
          >
            {/* Back to the rose */}
            <motion.button
              onClick={returnToRose}
              className="absolute flex items-center gap-2 rounded-full px-4 py-2.5 pointer-events-auto"
              style={{
                top: "26px",
                left: "20px",
                background: "rgba(8,1,6,0.6)",
                border: "1px solid rgba(184,148,74,0.16)",
                backdropFilter: "blur(20px)",
                cursor: "pointer",
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
            >
              <ArrowLeftIcon size={12} color="rgba(242,236,224,0.5)" />
              <span
                className="t-label"
                style={{ fontSize: "9px", letterSpacing: "0.2em", color: "rgba(242,236,224,0.5)" }}
              >
                The rose
              </span>
            </motion.button>

            {/* The chapter's name and how much of it is written */}
            <div
              className="absolute text-center"
              style={{ top: "30px", left: "50%", transform: "translateX(-50%)" }}
            >
              <motion.h2
                className="t-display"
                style={{
                  fontSize: showName ? "27px" : "20px",
                  color: showName ? "rgba(255,226,170,0.95)" : "rgba(242,236,224,0.8)",
                  textShadow: showName
                    ? "0 0 30px rgba(255,200,120,0.5), 0 0 70px rgba(255,180,90,0.2)"
                    : "0 0 20px rgba(0,0,0,0.7)",
                  transition: "font-size 1.2s ease, color 1.2s ease",
                }}
              >
                {showName ? view.constellation.name : view.title}
              </motion.h2>
              <p
                className="t-label"
                style={{
                  fontSize: "8.5px",
                  letterSpacing: "0.26em",
                  marginTop: "6px",
                  opacity: 0.55,
                }}
              >
                {view.isComplete
                  ? `${view.constellation.stars.length} memories · complete`
                  : `${view.filledCount} of ${view.constellation.stars.length} · ${remaining} still to come`}
              </p>
            </div>

            {/* The two permanent things she can ask the sky for. Hidden while the
                growth preview owns the bottom of the screen — it carries its own. */}
            {previewDays === null && (
              <div
                className="absolute flex items-center justify-center gap-2 flex-wrap px-4"
                style={{ bottom: "44px", left: "50%", x: "-50%" }}
              >
                <motion.button
                  onClick={() => triggerReveal()}
                  className="flex items-center gap-2.5 rounded-full px-6 py-3 pointer-events-auto"
                  style={{
                    background: "rgba(8,1,6,0.62)",
                    border: "1px solid rgba(184,148,74,0.2)",
                    backdropFilter: "blur(20px)",
                    cursor: "pointer",
                  }}
                  whileHover={{ y: -1, borderColor: "rgba(184,148,74,0.35)" }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 420, damping: 30 }}
                >
                  <StarIcon size={12} color="rgba(201,168,76,0.75)" />
                  <span
                    className="t-label"
                    style={{ fontSize: "9.5px", letterSpacing: "0.2em", color: "rgba(242,236,224,0.78)" }}
                  >
                    Reveal constellation
                  </span>
                </motion.button>

                {/* Replay the arrival cinematic — the finished sky, on demand. */}
                <motion.button
                  onClick={watchAgain}
                  className="flex items-center gap-2 rounded-full px-5 py-3 pointer-events-auto"
                  style={{
                    background: "rgba(8,1,6,0.5)",
                    border: "1px solid rgba(184,148,74,0.13)",
                    backdropFilter: "blur(20px)",
                    cursor: "pointer",
                  }}
                  whileHover={{ y: -1, borderColor: "rgba(184,148,74,0.3)" }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 420, damping: 30 }}
                >
                  <SparkleIcon size={12} color="rgba(201,168,76,0.6)" />
                  <span
                    className="t-label"
                    style={{ fontSize: "9.5px", letterSpacing: "0.2em", color: "rgba(242,236,224,0.5)" }}
                  >
                    The finished sky
                  </span>
                </motion.button>
              </div>
            )}

            {/* A single line of guidance, and only until she has touched a star */}
            {view.filledCount === 0 && (
              <p
                className="absolute t-serif text-center"
                style={{
                  bottom: "104px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  fontSize: "13px",
                  fontStyle: "italic",
                  color: "rgba(242,236,224,0.32)",
                  maxWidth: "80vw",
                }}
              >
                Touch a waking star to keep a memory inside it.
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── The travel itself: a breath of darkness at the edges ──────── */}
      <AnimatePresence>
        {travelling && (
          <motion.div
            key="travel-veil"
            className="fixed inset-0 z-20 pointer-events-none"
            style={{
              background:
                "radial-gradient(circle at 50% 50%, transparent 45%, rgba(4,0,3,0.55) 100%)",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.1 }}
          />
        )}
      </AnimatePresence>

      {/* The completion moment — one line, then it gets out of the way */}
      <AnimatePresence>
        {igniting && showName && (
          <motion.p
            key="completion"
            className="fixed z-30 t-serif text-center pointer-events-none"
            style={{
              bottom: "104px",
              left: "50%",
              transform: "translateX(-50%)",
              fontSize: "14px",
              fontStyle: "italic",
              color: "rgba(255,226,170,0.72)",
              maxWidth: "82vw",
              textShadow: "0 0 24px rgba(255,190,110,0.35)",
            }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.4 }}
          >
            Every star is full. This sky is yours now, and it will always be here.
          </motion.p>
        )}
      </AnimatePresence>
    </>
  )
}
