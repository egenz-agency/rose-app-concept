"use client"
import { useEffect, useRef, useCallback, useState } from "react"
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
import { ConstellationHUD } from "@/components/ui/ConstellationHUD"
import { MemoryCapsulePanel } from "@/components/ui/MemoryCapsulePanel"
import { ConstellationGuide } from "@/components/ui/ConstellationGuide"
import { ConstellationPreview } from "@/components/ui/ConstellationPreview"
import { ConstellationOverture } from "@/components/ui/ConstellationOverture"
import { ShareSky } from "@/components/ui/ShareSky"
import { StarWokeToast } from "@/components/ui/StarWokeToast"
import { NavigationHUD } from "@/components/ui/NavigationHUD"
import { InstallAppButton } from "@/components/ui/InstallAppButton"
import { GrowthSimulator } from "@/components/ui/GrowthSimulator"
import { MissedDayPreview } from "@/components/ui/MissedDayPreview"
import { MissYouButton } from "@/components/ui/MissYouButton"
import { MomentPanel } from "@/components/ui/MomentPanel"
import { HoldRing } from "@/components/ui/HoldRing"
import { ViewControls } from "@/components/ui/ViewControls"
import { SceneErrorBoundary } from "@/components/scene/SceneErrorBoundary"
import { useSceneStore, type TenantConfig } from "@/lib/store/sceneStore"
import { fetchRoseState, recordVisit } from "@/lib/data/roseApi"
import { useQueryClient } from "@tanstack/react-query"
import { differenceInHours, parseISO } from "date-fns"

const HOLD_DURATION_MS = 1500
const CLICK_THRESHOLD_MS = 200 // pointer released before this → treat as click (dome lift)
const MAX_PETALS = 40
// One petal falls for every HOURS_PER_PETAL hours the rose goes untended.
const HOURS_PER_PETAL = 3

// How many petals should be lying on the dome floor given how long the rose has
// gone untended: one per 3 whole hours since the last visit, capped at MAX_PETALS.
function fallenFromElapsed(lastVisited: string | null): number {
  if (!lastVisited) return 0
  const hours = differenceInHours(new Date(), parseISO(lastVisited))
  return Math.max(0, Math.min(MAX_PETALS, Math.floor(hours / HOURS_PER_PETAL)))
}

const SceneRoot = dynamic(
  () => import("@/components/scene/SceneRoot").then((m) => m.SceneRoot),
  { ssr: false }
)

function ExperienceInner({ slug, config }: { slug?: string; config?: TenantConfig | null }) {
  // Pin the tenant slug + customization into the store ONCE, synchronously on
  // first render — before any data/media effect runs — so roseApi routes calls to
  // the right backend and IntroVideo picks up the tenant's video/song.
  useState(() => {
    useSceneStore.setState({ tenantSlug: slug ?? null, tenantConfig: config ?? null })
    return null
  })

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
  const universeMode    = useSceneStore((s) => s.universeMode)

  // While the camera is up with the constellation, everything that belongs to
  // the rose steps out of the frame.
  const atTheRose = universeMode === "rose"

  const queryClient     = useQueryClient()

  const holdStartRef    = useRef<number | null>(null)
  const holdRafRef      = useRef<number | null>(null)

  // Load rose state on mount
  useEffect(() => {
    fetchRoseState()
      .then((rose) => {
        if (rose) {
          setRose(rose)
          // Seed the floor with however many petals have fallen since her last
          // visit (one per 3 hours). These settle silently — they fell while away.
          const n = fallenFromElapsed(rose.lastVisited)
          setFallenPetals(Array.from({ length: n }, (_, i) => i))
        }
      })
      .catch(() => {})
  }, [setRose, setFallenPetals])

  // While the experience is open, drop one more petal every 3 hours the rose
  // stays untended, until the floor is full. Runs off real elapsed time so it
  // stays correct across reloads and matches what the Preview button shows.
  useEffect(() => {
    const tick = () => {
      const { rose, petalsFallen, addFallenPetal } = useSceneStore.getState()
      if (!rose) return
      const target = fallenFromElapsed(rose.lastVisited)
      if (petalsFallen.length < target && petalsFallen.length < MAX_PETALS) {
        addFallenPetal(petalsFallen.length) // one at a time → each drops gracefully
      }
    }
    const id = window.setInterval(tick, 60_000) // check once a minute
    return () => window.clearInterval(id)
  }, [])

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
  // blooms up close — then everything settles back.
  const runMagic = useCallback(() => {
    setMagicActive(true)
    setDomeLifted(true)
    setViewPreset("close")
    triggerBloom()
    // Blooming clears the floor: the fallen petals return to the rose.
    setFallenPetals([])

    // Press-and-hold IS tending the rose: record the visit. This advances the
    // chapter and surfaces any scheduled message / moment the owner pre-loaded
    // for today. Tending resets last_visited, so the floor stays clear.
    recordVisit()
      .then((result) => {
        setRose(result.rose)
        setDailyMessage(result.message)
        setFallenPetals([])
        queryClient.invalidateQueries({ queryKey: ["rose-state"] })
        if (result.moment) {
          // Reveal it once the bloom has settled
          window.setTimeout(() => setActiveMoment(result.moment), 1700)
        }
      })
      .catch(() => {})

    // Settle everything back to normal
    window.setTimeout(() => {
      setMagicActive(false)
      setViewPreset("default")
    }, 4200)
  }, [setMagicActive, setDomeLifted, setViewPreset, triggerBloom, queryClient, setRose, setDailyMessage, setFallenPetals, setActiveMoment])

  const startHold = useCallback(() => {
    if (phase !== "IDLE" || magicActive || !atTheRose) return
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
  }, [phase, magicActive, atTheRose, setHoldProgress, setIsHolding, runMagic])

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
      <ConstellationHUD />
      <MemoryCapsulePanel />
      <ConstellationGuide />
      <ConstellationPreview />
      <ConstellationOverture />
      <ShareSky />
      <StarWokeToast />
      <GrowthSimulator />
      <MissedDayPreview />
      <MissYouButton />
      <ViewControls />

      {/* Add-to-home-screen, top-left (the only corner the HUD, view controls
          and "I miss you" button leave free). Only while IDLE, so it can never
          sit over the intro or a cinematic — and it removes itself once the app
          is installed. On iPhone this is the ONLY way to get notifications. */}
      {phase === "IDLE" && atTheRose && (
        <InstallAppButton
          compact
          label="Add to home screen"
          style={{ position: "fixed", top: 24, left: 20, zIndex: 30 }}
        />
      )}

      {phase === "IDLE" && atTheRose && <IdleHint />}
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

export function ExperiencePage({ slug, config }: { slug?: string; config?: TenantConfig | null } = {}) {
  return (
    <QueryProvider>
      <ExperienceInner slug={slug} config={config} />
    </QueryProvider>
  )
}
