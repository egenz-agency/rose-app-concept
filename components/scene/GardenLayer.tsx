"use client"
import { useMemo } from "react"
import { Sphere, Cylinder } from "@react-three/drei"
import * as THREE from "three"
import { useSceneStore } from "@/lib/store/sceneStore"

// Garden progressively expands: 0=bare, 1=flowers, 2=butterflies, 3=larger, 4=greenhouse
export function GardenLayer() {
  const rose = useSceneStore((s) => s.rose)
  const stage = rose?.gardenStage ?? 0

  const flowerPositions = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => {
      const angle = (i / 12) * Math.PI * 2
      const r = 2.2 + Math.random() * 0.8
      return {
        x: Math.cos(angle) * r,
        z: Math.sin(angle) * r,
        hue: [0, 280, 200, 40, 320][Math.floor(Math.random() * 5)],
        scale: 0.5 + Math.random() * 0.5,
      }
    }), [])

  if (stage === 0) return null

  return (
    <group>
      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial
          color={stage >= 3 ? "#0d2a05" : "#0a1a03"}
          roughness={0.95}
        />
      </mesh>

      {/* Stage 1+: Small flowers around the dome */}
      {stage >= 1 && flowerPositions.map((f, i) => (
        <group key={i} position={[f.x, 0, f.z]} scale={f.scale}>
          {/* Stem */}
          <Cylinder args={[0.015, 0.015, 0.3, 6]} position={[0, 0.15, 0]}>
            <meshStandardMaterial color="#1a4a10" />
          </Cylinder>
          {/* Head */}
          <Sphere args={[0.08, 8, 6]} position={[0, 0.32, 0]}>
            <meshStandardMaterial
              color={new THREE.Color().setHSL(f.hue / 360, 0.7, 0.45).getStyle()}
              emissive={new THREE.Color().setHSL(f.hue / 360, 0.6, 0.2).getStyle()}
              emissiveIntensity={0.3}
              roughness={0.5}
            />
          </Sphere>
        </group>
      ))}

      {/* Stage 2+: Glowing butterflies (simple quads) */}
      {stage >= 2 && Array.from({ length: 6 }, (_, i) => {
        const angle = (i / 6) * Math.PI * 2
        return (
          <mesh
            key={`butterfly-${i}`}
            position={[Math.cos(angle) * 3, 1.2 + Math.sin(i) * 0.3, Math.sin(angle) * 3]}
            rotation={[0, angle, 0]}
          >
            <planeGeometry args={[0.25, 0.18]} />
            <meshStandardMaterial
              color={["#f9c6e0", "#c6d4f9", "#f9f2c6"][i % 3]}
              emissive={["#ff69b4", "#6495ed", "#ffd700"][i % 3]}
              emissiveIntensity={0.8}
              transparent opacity={0.85}
              side={THREE.DoubleSide}
            />
          </mesh>
        )
      })}

      {/* Stage 3+: Outer garden bed */}
      {stage >= 3 && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
          <ringGeometry args={[2.5, 5, 32]} />
          <meshStandardMaterial color="#0f3008" roughness={0.9} />
        </mesh>
      )}

      {/* Stage 4: Greenhouse glow effect */}
      {stage >= 4 && (
        <>
          <pointLight position={[4, 2, 0]} color="#88ff44" intensity={0.8} distance={6} decay={2} />
          <pointLight position={[-4, 2, 0]} color="#ff88aa" intensity={0.6} distance={6} decay={2} />
          <pointLight position={[0, 2, 4]} color="#44aaff" intensity={0.5} distance={6} decay={2} />
        </>
      )}
    </group>
  )
}
