"use client"
import { useRef, useEffect } from "react"
import { RigidBody, RapierRigidBody } from "@react-three/rapier"
import * as THREE from "three"
import { useSceneStore } from "@/lib/store/sceneStore"

const MAX_PETALS = 40

// Petals that have fallen off the rose (one per missed day, Beauty-&-the-Beast
// style). Each newly-fallen petal is released from the bloom and drifts slowly
// down to settle on the ground below the rose.
export function PetalParticles() {
  const petalsFallen = useSceneStore((s) => s.petalsFallen)
  const bodyRefs = useRef<(RapierRigidBody | null)[]>([])
  const released = useRef<Set<number>>(new Set())

  useEffect(() => {
    // Drop any newly-fallen petals from the bloom, staggered so they cascade.
    const toRelease = petalsFallen.filter((i) => !released.current.has(i))
    toRelease.forEach((i, k) => {
      released.current.add(i)
      window.setTimeout(() => {
        const body = bodyRefs.current[i]
        if (!body) return
        const angle = Math.random() * Math.PI * 2
        const rad = 0.12 + Math.random() * 0.28
        body.setTranslation(
          { x: Math.cos(angle) * rad, y: 1.3 + Math.random() * 0.3, z: Math.sin(angle) * rad },
          true
        )
        body.setLinvel({ x: (Math.random() - 0.5) * 0.3, y: -0.05, z: (Math.random() - 0.5) * 0.3 }, true)
        body.setAngvel(
          { x: (Math.random() - 0.5) * 2.5, y: (Math.random() - 0.5) * 2.5, z: (Math.random() - 0.5) * 2.5 },
          true
        )
      }, k * 240)
    })

    // Park any petals that were removed from the set (e.g. a preview reset),
    // moving them out of sight so they can fall again on a later preview.
    released.current.forEach((i) => {
      if (!petalsFallen.includes(i)) {
        released.current.delete(i)
        const body = bodyRefs.current[i]
        if (body) body.setTranslation({ x: 0, y: -8, z: 0 }, true)
      }
    })
  }, [petalsFallen])

  return (
    <>
      {Array.from({ length: MAX_PETALS }, (_, i) => {
        const fallen = petalsFallen.includes(i)
        return (
          <RigidBody
            key={i}
            ref={(el) => { bodyRefs.current[i] = el }}
            type={fallen ? "dynamic" : "fixed"}
            position={[0, -8, 0]}          // parked out of sight until it falls
            colliders="cuboid"
            restitution={0.12}
            friction={0.9}
            linearDamping={1.9}            // high damping → slow, leaf-like drift
            angularDamping={1.1}
          >
            <mesh scale={[0.15, 0.012, 0.11]} castShadow>
              <boxGeometry />
              <meshStandardMaterial
                color="#9a0b2c"
                emissive="#43000f"
                emissiveIntensity={0.45}
                roughness={0.55}
                transparent
                opacity={fallen ? 0.92 : 0}
                side={THREE.DoubleSide}
              />
            </mesh>
          </RigidBody>
        )
      })}
    </>
  )
}
