"use client"
import { useEffect, useRef, useCallback } from "react"
import dynamic from "next/dynamic"
import { QueryProvider } from "@/components/providers/QueryProvider"
import { Preloader } from "@/components/ui/Preloader"
import { IntroVideo } from "@/components/ui/IntroVideo"
import { RoseReveal } from "@/components/ui/RoseReveal"
import { InstructionsPanel } from "@/components/ui/InstructionsPanel"
import { CarePanel } from "@/components/ui/CarePanel"
import { RevivalPanel } from "@/components/ui/RevivalPanel"
import { FinalDeathScene } from "@/components/ui/FinalDeathScene"
import { LettersPanel } from "@/components/ui/LettersPanel"
import { MemoryStarPanel } from "@/components/ui/MemoryStarPanel"
import { NavigationHUD } from "@/components/ui/NavigationHUD"
import { GrowthSimulator } from "@/components/ui/GrowthSimulator"
import { MissedDayPreview } from "@/components/ui/MissedDayPreview"
import { MomentPanel } from "@/components/ui/MomentPanel"
import { HoldRing } from "@/components/ui/HoldRing"
import { ViewControls } from "@/components/ui/ViewControls"
import { SceneErrorBoundary } from "@/components/scene/SceneErrorBoundary"
import { useSceneStore } from "@/lib/store/sceneStore"
import { fetchRoseState, createMemoryStar, recordVisit } from "@/lib/supabase/queries"
import { useQueryClient } from "@tanstack/react-query"

const HOLD_DURATION_MS = 1500
const CLICK_THRESHOLD_MS = 200 // pointer released before this → treat as click (dome lift)

const SceneRoot = dynamic(
  () => import("@/components/scene/SceneRoot").then((m) => m.SceneRoot),
  { ssr: false }
)

function ExperienceInner() {
  const phase           = useSceneStore((s) => s.phase)
  const setPhase        = useSceneStore((s) => s.setPhase)
  const setRose         = useSceneStore((s) => s.setRose)
  const setFallenPetals = useSceneStore((s) => s.setFallenPetals)
  const domeLifted      = useSceneStore((s) => s.domeLifted)
  const setDomeLifted   = useSceneStore((s) => s.setDomeLifted)
  const holdProgress    = useSceneStore((s) => s.holdProgress)
  const setHoldProgress = useSceneStore((s) => s.setHoldProgress)
  const setIsHolding    = useSceneStore((s) => s.setIsHolding)
  const setMagicActive  = useSceneStore((s) => s.setMagicActive)
  const setViewPreset   = useSceneStore((s) => s.setViewPreset)
  const triggerBloom    = useSceneStore((s) => s.triggerBloom)
  const magicActive     = useSceneStore((s) => s.magicActive)
  const setDailyMessage = useSceneStore((s) => s.setDailyMessage)
  const setActiveMoment = useSceneStore((s) => s.setActiveMoment)

  const queryClient     = useQueryClient()

  const holdStartRef    = useRef<number | null>(null)
  const holdRafRef      = useRef<number | null>(null)

  // Load rose state on mount
  useEffect(() => {
    fetchRoseState()
      .then((rose) => {
        if (rose) {
          setRose(rose)
          setFallenPetals(Array.from({ length: 40 - rose.petalsRemaining }, (_, i) => i))
        }
      })
      .catch(() => {})
  }, [setRose, setFallenPetals])

  // INTRO_ANIMATION → ROSE_REVEAL
  useEffect(() => {
    if (phase !== "INTRO_ANIMATION") return
    const t = setTimeout(() => setPhase("ROSE_REVEAL"), 2800)
    return () => clearTimeout(t)
  }, [phase, setPhase])

  // Lower dome on all non-idle/caring phases
  useEffect(() => {
    if (phase !== "IDLE" && phase !== "CARING") {
      setDomeLifted(false)
    }
  }, [phase, setDomeLifted])

  // ── Hold mechanic ──────────────────────────────────────────────

  const cancelHold = useCallback(() => {
    if (holdRafRef.current) cancelAnimationFrame(holdRafRef.current)
    holdRafRef.current = null
    holdStartRef.current = null
    setHoldProgress(0)
    setIsHolding(false)
  }, [setHoldProgress, setIsHolding])

  // ── Magic bloom sequence ───────────────────────────────────────
  // Hold the rose → glass lifts, stars whirl, light sparkles burst, the rose
  // blooms up close, and a new star is born — then everything settles back.
  const runMagic = useCallback(() => {
    setMagicActive(true)
    setDomeLifted(true)
    setViewPreset("close")
    triggerBloom()

    // Press-and-hold IS tending the rose: record the visit. This drops petals
    // for missed days, advances the chapter, and surfaces any scheduled
    // message / moment the owner pre-loaded for today.
    recordVisit()
      .then((result) => {
        setRose(result.rose)
        setDailyMessage(result.message)
        setFallenPetals(Array.from({ length: 40 - result.rose.petalsRemaining }, (_, i) => i))
        queryClient.invalidateQueries({ queryKey: ["rose-state"] })
        if (result.moment) {
          // Reveal it once the bloom has settled
          window.setTimeout(() => setActiveMoment(result.moment), 1700)
        }
      })
      .catch(() => {})

    // A beat after the bloom begins, a new star is born into the constellation
    window.setTimeout(() => {
      createMemoryStar({
        title: "A new star",
        date: new Date().toISOString().slice(0, 10),
        memory: "Born from a moment of magic.",
        photos: [],
        position: [0, 0, 0],
      })
        .then(() => queryClient.invalidateQueries({ queryKey: ["memory-stars"] }))
        .catch(() => {})
    }, 900)

    // Settle everything back to normal
    window.setTimeout(() => {
      setMagicActive(false)
      setViewPreset("default")
    }, 4200)
  }, [setMagicActive, setDomeLifted, setViewPreset, triggerBloom, queryClient, setRose, setDailyMessage, setFallenPetals, setActiveMoment])

  const startHold = useCallback(() => {
    if (phase !== "IDLE" || magicActive) return
    holdStartRef.current = performance.now()
    setIsHolding(true)

    const tick = () => {
      if (!holdStartRef.current) return
      const elapsed  = performance.now() - holdStartRef.current
      const progress = Math.min(elapsed / HOLD_DURATION_MS, 1)
      setHoldProgress(progress)

      if (progress >= 1) {
        // Hold complete — play the magic bloom sequence
        setHoldProgress(0)
        setIsHolding(false)
        holdStartRef.current = null
        runMagic()
      } else {
        holdRafRef.current = requestAnimationFrame(tick)
      }
    }
    holdRafRef.current = requestAnimationFrame(tick)
  }, [phase, magicActive, setHoldProgress, setIsHolding, runMagic])

  const endHold = useCallback(() => {
    if (!holdStartRef.current) return
    const elapsed = performance.now() - holdStartRef.current
    cancelHold()

    // Short tap (< 200ms) = toggle dome lift
    if (elapsed < CLICK_THRESHOLD_MS && phase === "IDLE") {
      setDomeLifted(!domeLifted)
    }
  }, [cancelHold, phase, domeLifted, setDomeLifted])

  if (phase === "LOADING") {
    return <Preloader onComplete={() => setPhase("VIDEO")} />
  }

  const show3D = phase !== "VIDEO"

  return (
    <div className="fixed inset-0" style={{ background: "#0a0205" }}>
      {show3D && (
        <SceneErrorBoundary>
          <SceneRoot
            onDomePointerDown={startHold}
            onDomePointerUp={endHold}
          />
        </SceneErrorBoundary>
      )}

      {/* Hold progress ring — visible while holding */}
      <HoldRing progress={holdProgress} />

      <IntroVideo />
      <RoseReveal />
      <NavigationHUD />
      <InstructionsPanel />
      <CarePanel />
      <MomentPanel />
      <RevivalPanel />
      <FinalDeathScene />
      <LettersPanel />
      <MemoryStarPanel />
      <GrowthSimulator />
      <MissedDayPreview />
      <ViewControls />

      {phase === "IDLE" && <IdleHint />}
    </div>
  )
}

function IdleHint() {
  return (
    <div
      className="fixed bottom-9 left-1/2 pointer-events-none z-20"
      style={{ transform: "translateX(-50%)" }}
    >
      <p
        style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: "15px",
          letterSpacing: "0.26em",
          color: "rgba(232, 200, 130, 0.95)",
          textTransform: "uppercase",
          textShadow: "0 0 14px rgba(201,168,76,0.6), 0 0 4px rgba(0,0,0,0.6)",
          animation: "softpulse 3.5s ease-in-out infinite",
        }}
      >
        She needs you.
      </p>
      <style>{`
        @keyframes softpulse {
          0%, 100% { opacity: 0.7; }
          50%       { opacity: 1; }
        }
      `}</style>
    </div>
  )
}

export function ExperiencePage() {
  return (
    <QueryProvider>
      <ExperienceInner />
    </QueryProvider>
  )
}
