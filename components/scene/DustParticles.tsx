"use client"
import { useRef, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { useSceneStore } from "@/lib/store/sceneStore"

const COUNT = 80
const JOURNEY_DAYS = 250

export function DustParticles() {
  const ref = useRef<THREE.Points>(null)
  const phase = useSceneStore((s) => s.phase)
  const rose = useSceneStore((s) => s.rose)

  // The journey deepens the magic in the air: more visits → richer, brighter motes.
  const growth = Math.min(1, (rose?.totalVisits ?? 0) / JOURNEY_DAYS) // 0 → 1

  const { positions, velocities, colors } = useMemo(() => {
    const positions = new Float32Array(COUNT * 3)
    const velocities = new Float32Array(COUNT * 3)
    const colors = new Float32Array(COUNT * 3)

    for (let i = 0; i < COUNT; i++) {
      const theta = Math.random() * Math.PI * 2
      // Keep particles OUTSIDE the dome (radius 1.5), in the wider scene
      const r = 2.0 + Math.random() * 4.0
      positions[i * 3]     = Math.cos(theta) * r
      positions[i * 3 + 1] = Math.random() * 4.0
      positions[i * 3 + 2] = Math.sin(theta) * r

      // Very slow drift — purely ambient, not streaking
      velocities[i * 3]     = (Math.random() - 0.5) * 0.0003
      velocities[i * 3 + 1] = 0.0003 + Math.random() * 0.0004
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.0003

      // Gold motes
      const isGold = Math.random() > 0.35
      colors[i * 3]     = isGold ? 0.80 : 0.72
      colors[i * 3 + 1] = isGold ? 0.66 : 0.10
      colors[i * 3 + 2] = isGold ? 0.20 : 0.12
    }

    return { positions, velocities, colors }
  }, [])

  useFrame(() => {
    if (!ref.current) return
    const pos = ref.current.geometry.attributes.position as THREE.BufferAttribute
    const arr = pos.array as Float32Array
    const multiplier = phase === "CARING" ? 1.8 : (rose?.isDead ? 0.15 : 1.0)

    for (let i = 0; i < COUNT; i++) {
      arr[i * 3]     += velocities[i * 3] * multiplier
      arr[i * 3 + 1] += velocities[i * 3 + 1] * multiplier
      arr[i * 3 + 2] += velocities[i * 3 + 2] * multiplier

      if (arr[i * 3 + 1] > 4.2) {
        arr[i * 3 + 1] = 0.1
        const theta = Math.random() * Math.PI * 2
        const r = 2.0 + Math.random() * 4.0
        arr[i * 3]     = Math.cos(theta) * r
        arr[i * 3 + 2] = Math.sin(theta) * r
      }
    }
    pos.needsUpdate = true
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={rose?.isDead ? 0.012 : 0.018 + growth * 0.014}
        vertexColors
        transparent
        opacity={rose?.isDead ? 0.15 : 0.4 + growth * 0.35}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  )
}
