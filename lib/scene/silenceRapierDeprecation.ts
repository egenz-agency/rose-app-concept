// Rapier's WASM (`@dimforge/rapier3d-compat`, used by `@react-three/rapier`)
// logs `using deprecated parameters for the initialization function; pass a
// single object instead` when <Physics> initializes. We don't control how
// @react-three/rapier calls Rapier's init, so we can't fix it via props — this
// filters ONLY that exact upstream line (everything else passes through) to keep
// the console clean. Remove once @react-three/rapier updates its Rapier init.
let patched = false

export function silenceRapierDeprecation() {
  if (patched || typeof window === "undefined") return
  patched = true
  const original = console.warn.bind(console)
  const NEEDLE = "deprecated parameters for the initialization function"
  console.warn = (...args: unknown[]) => {
    if (typeof args[0] === "string" && args[0].includes(NEEDLE)) return
    original(...args)
  }
}
