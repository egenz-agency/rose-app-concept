"use client"
import { useRef, useMemo, useEffect } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import { useGLTF } from "@react-three/drei"
import * as THREE from "three"
import { gsap } from "gsap"
import { useSceneStore } from "@/lib/store/sceneStore"

interface RoseModelProps {
  petalRatio: number
  isDead: boolean
  position: [number, number, number]
}

const SCALE = 0.8
const STEM_BOTTOM_LOCAL = -0.722
const Y_OFFSET = -STEM_BOTTOM_LOCAL * SCALE  // 0.578

export function RoseModel({ petalRatio, isDead, position }: RoseModelProps) {
  const groupRef = useRef<THREE.Group>(null)
  const meshRef  = useRef<THREE.Mesh>(null)
  const tiltRef  = useRef({ x: 0, y: 0 })
  const { pointer } = useThree()

  const bloomTriggered = useSceneStore((s) => s.bloomTriggered)
  const resetBloom     = useSceneStore((s) => s.resetBloom)

  const { scene } = useGLTF("/models/rose.glb")

  // Extract geometry — try "Rose" first, fall back to first mesh found
  const roseGeometry = useMemo(() => {
    let geo: THREE.BufferGeometry | null = null
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (!geo || child.name === "Rose") geo = child.geometry
      }
    })
    return geo
  }, [scene])

  // Rose texture
  const roseTexture = useMemo(() => {
    const loader = new THREE.TextureLoader()
    const tex = loader.load("/textures/Rose.png")
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
  }, [])

  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: roseTexture,
        color: "#ffffff",
        roughness: 0.68,
        metalness: 0.0,
        emissive: new THREE.Color("#ffffff"),
        emissiveMap: roseTexture,
        emissiveIntensity: 0.30,
        // Low alphaTest cuts the fully-transparent background of Rose.png
        // without discarding semi-transparent petal edges (matching Blender HASHED).
        alphaTest: 0.02,
        side: THREE.DoubleSide,
      }),
    [roseTexture]
  )

  // Alive / dead state transitions
  useEffect(() => {
    if (!material) return
    if (isDead) {
      gsap.to(material.color, { r: 0.1, g: 0, b: 0.02, duration: 1.5, ease: "power2.out" })
      gsap.to(material.emissive, { r: 0, g: 0, b: 0, duration: 1.5 })
      gsap.to(material, {
        emissiveIntensity: 0,
        opacity: 0.4,
        duration: 1.5,
        onStart: () => { material.transparent = true },
        onUpdate: () => { material.needsUpdate = true },
      })
    } else {
      const intensity = 0.34 * Math.max(petalRatio, 0.2)
      // White base + white emissive let the texture's own colours show through
      // (red flower, green leaves) instead of being tinted crimson.
      gsap.to(material.color, { r: 1, g: 1, b: 1, duration: 0.8 })
      gsap.to(material.emissive, { r: 1, g: 1, b: 1, duration: 0.8 })
      gsap.to(material, {
        emissiveIntensity: intensity,
        opacity: 1,
        duration: 0.8,
        onUpdate: () => { material.needsUpdate = true },
        onComplete: () => { material.transparent = false },
      })
    }
  }, [isDead, petalRatio, material])

  // Bloom animation on successful tend
  useEffect(() => {
    if (!bloomTriggered || !groupRef.current) return
    const group = groupRef.current
    const tl = gsap.timeline({ onComplete: resetBloom })
    tl.to(group.rotation, { y: group.rotation.y + Math.PI * 2, duration: 2, ease: "power2.inOut" })
    tl.to(group.scale, { x: 1.15, y: 1.15, z: 1.15, duration: 0.5, ease: "back.out(2)" }, 0)
    tl.to(group.scale, { x: 1, y: 1, z: 1, duration: 0.8, ease: "elastic.out(1,0.5)" }, 0.5)
    gsap.to(material, {
      emissiveIntensity: 2.0, duration: 0.4, yoyo: true, repeat: 1, ease: "power2.inOut",
      onUpdate: () => { material.needsUpdate = true },
    })
  }, [bloomTriggered, resetBloom, material])

  // Breathing sway + cursor-reactive tilt (max ±5°)
  useFrame(({ clock }) => {
    if (!groupRef.current) return
    const t = clock.getElapsedTime()
    const breathZ = Math.sin(t * 0.3) * 0.008

    tiltRef.current.x += (pointer.y * -0.087 - tiltRef.current.x) * 0.04
    tiltRef.current.y += (pointer.x * 0.087 - tiltRef.current.y) * 0.04

    groupRef.current.rotation.x = tiltRef.current.x
    groupRef.current.rotation.y += (tiltRef.current.y - groupRef.current.rotation.y) * 0.04
    groupRef.current.rotation.z = breathZ
  })

  if (!roseGeometry) return null

  return (
    <group ref={groupRef} position={[position[0], position[1] + Y_OFFSET, position[2]]}>
      <mesh
        ref={meshRef}
        geometry={roseGeometry}
        material={material}
        scale={[SCALE, SCALE, SCALE]}
        castShadow
        receiveShadow
      />
    </group>
  )
}

useGLTF.preload("/models/rose.glb")
