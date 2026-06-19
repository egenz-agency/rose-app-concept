"use client"
import { useRef, Suspense } from "react"
import { useFrame } from "@react-three/fiber"
import { Environment } from "@react-three/drei"
import * as THREE from "three"
import { useSceneStore } from "@/lib/store/sceneStore"

// three r155+ uses physically-based light units: point/spot intensity is in
// candela and falls off with decay, so values need to be much larger than the
// old legacy units. These are tuned for the rose sitting ~5–6 units from camera.
export function SceneLighting() {
  const goldLightRef = useRef<THREE.PointLight>(null)
  const phase = useSceneStore((s) => s.phase)

  // Pulse the gold key light subtly for a breathing, magical feel
  useFrame(({ clock }) => {
    if (!goldLightRef.current) return
    const t = clock.getElapsedTime()
    const base = phase === "CARING" ? 60 : 40
    goldLightRef.current.intensity = base + Math.sin(t * 0.8) * 6
  })

  return (
    <>
      {/* Warm ambient lift so nothing is ever pure black */}
      <ambientLight intensity={0.6} color="#3a1418" />

      {/* Soft hemisphere — warm from above, dark from below */}
      <hemisphereLight intensity={0.25} color="#5a2030" groundColor="#0a0205" />

      {/* Gold overhead — main key light, pulsing */}
      <pointLight
        ref={goldLightRef}
        position={[0, 6, 2]}
        color="#ffce8a"
        intensity={40}
        distance={28}
        decay={2}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-near={0.5}
        shadow-camera-far={20}
      />

      {/* Directional fill (lux units — distance-independent, very predictable) */}
      <directionalLight position={[2.5, 5, 4]} intensity={1.6} color="#ffd9a0" />

      {/* Crimson rim from left-back — subtle mood accent only */}
      <pointLight position={[-4, 3, -3]} color="#ff2a4a" intensity={8} distance={10} decay={2} />

      {/* Neutral-warm key fills from front */}
      <pointLight position={[2.2, 2.4, 4.5]} color="#fff1dc" intensity={15} distance={16} decay={2} />
      <pointLight position={[-1.8, 1.8, 2.2]} color="#ffe6cf" intensity={12} distance={9} decay={2} />

      {/* Environment map for glass refraction + metal reflections.
          Isolated in its own Suspense so a slow HDR fetch can never blank the scene. */}
      <Suspense fallback={null}>
        <Environment preset="night" />
      </Suspense>
    </>
  )
}
