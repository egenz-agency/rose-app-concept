"use client"
import { create } from "zustand"
import { subscribeWithSelector } from "zustand/middleware"
import type { ScenePhase, RoseState, GardenStage } from "@/types/scene"

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
  }))
)

// Selectors (avoid re-render on unrelated state)
export const selectPhase = (s: SceneStore) => s.phase
export const selectRose = (s: SceneStore) => s.rose
export const selectPetalsFallen = (s: SceneStore) => s.petalsFallen
