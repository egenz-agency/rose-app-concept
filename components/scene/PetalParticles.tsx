"use client"
import { useRef, useEffect, useMemo } from "react"
import { RigidBody, RapierRigidBody } from "@react-three/rapier"
import { useGLTF } from "@react-three/drei"
import * as THREE from "three"
import { useSceneStore } from "@/lib/store/sceneStore"

const MAX_PETALS = 40

// Largest footprint (in world units) a normalised petal should span. Matches the
// previous flat-box petal (~0.15 wide) so the swap keeps the same visual scale.
const PETAL_SIZE = 0.16

// Petals that have fallen off the rose onto the glass-dome floor. One petal
// falls per hour the rose goes untended (Beauty-&-the-Beast style); tending or
// blooming clears them. `petalsFallen` (store) holds the fallen indices — each
// newly-added one drifts down from the bloom and settles on the floor, where it
// stays and accumulates until the rose is cared for.
export function PetalParticles() {
  const petalsFallen = useSceneStore((s) => s.petalsFallen)
  const bodyRefs = useRef<(RapierRigidBody | null)[]>([])
  const released = useRef<Set<number>>(new Set())
  // Have we absorbed the first non-empty petalsFallen sync yet? The initial
  // state (already-missed days) must NOT animate — only single petals dropped
  // afterwards (the "Preview a missed day" button) get the falling animation.
  const inited = useRef(false)

  const { scene } = useGLTF("/models/rose-petals.glb")

  // Pull the modelled petal meshes (petal1…petal8) out of the imported scene and
  // normalise each: centre it on the origin and scale so its largest dimension is
  // PETAL_SIZE. This makes every petal a self-contained, origin-centred geometry
  // we can drop into a RigidBody regardless of where it sat in the source file.
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
    // Keep a stable order so petal index → shape mapping is deterministic.
    return geoms
  }, [scene])

  useEffect(() => {
    const newlyFallen = petalsFallen.filter((i) => !released.current.has(i))

    if (newlyFallen.length > 0) {
      // Only a SINGLE petal added after the initial sync animates a graceful
      // fall (the preview button / one missed day). The first sync and any bulk
      // change settle silently onto the ground — no start-up cascade.
      const isFirstSync = !inited.current
      inited.current = true
      const animate = !isFirstSync && newlyFallen.length === 1

      if (animate) {
        const i = newlyFallen[0]
        released.current.add(i)
        const body = bodyRefs.current[i]
        if (body) {
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
        }
      } else {
        // Place each petal at rest on the ground with no motion, scattered
        // around the base via the golden angle so they don't overlap.
        newlyFallen.forEach((i) => {
          released.current.add(i)
          const body = bodyRefs.current[i]
          if (!body) return
          const angle = i * 2.399963           // golden angle (radians)
          const rad = 0.18 + ((i * 0.11) % 0.32)
          body.setTranslation({ x: Math.cos(angle) * rad, y: 0.02, z: Math.sin(angle) * rad }, true)
          body.setLinvel({ x: 0, y: 0, z: 0 }, true)
          body.setAngvel({ x: 0, y: 0, z: 0 }, true)
        })
      }
    }

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

  if (petalGeometries.length === 0) return null

  return (
    <>
      {Array.from({ length: MAX_PETALS }, (_, i) => {
        const fallen = petalsFallen.includes(i)
        const geometry = petalGeometries[i % petalGeometries.length]
        return (
          <RigidBody
            key={i}
            ref={(el) => { bodyRefs.current[i] = el }}
            type={fallen ? "dynamic" : "fixed"}
            position={[0, -8, 0]}          // parked out of sight until it falls
            colliders="hull"
            restitution={0.05}             // barely bounces → settles on the floor
            friction={0.9}
            linearDamping={0.55}           // gentle drift, but reaches the floor in a few seconds
            angularDamping={1.4}
          >
            <mesh geometry={geometry} castShadow>
              <meshStandardMaterial
                color="#9a0b2c"
                emissive="#43000f"
                emissiveIntensity={0.45}
                roughness={0.55}
                metalness={0.0}
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

useGLTF.preload("/models/rose-petals.glb")
