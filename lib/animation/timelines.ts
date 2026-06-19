// GSAP timeline configs — pure data, no DOM refs
// CameraRig and scene components read these to build their timelines

export const CAMERA_POSITIONS = {
  cinematic_start: { x: 0, y: 10, z: 0.1, fov: 25 },
  intro:           { x: 0, y: 4.5, z: 9, fov: 42 },
  // Resting vantage — zoomed in but far enough to frame the WHOLE rose inside
  // the dome, angled slightly down toward the bloom (the top matters most)
  idle:            { x: 0, y: 1.45, z: 3.35, fov: 46 },
  focus:           { x: 0, y: 1.4, z: 2.9, fov: 42 },
  revival:         { x: 1.5, y: 4.0, z: 7, fov: 40 },
  final_death:     { x: 0, y: 6, z: 12, fov: 55 },
} as const

export const TIMELINE_DURATIONS = {
  intro_sweep:    2.0,
  rose_glow_on:   1.5,
  panel_open:     0.7,
  petal_fall:     2.5,
  revival_bloom:  3.0,
  final_death:    5.0,
} as const

export const BLOOM_INTENSITIES = {
  idle:       1.2,
  care:       2.5,
  revival:    4.0,
  final:      6.0,
  dead:       0.3,
} as const
