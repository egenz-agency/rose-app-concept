"use client"
import { useRef, useEffect } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import { gsap } from "gsap"
import * as THREE from "three"
import { useSceneStore } from "@/lib/store/sceneStore"
import { CAMERA_POSITIONS, TIMELINE_DURATIONS } from "@/lib/animation/timelines"

export function CameraRig() {
  const { camera } = useThree()
  const phase        = useSceneStore((s) => s.phase)
  const isEmergence  = useSceneStore((s) => s.isEmergence)
  const setIsEmergence = useSceneStore((s) => s.setIsEmergence)
  const setMagicActive = useSceneStore((s) => s.setMagicActive)

  // Where to look during scripted phases — trained on the bloom (top of rose)
  const lookTarget = useRef(new THREE.Vector3(0, 1.1, 0))

  // ── Normal phase transitions ─────────────────────────────────────
  useEffect(() => {
    if (isEmergence) return   // emergence owns the camera while active
    const pos = CAMERA_POSITIONS
    const animateTo = (target: { x: number; y: number; z: number }, dur: number, ease: string) =>
      gsap.to(camera.position, { x: target.x, y: target.y, z: target.z, duration: dur, ease })

    if (phase === "INTRO_ANIMATION") {
      camera.position.set(pos.cinematic_start.x, pos.cinematic_start.y, pos.cinematic_start.z)
      animateTo(pos.intro, TIMELINE_DURATIONS.intro_sweep, "power3.inOut")
    } else if (phase === "ROSE_REVEAL") {
      animateTo(pos.idle, 4.0, "power2.inOut")
    } else if (phase === "IDLE" || phase === "INSTRUCTIONS") {
      camera.position.set(pos.idle.x, pos.idle.y, pos.idle.z)
      camera.lookAt(lookTarget.current)
    } else if (phase === "CARING") {
      animateTo(pos.focus, 1.2, "expo.inOut")
    } else if (phase === "REVIVAL") {
      animateTo(pos.revival, 2.0, "power3.inOut")
    } else if (phase === "FINAL_DEATH") {
      animateTo(pos.final_death, TIMELINE_DURATIONS.final_death, "power4.inOut")
    }
  }, [phase, isEmergence, camera])

  // ── Emergence cinematic — helical orbit, bottom → top, held CLOSE ─────
  // The camera circles around the rose at a tight radius while spiralling up
  // from the base to the bloom, tracking the rose the whole way, then settles
  // to the fixed close resting vantage. The rose itself keeps spinning slowly.
  useEffect(() => {
    if (!isEmergence) return

    gsap.killTweensOf(camera.position)
    gsap.killTweensOf(lookTarget.current)

    // Orbit state: a = azimuth, y = height, r = radius, ly = look height.
    // The camera dives INSIDE the glass dome (radius < dome ~1.5), very close to
    // the rose, and circles it from the base upward to the bloom.
    const orbit = { a: Math.PI * 1.6, y: 0.35, r: 1.05, ly: 0.5 }
    const apply = () => {
      camera.position.set(Math.sin(orbit.a) * orbit.r, orbit.y, Math.cos(orbit.a) * orbit.r)
      lookTarget.current.set(0, orbit.ly, 0)
    }
    apply()

    const REST = CAMERA_POSITIONS.idle
    const tl = gsap.timeline({
      onComplete: () => {
        lookTarget.current.set(0, 1.1, 0)
        setIsEmergence(false)
        setMagicActive(false)
      },
    })

    // Close inside-the-dome spiral: ~340° around the rose, rising base → bloom
    tl.to(orbit, {
      a: -Math.PI * 0.3, y: 1.5, ly: 1.25, r: 1.0,
      duration: 7.2, ease: "sine.inOut", onUpdate: apply,
    })

    // Glide back out through the glass to frame the whole rose inside the dome
    tl.to(orbit, {
      a: 0, y: REST.y, ly: 1.1, r: REST.z,
      duration: 2.0, ease: "power2.inOut", onUpdate: apply,
    })

    return () => { tl.kill() }
  }, [isEmergence, camera, setIsEmergence, setMagicActive])

  // ── Per-frame look-at ───────────────────────────────────────────
  useFrame(() => {
    // During emergence or any scripted phase, keep the camera trained on the rose
    if (phase === "IDLE" || phase === "INSTRUCTIONS") {
      if (!isEmergence) return   // OrbitControls owns the camera in normal IDLE
    }
    camera.lookAt(lookTarget.current)
  })

  return null
}
