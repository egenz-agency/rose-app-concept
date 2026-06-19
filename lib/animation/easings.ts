// All custom cubic-bezier curves — never use linear or ease-in-out
export const EASE_CINEMATIC = [0.32, 0.72, 0, 1] as const
export const EASE_SPRING = [0.175, 0.885, 0.32, 1.275] as const
export const EASE_SOFT = [0.25, 0.46, 0.45, 0.94] as const
export const EASE_HEAVY = [0.77, 0, 0.175, 1] as const
export const EASE_ELASTIC_OUT = [0.34, 1.56, 0.64, 1] as const

// Framer Motion transition presets
export const TRANSITION_CINEMATIC = {
  duration: 1.2,
  ease: EASE_CINEMATIC,
}

export const TRANSITION_PANEL = {
  duration: 0.7,
  ease: EASE_SOFT,
}

export const TRANSITION_STAGGER = {
  staggerChildren: 0.08,
  delayChildren: 0.2,
}

export const TRANSITION_ITEM = {
  duration: 0.6,
  ease: EASE_SOFT,
}
