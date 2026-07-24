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

  // Keep a stable handle to the camera so the emergence effect can read it
  // without listing `camera` as a dependency (see below).
  const cameraRef = useRef(camera)
  cameraRef.current = camera

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
    const camera = cameraRef.current

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

    // End the sweep exactly once: hand the camera back to OrbitControls (idle).
    // Guarded so neither a double-invoke nor the failsafe can run it twice.
    let ended = false
    const finish = () => {
      if (ended) return
      ended = true
      lookTarget.current.set(0, 1.1, 0)
      setIsEmergence(false)
      setMagicActive(false)
    }

    const tl = gsap.timeline({ onComplete: finish })

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

    // Failsafe: if the GSAP timeline is ever interrupted (StrictMode remount,
    // tab throttling, a killed tween) and its onComplete never fires, the
    // emergence flag would stay true forever — OrbitControls would never take
    // over and the rose would never be framed (black screen / stuck close on the
    // stem). Force the hand-off shortly after the sweep's own duration.
    const failsafe = window.setTimeout(finish, 10_500)

    return () => {
      window.clearTimeout(failsafe)
      tl.kill()
    }
    // Depend ONLY on isEmergence: the sweep must run start-to-finish uninterrupted.
    // Including `camera` (or the zustand setters) made this effect re-run mid-sweep
    // during the reveal→idle transition, killing and restarting the timeline so it
    // never progressed past its dark starting frame (rose never appeared).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEmergence])

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
