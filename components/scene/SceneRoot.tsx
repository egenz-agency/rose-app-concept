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
      <Suspense fallback={null}>
        <Physics gravity={[0, -1.2, 0]} paused={false}>
          {/* Lighting + camera never suspend — keep them outside any loader boundary */}
          <SceneLighting />
          <CameraRig />
          <CameraControls />

          {/* Each asset loader gets its OWN Suspense boundary so a slow or broken
              load (GLB, troika font, HDR) can never blank the whole scene. */}
          <Suspense fallback={null}>
            <RoseDome
              onDomePointerDown={onDomePointerDown}
              onDomePointerUp={onDomePointerUp}
            />
          </Suspense>

          <Suspense fallback={null}>
            <MemoryStarField />
          </Suspense>

          <DustParticles />
          <MagicSparkles />
        </Physics>
        <PostProcessing />
      </Suspense>
    </Canvas>
  )
}
