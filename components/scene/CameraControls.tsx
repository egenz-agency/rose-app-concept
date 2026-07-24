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
 *
 * OrbitControls stays MOUNTED for the whole scene lifetime and is toggled via
 * `enabled` (plus autoRotate/damping). It used to unmount during scripted phases,
 * but re-mounting it on the transition into IDLE proved unreliable when the R3F
 * scene mounted late (after the phase was already IDLE): the controls never came
 * back, the camera was never framed, and the rose stayed off-screen (the reported
 * "rose not showing" black screen). Keeping it mounted removes that timing race —
 * we just re-frame via an effect whenever idle interaction (re)starts.
 *
 * - Left-drag  → 360° orbit around the rose
 * - Scroll     → zoom in / out (dolly)
 * - View buttons → glide to a saved vantage (close / wide / default)
 *
 * While NOT interactive (VIDEO, INTRO, REVEAL, CARING, the emergence sweep, …)
 * the controls are disabled with autoRotate/damping off, so CameraRig's GSAP
 * moves own the camera without OrbitControls fighting them.
 */
export function CameraControls() {
  const phase       = useSceneStore((s) => s.phase)
  const viewPreset  = useSceneStore((s) => s.viewPreset)
  const viewTick    = useSceneStore((s) => s.viewTick)
  const isEmergence = useSceneStore((s) => s.isEmergence)
  const { camera }  = useThree()
  const controlsRef = useRef<OrbitControlsImpl>(null)
  const didFrameRef = useRef(false)
  const wasInteractive = useRef(false)

  const interactive = (phase === "IDLE" || phase === "INSTRUCTIONS") && !isEmergence

  // Re-arm the framing snap whenever an emergence sweep starts, so the camera is
  // re-framed once when idle interaction resumes at the end of the sweep.
  useEffect(() => {
    if (isEmergence) didFrameRef.current = false
  }, [isEmergence])

  // Frame the WHOLE rose (bloom included) the first time idle interaction starts,
  // and again after an emergence sweep. OrbitControls does not clamp its initial
  // distance and the emergence orbit can leave the camera stuck close inside the
  // dome, so we set a known-good vantage explicitly. Runs off the `interactive`
  // transition — controlsRef is always populated because the control never
  // unmounts — so it can't be missed by a late scene mount.
  useEffect(() => {
    const controls = controlsRef.current
    const entering = interactive && !wasInteractive.current
    wasInteractive.current = interactive
    if (!entering || !controls || didFrameRef.current) return
    didFrameRef.current = true
    const { default: rest } = VIEW_PRESETS
    controls.target.set(0, 1.2, 0)
    const sph = new THREE.Spherical(rest.radius, rest.polar, controls.getAzimuthalAngle())
    camera.position.setFromSpherical(sph).add(controls.target)
    camera.lookAt(controls.target)
    controls.update()
  }, [interactive, camera])

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

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      target={[0, 1.2, 0]}
      enabled={interactive}
      enablePan={false}
      enableZoom={interactive}
      enableRotate={interactive}
      minDistance={2.2}
      maxDistance={5.0}
      zoomSpeed={0.7}
      rotateSpeed={0.55}
      minPolarAngle={0.25}
      maxPolarAngle={Math.PI / 2 + 0.15}
      autoRotate={interactive}
      autoRotateSpeed={0.3}
      enableDamping={interactive}
      dampingFactor={0.08}
    />
  )
}
