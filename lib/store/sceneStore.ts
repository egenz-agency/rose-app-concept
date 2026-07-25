"use client"
import { create } from "zustand"
import { subscribeWithSelector } from "zustand/middleware"
import type { ScenePhase, RoseState, GardenStage } from "@/types/scene"
import type { Moment, DateInvitation } from "@/lib/supabase/queries"

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
  // A date invitation currently being shown (interactive RSVP in the envelope).
  activeInvitation: DateInvitation | null

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
  setActiveInvitation: (i: DateInvitation | null) => void
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
    activeInvitation: null,

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
    setActiveInvitation: (i) => set({ activeInvitation: i }),
  }))
)

if (typeof window !== "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(window as any).__store = useSceneStore
}

// Selectors (avoid re-render on unrelated state)
export const selectPhase = (s: SceneStore) => s.phase
export const selectRose = (s: SceneStore) => s.rose
export const selectPetalsFallen = (s: SceneStore) => s.petalsFallen
