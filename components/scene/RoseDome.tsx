"use client"
import { useRef, useMemo, useEffect } from "react"
import { useFrame } from "@react-three/fiber"
import { useGLTF } from "@react-three/drei"
import { RigidBody } from "@react-three/rapier"
import * as THREE from "three"
import { gsap } from "gsap"
import { useSceneStore } from "@/lib/store/sceneStore"
import { PetalParticles } from "./PetalParticles"

interface RoseDomeProps {
  onDomePointerDown?: () => void
  onDomePointerUp?: () => void
}

// GLB is in real-world metres; scale everything up so it fits our scene
const SCENE_SCALE  = 5.0
// Derived from GLB dome dimensions × SCENE_SCALE (0.299 m radius, 0.423 m tall)
const DOME_RADIUS  = 0.299 * SCENE_SCALE  // ≈ 1.495 world units
const DOME_HEIGHT  = 0.423 * SCENE_SCALE  // ≈ 2.115 world units
const DOME_OPACITY = 1.0   // transmission provides see-through; dark attenuation keeps it clear
// Lift distance in GLTF local units (world units / SCENE_SCALE)
const DOME_LIFT_LOCAL = 3.5 / SCENE_SCALE

export function RoseDome({ onDomePointerDown, onDomePointerUp }: RoseDomeProps) {
  const groupRef      = useRef<THREE.Group>(null)
  const domeMeshRef   = useRef<THREE.Mesh | null>(null)
  const roseMeshRef   = useRef<THREE.Object3D | null>(null)
  const domeMatRef    = useRef<THREE.MeshPhysicalMaterial | null>(null)
  const roseMatRef    = useRef<THREE.MeshStandardMaterial | null>(null)
  const innerLightRef = useRef<THREE.PointLight>(null)
  const domeInitY     = useRef(0)
  const domePosY      = useRef({ y: 0 })

  const phase           = useSceneStore((s) => s.phase)
  const rose            = useSceneStore((s) => s.rose)
  const domeLifted      = useSceneStore((s) => s.domeLifted)
  const setDomeLifted   = useSceneStore((s) => s.setDomeLifted)
  const bloomTriggered  = useSceneStore((s) => s.bloomTriggered)
  const resetBloom      = useSceneStore((s) => s.resetBloom)
  const simulationPetals = useSceneStore((s) => s.simulationPetals)
  const isEmergence     = useSceneStore((s) => s.isEmergence)
  const setMagicActive  = useSceneStore((s) => s.setMagicActive)
  const triggerBloom    = useSceneStore((s) => s.triggerBloom)

  const effectivePetals = simulationPetals !== null ? simulationPetals : (rose?.petalsRemaining ?? 40)
  const isDead          = effectivePetals === 0
  const petalRatio      = effectivePetals / 40

  // The rose grows subtly with the journey but stays a NORMAL, full size in the
  // dome (only ~12% smaller on day one — never a tiny speck). The dome is full size.
  const growth       = Math.min(1, (rose?.totalVisits ?? 0) / 250)        // 0 → 1
  const growthFactor = 0.92 + 0.08 * growth                               // 0.92 → 1.0 (normal size)
  const growthFactorRef = useRef(growthFactor)
  growthFactorRef.current = growthFactor
  const roseBaseScale = useRef<THREE.Vector3>(new THREE.Vector3(1, 1, 1))

  const { scene: gltfScene } = useGLTF("/models/beauty_and_the_beast_rose.glb")

  // Clone once so material mutations don't affect the GLTF cache
  const clonedScene = useMemo(() => gltfScene.clone(true), [gltfScene])

  // ── Material & ref setup ──────────────────────────────────────
  useEffect(() => {
    clonedScene.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return

      const rawMat = Array.isArray(child.material) ? child.material[0] : child.material
      const name   = (rawMat?.name ?? "").toLowerCase()

      if (name.includes("table")) {
        // Hide the GLB table — we don't want the cylinder base
        child.visible = false

      } else if (name.includes("rose") && !name.includes("glass")) {
        const mat = (rawMat as THREE.MeshStandardMaterial).clone()
        mat.emissive          = new THREE.Color("#ff4060")
        mat.emissiveIntensity = 0.4
        mat.needsUpdate       = true
        child.material        = mat
        roseMatRef.current    = mat
        roseMeshRef.current   = child
        roseBaseScale.current.copy(child.scale)   // remember full-bloom scale

      } else if (name.includes("glass")) {
        // Clear, physically-based glass. FrontSide is important: the camera
        // dives INSIDE the dome during the reveal, and FrontSide culls the far
        // wall so the rose stays clearly visible instead of being washed out by
        // a bright back surface. Gentle reflections (no clearcoat / low env) so
        // postprocessing bloom doesn't blow the glass to white.
        // Clear, mirror-smooth glass. roughness 0 → crisp (not matte). A dark
        // attenuation keeps the body from washing milky-grey from the environment,
        // so you see THROUGH to the rose; the bright scene lights create sharp
        // glassy specular highlights that read as real glass. Low env so the night
        // sky reflection never washes it out.
        // Real-glass look like the Blender model: a glossy CLEARCOAT layer plus
        // strong, sharp environment reflections give the surface true glass
        // character (reflections, Fresnel rim, highlights). The base ior is kept
        // LOW so transmission doesn't bend light through the curved shell and
        // re-create the ghost / double image — the clearcoat (its own ior ~1.5)
        // provides the glassy reflections without any refraction doubling.
        const glassMat = new THREE.MeshPhysicalMaterial({
          transmission:        1.0,
          thickness:           0.3,
          roughness:           0.0,
          ior:                 1.1,
          color:               new THREE.Color("#ffffff"),
          attenuationColor:    new THREE.Color("#0c0610"),
          attenuationDistance: 1.2,
          envMapIntensity:     0.9,
          clearcoat:           1.0,
          clearcoatRoughness:  0.0,
          transparent:         true,
          opacity:             DOME_OPACITY,
          metalness:           0.0,
          reflectivity:        0.55,
          specularIntensity:   1.0,
          specularColor:       new THREE.Color("#ffffff"),
          side:                THREE.FrontSide,
        })
        child.material       = glassMat
        domeMatRef.current   = glassMat
        domeMeshRef.current  = child
        domeInitY.current    = child.position.y
        domePosY.current.y   = child.position.y
      }
    })
  }, [clonedScene])

  // ── Emergence — the grand first reveal ───────────────────────
  // When "Begin the magic" is clicked the GLASS DOME STAYS in place.
  // The camera dives inside the dome for a close, circling look at the rose
  // (handled in CameraRig). Here we just light the magic and bloom the rose.
  useEffect(() => {
    if (!isEmergence) return
    setMagicActive(true)
    const bloomTimer = window.setTimeout(() => triggerBloom(), 600)
    return () => window.clearTimeout(bloomTimer)
  }, [isEmergence, setMagicActive, triggerBloom])

  // ── Standard dome lift / lower (IDLE tap interaction) ────────
  useEffect(() => {
    const domeMesh = domeMeshRef.current
    const domeMat  = domeMatRef.current
    if (!domeMesh || !domeMat) return

    if (domeLifted) {
      gsap.to(domePosY.current, {
        y: domeInitY.current + DOME_LIFT_LOCAL,
        duration: 0.8, ease: "power2.out",
        onUpdate: () => { domeMesh.position.y = domePosY.current.y },
      })
      gsap.to(domeMat, { opacity: 0, duration: 0.6, ease: "power2.out" })
      if (innerLightRef.current) {
        gsap.to(innerLightRef.current, { intensity: 5.0, duration: 0.8 })
      }
      const t = setTimeout(() => setDomeLifted(false), 5000)
      return () => clearTimeout(t)
    } else {
      gsap.to(domePosY.current, {
        y: domeInitY.current,
        duration: 1.0, ease: "power3.inOut",
        onUpdate: () => { domeMesh.position.y = domePosY.current.y },
      })
      gsap.to(domeMat, { opacity: DOME_OPACITY, duration: 0.8, ease: "power2.in" })
      if (innerLightRef.current) {
        gsap.to(innerLightRef.current, { intensity: 2.5, duration: 1.0 })
      }
    }
  }, [domeLifted, setDomeLifted])

  // ── Growth: scale the rose mesh (not the dome) by the journey factor ──
  useEffect(() => {
    if (!roseMeshRef.current) return
    if (bloomTriggered) return   // bloom animation owns the scale while it runs
    roseMeshRef.current.scale.copy(roseBaseScale.current).multiplyScalar(growthFactor)
  }, [growthFactor, bloomTriggered])

  // ── Alive / dead transition ───────────────────────────────────
  useEffect(() => {
    const mat = roseMatRef.current
    if (!mat) return
    if (isDead) {
      gsap.to(mat.color,    { r: 0.1, g: 0, b: 0.02, duration: 1.5 })
      gsap.to(mat.emissive, { r: 0, g: 0, b: 0, duration: 1.5 })
      gsap.to(mat, {
        emissiveIntensity: 0, opacity: 0.4, duration: 1.5,
        onStart:    () => { mat.transparent = true },
        onUpdate:   () => { mat.needsUpdate  = true },
      })
    } else {
      const intensity = 0.38 * Math.max(petalRatio, 0.2)
      gsap.to(mat.color,    { r: 1, g: 1, b: 1, duration: 0.8 })
      gsap.to(mat.emissive, { r: 1, g: 0.25, b: 0.37, duration: 0.8 })
      gsap.to(mat, {
        emissiveIntensity: intensity, opacity: 1, duration: 0.8,
        onUpdate:   () => { mat.needsUpdate  = true },
        onComplete: () => { mat.transparent = false },
      })
    }
  }, [isDead, petalRatio])

  // ── Bloom animation ───────────────────────────────────────────
  useEffect(() => {
    if (!bloomTriggered || !roseMeshRef.current) return
    const obj = roseMeshRef.current
    const mat = roseMatRef.current
    const tl  = gsap.timeline({ onComplete: resetBloom })
    // Scale relative to the current growth-adjusted base so the bloom pulse
    // doesn't reset a young rose to full size.
    const base = roseBaseScale.current
    const gf   = growthFactorRef.current
    const peak = gf * 1.15
    tl.to(obj.rotation, { y: obj.rotation.y + Math.PI * 2, duration: 2, ease: "power2.inOut" })
    tl.to(obj.scale, { x: base.x * peak, y: base.y * peak, z: base.z * peak, duration: 0.5, ease: "back.out(2)" }, 0)
    tl.to(obj.scale, { x: base.x * gf,   y: base.y * gf,   z: base.z * gf,   duration: 0.8, ease: "elastic.out(1,0.5)" }, 0.5)
    if (mat) {
      gsap.to(mat, {
        emissiveIntensity: 2.0, duration: 0.4, yoyo: true, repeat: 1,
        onUpdate: () => { mat.needsUpdate = true },
      })
    }
  }, [bloomTriggered, resetBloom])

  // ── Per-frame: the rose turns slowly at all times in the idle world ──
  // It keeps spinning during the emergence orbit too, so the camera circles a
  // gently turning rose (bottom → top), exactly the Beauty-and-the-Beast feel.
  useFrame(({ clock }) => {
    if (!groupRef.current) return
    if (phase === "IDLE" || phase === "INSTRUCTIONS") {
      groupRef.current.rotation.y = clock.getElapsedTime() * 0.12
    }
  })

  return (
    <group ref={groupRef} position={[0, 0, 0]}>

      {/* Invisible physics floor so petal particles have somewhere to land */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, -0.02, 0]} visible={false}>
          <boxGeometry args={[4, 0.04, 4]} />
          <meshBasicMaterial />
        </mesh>
      </RigidBody>

      {/* Full GLB scene: rose + glass dome (table hidden). The dome stays full
          size; only the rose mesh scales with growth (handled in an effect). */}
      <primitive object={clonedScene} scale={SCENE_SCALE} />

      <PetalParticles />

      {/* Invisible hit target for press-and-hold pointer events.
          Persists after the dome is removed so holding the bare rose still works.
          Sized to comfortably cover the whole rose / dome region. */}
      <mesh
        position={[0, DOME_HEIGHT * 0.5, 0]}
        onPointerDown={() => { document.body.style.cursor = "grabbing"; onDomePointerDown?.() }}
        onPointerUp={()   => { document.body.style.cursor = "pointer";  onDomePointerUp?.()   }}
        onPointerLeave={()=> { document.body.style.cursor = "auto";     onDomePointerUp?.()   }}
        onPointerEnter={()=> { document.body.style.cursor = "pointer" }}
      >
        <cylinderGeometry args={[DOME_RADIUS, DOME_RADIUS, DOME_HEIGHT, 24, 1, true]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>

      {/* Interior light inside the dome — warms the rose (gentle so the
          nearby leaves don't blow out under bloom) */}
      <pointLight
        ref={innerLightRef}
        position={[0, DOME_HEIGHT * 0.55, 0]}
        color={isDead ? "#334455" : "#ff9977"}
        intensity={isDead ? 0.15 : 1.3}
        distance={DOME_HEIGHT * 1.0}
        decay={2.2}
      />
    </group>
  )
}

useGLTF.preload("/models/beauty_and_the_beast_rose.glb")
