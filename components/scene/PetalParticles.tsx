"use client"
import { useRef, useEffect, useMemo } from "react"
import { useGLTF } from "@react-three/drei"
import * as THREE from "three"
import { gsap } from "gsap"
import { useSceneStore } from "@/lib/store/sceneStore"

const MAX_PETALS = 40

// Largest footprint (world units) a normalised petal should span.
const PETAL_SIZE = 0.16
// Resting height — just above the visible table/dome floor (surface ≈ y 0.03).
const FLOOR_Y = 0.05
// Where a petal detaches from the bloom before it drifts down.
const BLOOM_Y = 1.15

// Deterministic pseudo-random in [0,1) per (petal index, salt) — keeps each
// petal's resting slot and tumble stable across renders.
function rand(i: number, salt: number): number {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453
  return x - Math.floor(x)
}

// Petals that have fallen onto the glass-dome floor. One petal falls every 3 hours
// the rose goes untended (Beauty-&-the-Beast style); tending or blooming clears them.
// Each newly-fallen petal drifts down from the bloom and SETTLES on the floor,
// where it stays and accumulates until the rose is cared for. Driven by GSAP
// tweens (not physics) so landing is deterministic and reliable.
export function PetalParticles() {
  const petalsFallen = useSceneStore((s) => s.petalsFallen)
  const lastAddedPetal = useSceneStore((s) => s.lastAddedPetal)
  const groupRefs = useRef<(THREE.Group | null)[]>([])
  // "hidden" (parked out of sight) → "falling" (mid-drift) → "resting" (on floor)
  const petalState = useRef<("hidden" | "falling" | "resting")[]>(
    Array(MAX_PETALS).fill("hidden")
  )

  const { scene } = useGLTF("/models/rose-petals.glb")

  // Pull the modelled petal meshes (petal1…petal8), centre + normalise each so it
  // is a self-contained, origin-centred geometry we can place anywhere.
  const petalGeometries = useMemo(() => {
    const geoms: THREE.BufferGeometry[] = []
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh && /^petal/i.test(child.name)) {
        const geo = child.geometry.clone()
        geo.computeBoundingBox()
        const box = geo.boundingBox!
        const center = new THREE.Vector3()
        box.getCenter(center)
        geo.translate(-center.x, -center.y, -center.z)
        const size = new THREE.Vector3()
        box.getSize(size)
        const maxDim = Math.max(size.x, size.y, size.z) || 1
        const s = PETAL_SIZE / maxDim
        geo.scale(s, s, s)
        geo.computeVertexNormals()
        geoms.push(geo)
      }
    })
    return geoms
  }, [scene])

  // A stable resting slot for each petal: scattered around the base (golden angle)
  // and lying at a natural angle on the floor.
  const slots = useMemo(
    () =>
      Array.from({ length: MAX_PETALS }, (_, i) => {
        const angle = i * 2.399963 // golden angle
        const radius = 0.12 + ((i * 0.37) % 1) * 0.42 // 0.12–0.54, inside the dome
        return {
          x: Math.cos(angle) * radius,
          z: Math.sin(angle) * radius,
          rx: -Math.PI / 2 + (rand(i, 1) - 0.5) * 0.7, // lie broadly flat, varied
          ry: rand(i, 2) * Math.PI * 2,
          rz: (rand(i, 3) - 0.5) * 0.7,
        }
      }),
    []
  )

  useEffect(() => {
    const fallenSet = new Set(petalsFallen)
    const newly = petalsFallen.filter((i) => petalState.current[i] === "hidden")

    newly.forEach((i) => {
        // ONLY the petal that just fell (addFallenPetal) animates its drift down.
        // Everything else — petals that fell while she was away, any bulk sync —
        // appears already resting on the dome floor, no falling animation.
        const animate = i === lastAddedPetal
        const g = groupRefs.current[i]
        if (!g) return
        const slot = slots[i]
        gsap.killTweensOf(g.position)
        gsap.killTweensOf(g.rotation)

        if (animate) {
          petalState.current[i] = "falling"
          const a = Math.random() * Math.PI * 2
          const rr = 0.04 + Math.random() * 0.12
          g.position.set(Math.cos(a) * rr, BLOOM_Y, Math.sin(a) * rr)
          g.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI)
          // Drift down to the resting slot, accelerating gently like a real petal.
          gsap.to(g.position, {
            x: slot.x, y: FLOOR_Y, z: slot.z,
            duration: 2.6, ease: "power1.in",
            onComplete: () => { petalState.current[i] = "resting" },
          })
          gsap.to(g.rotation, {
            x: slot.rx, y: slot.ry, z: slot.rz,
            duration: 2.8, ease: "power2.out",
          })
        } else {
          // Place directly at rest on the floor, no animation.
          g.position.set(slot.x, FLOOR_Y, slot.z)
          g.rotation.set(slot.rx, slot.ry, slot.rz)
          petalState.current[i] = "resting"
        }
    })

    // Reset: any petal no longer in the set is parked out of sight so it can fall
    // again later. (Tending / blooming clears the whole floor this way.)
    petalState.current.forEach((st, i) => {
      if (st !== "hidden" && !fallenSet.has(i)) {
        const g = groupRefs.current[i]
        if (g) {
          gsap.killTweensOf(g.position)
          gsap.killTweensOf(g.rotation)
          g.position.set(0, -8, 0)
        }
        petalState.current[i] = "hidden"
      }
    })
  }, [petalsFallen, lastAddedPetal, slots])

  if (petalGeometries.length === 0) return null

  return (
    <>
      {Array.from({ length: MAX_PETALS }, (_, i) => {
        const fallen = petalsFallen.includes(i)
        const geometry = petalGeometries[i % petalGeometries.length]
        return (
          <group key={i} ref={(el) => { groupRefs.current[i] = el }} position={[0, -8, 0]}>
            <mesh geometry={geometry} castShadow receiveShadow>
              <meshStandardMaterial
                color="#e29aa8"
                emissive="#b0546a"
                emissiveIntensity={0.3}
                roughness={0.5}
                metalness={0.0}
                transparent
                opacity={fallen ? 0.94 : 0}
                side={THREE.DoubleSide}
              />
            </mesh>
          </group>
        )
      })}
    </>
  )
}

useGLTF.preload("/models/rose-petals.glb")
