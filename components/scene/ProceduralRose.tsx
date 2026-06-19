"use client"
import { useRef, useMemo, useEffect } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { gsap } from "gsap"
import { useSceneStore } from "@/lib/store/sceneStore"

interface ProceduralRoseProps {
  petalRatio: number
  isDead: boolean
  position: [number, number, number]
}

const TOTAL_PETALS = 40

// Petal layer config: [count, radius, height, scale, color]
const PETAL_LAYERS = [
  { count: 5,  radius: 0.12, y: 0.00, scaleX: 0.14, scaleY: 0.24, color: "#3d0015" },
  { count: 8,  radius: 0.24, y: 0.06, scaleX: 0.20, scaleY: 0.30, color: "#6b0025" },
  { count: 10, radius: 0.40, y: 0.10, scaleX: 0.26, scaleY: 0.36, color: "#8b0030" },
  { count: 10, radius: 0.58, y: 0.07, scaleX: 0.30, scaleY: 0.38, color: "#a01035" },
  { count: 7,  radius: 0.74, y: 0.01, scaleX: 0.36, scaleY: 0.40, color: "#c01845" },
]

function buildPetalShape() {
  const shape = new THREE.Shape()
  shape.moveTo(0, 0)
  shape.bezierCurveTo(0.5, 0.2, 0.6, 0.8, 0, 1.2)
  shape.bezierCurveTo(-0.6, 0.8, -0.5, 0.2, 0, 0)
  return shape
}

export function ProceduralRose({ petalRatio, isDead, position }: ProceduralRoseProps) {
  const groupRef = useRef<THREE.Group>(null)
  const petalRefs = useRef<(THREE.Mesh | null)[]>(Array(TOTAL_PETALS).fill(null))
  const petalsFallenStore = useSceneStore((s) => s.petalsFallen)
  const simulationPetals  = useSceneStore((s) => s.simulationPetals)
  // In simulation mode derive fallen indices from the simulation petal count
  const petalsFallen = simulationPetals !== null
    ? Array.from({ length: TOTAL_PETALS - simulationPetals }, (_, i) => i)
    : petalsFallenStore

  const roseTexture = useMemo(() => {
    const loader = new THREE.TextureLoader()
    return loader.load("/textures/Rose.png")
  }, [])

  // Build petal geometry and positions
  const petals = useMemo(() => {
    const result: {
      position: [number, number, number]
      rotation: [number, number, number]
      color: string
      scaleX: number
      scaleY: number
      index: number
    }[] = []

    let idx = 0
    PETAL_LAYERS.forEach((layer) => {
      for (let i = 0; i < layer.count; i++) {
        const angle = (i / layer.count) * Math.PI * 2 + (idx % 2 === 0 ? 0 : Math.PI / layer.count)
        const x = Math.cos(angle) * layer.radius
        const z = Math.sin(angle) * layer.radius
        const rotY = -angle + Math.PI / 2
        const lean = 0.3 + layer.radius * 0.8  // outer petals lean more

        result.push({
          position: [x, layer.y, z],
          rotation: [lean, rotY, 0],
          color: layer.color,
          scaleX: layer.scaleX,
          scaleY: layer.scaleY,
          index: idx,
        })
        idx++
      }
    })
    return result
  }, [])

  // React to fallen petals — animate each fallen petal dropping
  useEffect(() => {
    petalsFallen.forEach((idx) => {
      const mesh = petalRefs.current[idx]
      if (!mesh) return
      gsap.to(mesh.position, {
        y: mesh.position.y - 2.5,
        duration: 2.5,
        ease: "power2.in",
        delay: Math.random() * 0.5,
      })
      gsap.to(mesh.rotation, {
        x: mesh.rotation.x + Math.random() * Math.PI,
        z: mesh.rotation.z + (Math.random() - 0.5) * Math.PI,
        duration: 2.5,
        ease: "power1.in",
      })
      gsap.to(mesh.scale, {
        x: 0,
        y: 0,
        z: 0,
        duration: 0.3,
        delay: 2.2,
      })
    })
  }, [petalsFallen])

  // Breathing animation — each petal oscillates slightly
  useFrame(({ clock }) => {
    if (!groupRef.current) return
    const t = clock.getElapsedTime()
    petals.forEach((_, i) => {
      const mesh = petalRefs.current[i]
      if (!mesh || petalsFallen.includes(i)) return
      mesh.position.y += Math.sin(t * 0.5 + i * 0.3) * 0.00015
    })

    // Stem sway
    if (groupRef.current) {
      groupRef.current.rotation.z = Math.sin(t * 0.3) * 0.008
    }
  })

  const stemColor = isDead ? "#1a1a0a" : "#1a3d0a"
  const emissiveIntensity = isDead ? 0 : 0.55

  return (
    <group ref={groupRef} position={position}>
      {/* Stem */}
      <mesh position={[0, -0.55, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.04, 1.1, 8]} />
        <meshStandardMaterial color={stemColor} roughness={0.8} />
      </mesh>

      {/* Leaves */}
      {!isDead && [
        { pos: [0.18, -0.25, 0], rot: [0, 0, 0.6] },
        { pos: [-0.15, -0.45, 0.08], rot: [0, 0.3, -0.5] },
      ].map((leaf, i) => (
        <mesh key={i} position={leaf.pos as [number, number, number]} rotation={leaf.rot as [number, number, number]}>
          <sphereGeometry args={[0.12, 6, 4, 0, Math.PI, 0, Math.PI]} />
          <meshStandardMaterial color="#1a4a10" roughness={0.7} side={THREE.DoubleSide} />
        </mesh>
      ))}

      {/* Rose head center */}
      <mesh position={[0, 0.08, 0]}>
        <sphereGeometry args={[0.09, 8, 8]} />
        <meshStandardMaterial
          color={isDead ? "#1a0005" : "#5d0018"}
          roughness={0.4}
          emissive={isDead ? "#000000" : "#cc0030"}
          emissiveIntensity={emissiveIntensity * 2.5}
        />
      </mesh>

      {/* Petals */}
      {petals.map((p) => (
        <mesh
          key={p.index}
          ref={(el: THREE.Mesh | null) => { petalRefs.current[p.index] = el }}
          position={p.position}
          rotation={p.rotation}
          scale={[p.scaleX, p.scaleY, p.scaleX]}
          castShadow
          visible={!petalsFallen.includes(p.index)}
        >
          <sphereGeometry args={[1, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
          <meshStandardMaterial
            map={roseTexture}
            color={p.color}
            roughness={0.4}
            metalness={0.08}
            emissive={isDead ? "#000" : "#cc0030"}
            emissiveIntensity={emissiveIntensity}
            side={THREE.DoubleSide}
            transparent
            opacity={isDead ? 0.4 : 1}
          />
        </mesh>
      ))}
    </group>
  )
}
