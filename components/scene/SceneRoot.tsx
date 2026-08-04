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
import { Constellation } from "./Constellation"
import { ConstellationCamera } from "./ConstellationCamera"
import { CosmicBackdrop } from "./CosmicBackdrop"
import { silenceRapierDeprecation } from "@/lib/scene/silenceRapierDeprecation"

// Drop the one noisy (harmless) Rapier init deprecation before <Physics> mounts.
silenceRapierDeprecation()

interface SceneRootProps {
  onDomePointerDown?: () => void
  onDomePointerUp?: () => void
}

export function SceneRoot({ onDomePointerDown, onDomePointerUp }: SceneRootProps) {
  return (
    <Canvas
      // `far` reaches past the constellation suspended high above the rose and
      // the sky sphere enclosing them both — they share one continuous world.
      camera={{ position: [0, 2.8, 6.5], fov: 50, near: 0.1, far: 160 }}
      gl={{
        antialias: true,
        toneMapping: 4, // ACESFilmicToneMapping
        toneMappingExposure: 1.05,
        powerPreference: "high-performance",
        // Keeps the frame readable after it is drawn, which is what lets the
        // finished sky be saved as a picture. Costs a little driver headroom.
        preserveDrawingBuffer: true,
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
          <ConstellationCamera />

          {/* Deep space around the whole world — nebulae, distant stars, dust.
              Faint down at the rose, the entire environment up at the sky. */}
          <CosmicBackdrop />

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

          {/* The memory constellation, suspended in the same world far above the
              rose. Only the camera ever moves between them. */}
          <Suspense fallback={null}>
            <Constellation />
          </Suspense>

          <DustParticles />
          <MagicSparkles />
        </Physics>
        <PostProcessing />
      </Suspense>
    </Canvas>
  )
}
