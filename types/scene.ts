export type ScenePhase =
  | "LOADING"
  | "VIDEO"
  | "ROSE_REVEAL"
  | "INTRO_ANIMATION"
  | "INSTRUCTIONS"
  | "IDLE"
  | "CARING"
  | "VIEWING_STAR"
  | "VIEWING_LETTER"
  | "GALLERY"
  | "REVIVAL"
  | "FINAL_DEATH"

export type GardenStage = 0 | 1 | 2 | 3 | 4

export interface PetalState {
  id: number
  fallen: boolean
  fallTime: number | null
  restPosition: [number, number, number]
}

export interface MemoryStar {
  id: string
  title: string
  date: string
  memory: string
  photos: string[]
  position: [number, number, number]
}

export interface Letter {
  id: string
  title: string
  content: string
  unlockDays: number
  unlocked: boolean
}

export interface RoseState {
  petalsRemaining: number
  revivalsRemaining: number
  lastVisited: string | null
  streakDays: number
  totalVisits: number
  isDead: boolean
  isFinalDeath: boolean
  gardenStage: GardenStage
}
