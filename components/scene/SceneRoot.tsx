"use client"
import { Canvas } from "@react-three/fiber"
import { Physics } from "@react-three/rapier"
import { Suspense } from "react"
import { SceneLighting } from "./SceneLighting"
import { CameraRig } from "./CameraRig"
import { CameraControls } from "./CameraControls"
import { RoseDome } from "./RoseDome"
import { DustParticles } from "./DustParticles"
import { MagicSparkles } from "./MagicSparkles"
import { PostProcessing } from "./PostProcessing"
import { MemoryStarField } from "./MemoryStarField"

interface SceneRootProps {
  onDomePointerDown?: () => void
  onDomePointerUp?: () => void
}

export function SceneRoot({ onDomePointerDown, onDomePointerUp }: SceneRootProps) {
  return (
    <Canvas
      camera={{ position: [0, 2.8, 6.5], fov: 50, near: 0.1, far: 100 }}
      gl={{
        antialias: true,
        toneMapping: 4, // ACESFilmicToneMapping
        toneMappingExposure: 1.05,
        powerPreference: "high-performance",
      }}
      shadows
      dpr={[1, 1.75]}
      style={{ position: "absolute", inset: 0 }}
    >
      {/* Lighting + camera must NEVER live behind a loader boundary. Keeping them
          as direct children of the Canvas means CameraRig stays mounted even while
          the GLB, fonts, HDR, or rapier's WASM are still resolving. Previously they
          sat inside the Physics <Suspense>; a mid-transition suspend would unmount
          CameraRig and strip the emergence sweep's completion hand-off, leaving the
          reveal stuck (rose never framed / black screen). */}
      <SceneLighting />
      <CameraRig />
      <CameraControls />

      {/* Physics only wraps the bodies that need it (the rose + falling petals),
          inside its own Suspense so rapier's async init can't blank the scene. */}
      <Suspense fallback={null}>
        <Physics gravity={[0, -1.2, 0]} paused={false}>
          <Suspense fallback={null}>
            <RoseDome
              onDomePointerDown={onDomePointerDown}
              onDomePointerUp={onDomePointerUp}
            />
          </Suspense>
        </Physics>
      </Suspense>

      <Suspense fallback={null}>
        <MemoryStarField />
      </Suspense>

      <DustParticles />
      <MagicSparkles />

      <Suspense fallback={null}>
        <PostProcessing />
      </Suspense>
    </Canvas>
  )
}
