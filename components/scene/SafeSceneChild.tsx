"use client"
import { Component, Suspense, type ReactNode } from "react"

// Isolates an optional/decorative scene child (e.g. PetalParticles) so that a
// slow OR failed asset load can never take down the rest of the 3D scene.
// - Suspense swallows the loading suspension (child appears a beat late).
// - The error boundary swallows a hard load failure (e.g. a missing .glb 404),
//   rendering nothing instead of propagating up and blanking the whole scene.
class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(err: unknown) {
    console.warn("[SafeSceneChild] suppressed scene-child error:", err)
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

export function SafeSceneChild({ children }: { children: ReactNode }) {
  return (
    <Boundary>
      <Suspense fallback={null}>{children}</Suspense>
    </Boundary>
  )
}
