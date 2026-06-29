"use client"
import { create } from "zustand"
import { subscribeWithSelector } from "zustand/middleware"
import type { ScenePhase, RoseState, GardenStage } from "@/types/scene"
import type { Moment } from "@/lib/supabase/queries"

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
}

export const useSceneStore = create<SceneStore>()(
  subscribeWithSelector((set) => ({
    phase: "LOADING",
    previousPhase: null,
    rose: null,
    dailyMessage: null,
    isFirstVisitToday: false,
    petalsFallen: [],
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

    setPhase: (phase) =>
      set((s) => ({ phase, previousPhase: s.phase })),

    setRose: (rose) => set({ rose }),

    setDailyMessage: (msg) => set({ dailyMessage: msg }),

    setFirstVisitToday: (v) => set({ isFirstVisitToday: v }),

    addFallenPetal: (idx) =>
      set((s) => ({ petalsFallen: [...new Set([...s.petalsFallen, idx])] })),

    setFallenPetals: (indices) => set({ petalsFallen: indices }),

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
  }))
)

// Selectors (avoid re-render on unrelated state)
export const selectPhase = (s: SceneStore) => s.phase
export const selectRose = (s: SceneStore) => s.rose
export const selectPetalsFallen = (s: SceneStore) => s.petalsFallen
