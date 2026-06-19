"use client"
import { useRef, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { useSceneStore } from "@/lib/store/sceneStore"

const COUNT = 140
const CENTER_Y = 0.95

// Soft round sprite so each sparkle is a glowing dot, not a hard square.
function makeSparkTexture() {
  const s = 64
  const cv = document.createElement("canvas")
  cv.width = cv.height = s
  const ctx = cv.getContext("2d")!
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
  g.addColorStop(0, "rgba(255,255,255,1)")
  g.addColorStop(0.3, "rgba(255,255,255,0.85)")
  g.addColorStop(0.7, "rgba(255,255,255,0.18)")
  g.addColorStop(1, "rgba(255,255,255,0)")
  ctx.fillStyle = g
  ctx.fillRect(0, 0, s, s)
  const tex = new THREE.CanvasTexture(cv)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/**
 * Magic light burst that swirls up around the rose during the hold sequence.
 * Particles spiral outward from the bloom as `magicActive` ramps up, hold and
 * whirl while it stays true, then fade as it ramps back down.
 */
export function MagicSparkles() {
  const ref = useRef<THREE.Points>(null)
  const matRef = useRef<THREE.PointsMaterial>(null)
  const magicActive = useSceneStore((s) => s.magicActive)
  const life = useRef(0)
  const sparkTex = useMemo(makeSparkTexture, [])

  const { positions, colors, seed } = useMemo(() => {
    const positions = new Float32Array(COUNT * 3)
    const colors = new Float32Array(COUNT * 3)
    const seed = new Float32Array(COUNT * 4) // baseAngle, radiusMax, height, spin
    const palette = [
      [1.0, 0.84, 0.42], // gold
      [1.0, 0.45, 0.62], // rose pink
      [1.0, 0.95, 0.9], // warm white
      [1.0, 0.25, 0.32], // crimson
    ]
    for (let i = 0; i < COUNT; i++) {
      const c = palette[i % palette.length]
      colors[i * 3] = c[0]
      colors[i * 3 + 1] = c[1]
      colors[i * 3 + 2] = c[2]
      seed[i * 4] = Math.random() * Math.PI * 2
      seed[i * 4 + 1] = 0.6 + Math.random() * 3.4
      seed[i * 4 + 2] = 0.2 + Math.random() * 2.6
      seed[i * 4 + 3] = (0.6 + Math.random() * 1.8) * (Math.random() > 0.5 ? 1 : -1)
    }
    return { positions, colors, seed }
  }, [])

  useFrame((state, delta) => {
    const d = Math.min(delta, 0.05)
    const target = magicActive ? 1 : 0
    // Ramp up quickly, fall away gently
    const rate = target > life.current ? d / 0.45 : d / 1.1
    life.current += Math.sign(target - life.current) * Math.min(rate, Math.abs(target - life.current))
    const L = life.current

    if (matRef.current) matRef.current.opacity = Math.min(1, L * 1.2) * 0.9
    if (ref.current) ref.current.visible = L > 0.001
    if (L <= 0.001 || !ref.current) return

    const t = state.clock.getElapsedTime()
    const pos = ref.current.geometry.attributes.position as THREE.BufferAttribute
    const arr = pos.array as Float32Array
    const expand = 1 - Math.pow(1 - Math.min(L * 1.4, 1), 3) // easeOut

    for (let i = 0; i < COUNT; i++) {
      const baseA = seed[i * 4]
      const rMax = seed[i * 4 + 1]
      const h = seed[i * 4 + 2]
      const spin = seed[i * 4 + 3]
      const angle = baseA + t * spin
      const r = rMax * expand
      arr[i * 3] = Math.cos(angle) * r
      arr[i * 3 + 1] = CENTER_Y + h * expand + Math.sin(t * 2 + baseA) * 0.08
      arr[i * 3 + 2] = Math.sin(angle) * r
    }
    pos.needsUpdate = true
    ref.current.rotation.y = t * 0.15
  })

  return (
    <points ref={ref} visible={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        ref={matRef}
        map={sparkTex}
        alphaMap={sparkTex}
        size={0.13}
        vertexColors
        transparent
        opacity={0}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  )
}
