"use client"
import { useRef, useEffect } from "react"
import { OrbitControls } from "@react-three/drei"
import { useThree } from "@react-three/fiber"
import * as THREE from "three"
import { gsap } from "gsap"
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib"
import { useSceneStore } from "@/lib/store/sceneStore"

// Distance + vertical angle (polar, radians from +Y) for each saved vantage.
// Zoomed in but framing the whole rose inside the glass dome
const VIEW_PRESETS = {
  close:   { radius: 2.6, polar: 1.22 },
  wide:    { radius: 4.6, polar: 1.08 },
  default: { radius: 3.35, polar: 1.22 },
} as const

/**
 * Blender-style free look for the rose.
 * Active only in IDLE / INSTRUCTIONS so the cinematic phases keep their
 * scripted CameraRig moves. While mounted it owns the camera; on unmount
 * CameraRig resumes control.
 *
 * - Left-drag  → 360° orbit around the rose
 * - Scroll     → zoom in / out (dolly)
 * - View buttons → glide to a saved vantage (close / wide / default)
 */
export function CameraControls() {
  const phase       = useSceneStore((s) => s.phase)
  const viewPreset  = useSceneStore((s) => s.viewPreset)
  const viewTick    = useSceneStore((s) => s.viewTick)
  const isEmergence = useSceneStore((s) => s.isEmergence)
  const { camera }  = useThree()
  const controlsRef = useRef<OrbitControlsImpl>(null)

  // Glide to a saved vantage whenever a view button (or the magic sequence) fires.
  useEffect(() => {
    const controls = controlsRef.current
    if (!controls || !viewPreset) return
    const preset = VIEW_PRESETS[viewPreset]
    if (!preset) return

    // Keep the current horizontal angle, only change distance + height.
    const az = controls.getAzimuthalAngle()
    const sph = new THREE.Spherical(preset.radius, preset.polar, az)
    const target = new THREE.Vector3().setFromSpherical(sph).add(controls.target)

    // Freeze the control's own per-frame update while we animate the camera,
    // so OrbitControls and GSAP don't fight over the position.
    const prevAuto = controls.autoRotate
    const prevDamp = controls.enableDamping
    controls.autoRotate = false
    controls.enableDamping = false

    gsap.to(camera.position, {
      x: target.x,
      y: target.y,
      z: target.z,
      duration: 1.5,
      ease: "power3.inOut",
      onUpdate: () => camera.lookAt(controls.target),
      onComplete: () => {
        controls.autoRotate = prevAuto
        controls.enableDamping = prevDamp
        controls.update()
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewTick])

  // Suspend OrbitControls during emergence so GSAP can sweep the camera freely
  // without damping / autoRotate fighting the animation. OrbitControls remounts
  // when emergence ends and picks up from the GSAP final position.
  const interactive = (phase === "IDLE" || phase === "INSTRUCTIONS") && !isEmergence
  if (!interactive) return null

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      target={[0, 1.2, 0]}
      enablePan={false}
      enableZoom
      enableRotate
      minDistance={2.2}
      maxDistance={5.0}
      zoomSpeed={0.7}
      rotateSpeed={0.55}
      minPolarAngle={0.25}
      maxPolarAngle={Math.PI / 2 + 0.15}
      autoRotate
      autoRotateSpeed={0.3}
      enableDamping
      dampingFactor={0.08}
    />
  )
}
