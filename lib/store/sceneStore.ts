"use client"
import { create } from "zustand"
import { subscribeWithSelector } from "zustand/middleware"
import type { ScenePhase, RoseState, GardenStage } from "@/types/scene"
import type { Moment } from "@/lib/supabase/queries"

/**
 * Where the camera is in the one continuous world the rose and the constellation
 * share. There is no second scene and no second page — only a point of view that
 * travels up from the flower toward the sky above it, and back down again.
 */
export type UniverseMode = "rose" | "ascending" | "universe" | "descending"

// Per-tenant customization the gift experience reads (multi-tenant product).
export interface TenantConfig {
  recipientName: string | null
  giverName: string | null
  introVideoUrl: string | null
  songUrl: string | null
}

interface SceneStore {
  phase: ScenePhase
  previousPhase: ScenePhase | null
  rose: RoseState | null
  dailyMessage: string | null
  isFirstVisitToday: boolean
  petalsFallen: number[]
  // The petal index that just fell *now* (via addFallenPetal), or null when the
  // set was synced in bulk (setFallenPetals). Only this one animates its fall —
  // petals that already fell while she was away appear resting on the floor.
  lastAddedPetal: number | null
  isAudioEnabled: boolean
  activePanelId: string | null
  isLoading: boolean
  simulationPetals: number | null
  // Dome lift state — shared between RoseDome and ExperiencePage
  domeLifted: boolean
  // Bloom trigger — set true to fire rose bloom animation
  bloomTriggered: boolean
  // Hold progress 0-1 driven from ExperiencePage
  holdProgress: number
  isHolding: boolean
  // Camera view presets — bumped via setViewPreset, consumed by CameraControls
  viewPreset: "close" | "wide" | "default" | null
  viewTick: number
  // Magic bloom sequence (hold the rose) — stars whirl, sparkles, a star is born
  magicActive: boolean
  // Emergence — the grand reveal when "Begin the magic" is clicked for the first time.
  // While true a cinematic camera sweep plays and the dome is lifted forever.
  isEmergence: boolean
  // Once emergence completes the dome is permanently gone and the rose spins freely.
  domeRemoved: boolean
  // A scheduled moment (photo / clip / message) currently being shown after tending.
  activeMoment: Moment | null
  // The gift's tenant slug when running as the multi-tenant product (/r/[slug]).
  // null = legacy single-tenant mode (the owner's personal gift at "/").
  tenantSlug: string | null
  // Per-tenant customization (intro video, song, names). null in legacy mode.
  tenantConfig: TenantConfig | null

  // ── Memory Constellation ──
  // The constellation lives in the SAME 3D world as the rose, suspended high
  // above it. "ascending" / "descending" are the cinematic vertical travel; the
  // camera is scripted during those and free during "rose" / "universe".
  universeMode: UniverseMode
  // Bumped to play the "Reveal Constellation" line animation.
  revealTick: number
  // Bumped to re-frame the whole constellation (double tap).
  recenterTick: number
  // The constellation slot whose memory capsule is open, or null.
  activeSlot: number | null
  // True while the completion sequence plays (every star ignites at once).
  igniting: boolean
  // True while the first-visit guide to the sky is on screen. The sky's own
  // controls step aside for it rather than stacking underneath.
  guideActive: boolean
  // The arrival cinematic: the camera sweeps around the constellation while it
  // is shown finished. Scripted, so OrbitControls stands down for its duration.
  overtureActive: boolean
  // Which beat of the cinematic the camera has reached. Driven by the camera
  // timeline itself, so the words can never drift out of sync with the shot.
  overtureBeat: number
  // Render the sky as it will be once every star holds a memory — every star
  // warm, every connection drawn. A vision of the finished thing, never the
  // real state, and always faded back out afterwards.
  visionActive: boolean
  // Constellation growth preview. null = off (show the real sky). A number
  // stands in for `rose.totalVisits`, letting the owner walk the sky forward day
  // by day without waiting months for it. Purely local — nothing is ever written.
  previewDays: number | null
  // In preview, also write a memory into every star that wakes — the growth path
  // of a couple who tends the rose and records something each day.
  previewFill: boolean

  setPhase: (phase: ScenePhase) => void
  setRose: (rose: RoseState) => void
  setDailyMessage: (msg: string) => void
  setFirstVisitToday: (v: boolean) => void
  addFallenPetal: (idx: number) => void
  setFallenPetals: (indices: number[]) => void
  toggleAudio: () => void
  openPanel: (id: string) => void
  closePanel: () => void
  setLoading: (v: boolean) => void
  setSimulationPetals: (n: number | null) => void
  setDomeLifted: (v: boolean) => void
  triggerBloom: () => void
  resetBloom: () => void
  setHoldProgress: (v: number) => void
  setIsHolding: (v: boolean) => void
  setViewPreset: (p: "close" | "wide" | "default" | null) => void
  setMagicActive: (v: boolean) => void
  setIsEmergence: (v: boolean) => void
  setDomeRemoved: (v: boolean) => void
  setActiveMoment: (m: Moment | null) => void
  setTenantSlug: (slug: string | null) => void
  setTenantConfig: (c: TenantConfig | null) => void
  setUniverseMode: (m: UniverseMode) => void
  triggerReveal: () => void
  triggerRecenter: () => void
  setActiveSlot: (slot: number | null) => void
  setIgniting: (v: boolean) => void
  setGuideActive: (v: boolean) => void
  setPreviewDays: (d: number | null) => void
  setPreviewFill: (v: boolean) => void
  setOvertureActive: (v: boolean) => void
  setOvertureBeat: (n: number) => void
  setVisionActive: (v: boolean) => void
}

export const useSceneStore = create<SceneStore>()(
  subscribeWithSelector((set) => ({
    phase: "LOADING",
    previousPhase: null,
    rose: null,
    dailyMessage: null,
    isFirstVisitToday: false,
    petalsFallen: [],
    lastAddedPetal: null,
    isAudioEnabled: false,
    activePanelId: null,
    isLoading: true,
    simulationPetals: null,
    domeLifted: false,
    bloomTriggered: false,
    holdProgress: 0,
    isHolding: false,
    viewPreset: null,
    viewTick: 0,
    magicActive: false,
    isEmergence: false,
    domeRemoved: false,
    activeMoment: null,
    tenantSlug: null,
    tenantConfig: null,
    universeMode: "rose",
    revealTick: 0,
    recenterTick: 0,
    activeSlot: null,
    igniting: false,
    guideActive: false,
    overtureActive: false,
    overtureBeat: -1,
    visionActive: false,
    previewDays: null,
    previewFill: true,

    setPhase: (phase) =>
      set((s) => ({ phase, previousPhase: s.phase })),

    setRose: (rose) => set({ rose }),

    setDailyMessage: (msg) => set({ dailyMessage: msg }),

    setFirstVisitToday: (v) => set({ isFirstVisitToday: v }),

    // A petal falling right now → it animates its drift down to the floor.
    addFallenPetal: (idx) =>
      set((s) => ({ petalsFallen: [...new Set([...s.petalsFallen, idx])], lastAddedPetal: idx })),

    // A bulk sync (petals that fell while away, or a reset) → no fall animation;
    // they simply appear already resting on the dome floor.
    setFallenPetals: (indices) => set({ petalsFallen: indices, lastAddedPetal: null }),

    toggleAudio: () => set((s) => ({ isAudioEnabled: !s.isAudioEnabled })),

    openPanel: (id) => set({ activePanelId: id }),

    closePanel: () => set({ activePanelId: null }),

    setLoading: (v) => set({ isLoading: v }),
    setSimulationPetals: (n) => set({ simulationPetals: n }),
    setDomeLifted: (v) => set({ domeLifted: v }),
    triggerBloom: () => set({ bloomTriggered: true }),
    resetBloom: () => set({ bloomTriggered: false }),
    setHoldProgress: (v) => set({ holdProgress: v }),
    setIsHolding: (v) => set({ isHolding: v }),
    setViewPreset: (p) => set((s) => ({ viewPreset: p, viewTick: s.viewTick + 1 })),
    setMagicActive: (v) => set({ magicActive: v }),
    setIsEmergence: (v) => set({ isEmergence: v }),
    setDomeRemoved: (v) => set({ domeRemoved: v }),
    setActiveMoment: (m) => set({ activeMoment: m }),
    setTenantSlug: (slug) => set({ tenantSlug: slug }),
    setTenantConfig: (c) => set({ tenantConfig: c }),

    setUniverseMode: (m) => set({ universeMode: m }),
    triggerReveal: () => set((s) => ({ revealTick: s.revealTick + 1 })),
    triggerRecenter: () => set((s) => ({ recenterTick: s.recenterTick + 1 })),
    setActiveSlot: (slot) => set({ activeSlot: slot }),
    setIgniting: (v) => set({ igniting: v }),
    setGuideActive: (v) => set({ guideActive: v }),
    setPreviewDays: (d) => set({ previewDays: d }),
    setPreviewFill: (v) => set({ previewFill: v }),
    setOvertureActive: (v) => set({ overtureActive: v, ...(v ? { overtureBeat: -1 } : {}) }),
    setOvertureBeat: (n) => set({ overtureBeat: n }),
    setVisionActive: (v) => set({ visionActive: v }),
  }))
)

// Selectors (avoid re-render on unrelated state)
export const selectPhase = (s: SceneStore) => s.phase
export const selectRose = (s: SceneStore) => s.rose
export const selectPetalsFallen = (s: SceneStore) => s.petalsFallen
