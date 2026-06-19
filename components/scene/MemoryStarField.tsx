"use client"
import { useRef, useMemo, type MutableRefObject } from "react"
import { useFrame } from "@react-three/fiber"
import { Sphere, Billboard, Text } from "@react-three/drei"
import * as THREE from "three"
import { useQuery } from "@tanstack/react-query"
import { fetchMemoryStars } from "@/lib/supabase/queries"
import { useSceneStore } from "@/lib/store/sceneStore"
import type { StarRow } from "@/lib/supabase/queries"

// Deterministic orbit params derived from star id
function orbitParams(id: string) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return {
    radius: 4.5 + (h % 100) / 100 * 3.5,   // 4.5 – 8.0 (kept well outside the close camera)
    speed:  0.05 + (h % 50)  / 50  * 0.09,  // 0.05 – 0.14 rad/s
    yBase:  0.6  + (h % 60)  / 60  * 2.2,   // 0.6 – 2.8
    phase:  (h % 628) / 100,                  // 0 – 2π
  }
}

// ── Single orbiting star ─────────────────────────────────────────
function MemoryStar({
  star,
  posCache,
  isNewborn,
}: {
  star: StarRow
  posCache: MutableRefObject<Map<string, THREE.Vector3>>
  isNewborn: boolean
}) {
  const meshRef   = useRef<THREE.Mesh>(null)
  const openPanel = useSceneStore((s) => s.openPanel)
  const magicActive = useSceneStore((s) => s.magicActive)
  const { radius, speed, yBase, phase } = useMemo(() => orbitParams(star.id), [star.id])

  // Integrate the orbit angle so we can speed it up during the magic whirl.
  const angleRef = useRef(phase)
  const boostRef = useRef(1)
  const bornRef  = useRef(isNewborn ? 0 : 1)

  useFrame(({ clock }, delta) => {
    if (!meshRef.current) return
    const d = Math.min(delta, 0.05)
    const t = clock.getElapsedTime()

    // Whirl faster while the magic sequence is active
    const targetBoost = magicActive ? 7 : 1
    boostRef.current += (targetBoost - boostRef.current) * Math.min(1, d * 4)
    angleRef.current += speed * boostRef.current * d

    const angle = angleRef.current
    const x = Math.cos(angle) * radius
    const z = Math.sin(angle) * radius
    const y = yBase + Math.sin(t * 0.5 + phase) * 0.12
    // Unified 4-second breathing cycle
    let s = 0.9 + Math.sin(t * (Math.PI / 2)) * 0.1

    // A newly born star swells up from nothing
    if (bornRef.current < 1) {
      bornRef.current = Math.min(1, bornRef.current + d / 1.4)
      const e = 1 - Math.pow(1 - bornRef.current, 2)
      s *= e
    }

    meshRef.current.position.set(x, y, z)
    meshRef.current.scale.setScalar(s)

    // Share position so ConstellationLines can draw connecting lines
    posCache.current.set(star.id, new THREE.Vector3(x, y, z))
  })

  return (
    <group>
      <Sphere
        ref={meshRef}
        args={[0.055, 8, 8]}
        onClick={() => openPanel(`star-${star.id}`)}
        onPointerEnter={() => { document.body.style.cursor = "pointer" }}
        onPointerLeave={() => { document.body.style.cursor = "auto" }}
      >
        <meshStandardMaterial
          color="#c9a84c"
          emissive="#c9a84c"
          emissiveIntensity={1.6}
          roughness={0.1}
          metalness={0.8}
        />
      </Sphere>
      <Billboard>
        <Text
          position={[0, 0.13, 0]}
          fontSize={0.065}
          color="#f5f0e8"
          fillOpacity={0.7}
          anchorX="center"
          anchorY="bottom"
          font="/fonts/Cormorant-Italic.woff"
        >
          {star.title}
        </Text>
      </Billboard>
      <pointLight color="#c9a84c" intensity={0.4} distance={1.2} decay={2} />
    </group>
  )
}

// ── Empty-state placeholder star ─────────────────────────────────
function EmptyStar() {
  const meshRef = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    if (!meshRef.current) return
    const t = clock.getElapsedTime()
    meshRef.current.scale.setScalar(0.7 + Math.sin(t * 0.8) * 0.15)
    meshRef.current.position.x = Math.cos(t * 0.08) * 3.0
    meshRef.current.position.z = Math.sin(t * 0.08) * 3.0
    meshRef.current.position.y = 1.2 + Math.sin(t * 0.4) * 0.1
  })
  return (
    <group>
      <Sphere ref={meshRef} args={[0.045, 8, 8]}>
        <meshStandardMaterial
          color="#c9a84c"
          emissive="#c9a84c"
          emissiveIntensity={0.5}
          transparent
          opacity={0.35}
        />
      </Sphere>
      <Billboard>
        <Text
          position={[0, 0.1, 0]}
          fontSize={0.06}
          color="#f5f0e8"
          fillOpacity={0.25}
          anchorX="center"
          anchorY="bottom"
          font="/fonts/Cormorant-Italic.woff"
        >
          Waiting for your first memory.
        </Text>
      </Billboard>
    </group>
  )
}

// ── Root ─────────────────────────────────────────────────────────
export function MemoryStarField() {
  const posCache = useRef<Map<string, THREE.Vector3>>(new Map())

  const { data: stars = [] } = useQuery({
    queryKey: ["memory-stars"],
    queryFn: fetchMemoryStars,
    staleTime: Infinity,
  })

  // The most recently created star (within the last few seconds) plays a
  // birth scale-in — this is the "a new star is born" beat of the magic.
  const newbornId = useMemo(() => {
    let newest: StarRow | null = null
    for (const s of stars) {
      if (!newest || s.created_at > newest.created_at) newest = s
    }
    if (newest && Date.now() - new Date(newest.created_at).getTime() < 8000) {
      return newest.id
    }
    return null
  }, [stars])

  return (
    <>
      {stars.length === 0 && <EmptyStar />}
      {stars.map((star) => (
        <MemoryStar
          key={star.id}
          star={star}
          posCache={posCache}
          isNewborn={star.id === newbornId}
        />
      ))}
    </>
  )
}
