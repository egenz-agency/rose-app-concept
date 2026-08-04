"use client"
import { useRef, useEffect, useMemo } from "react"
import { useThree } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"
import { gsap } from "gsap"
import * as THREE from "three"
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib"
import { useSceneStore } from "@/lib/store/sceneStore"
import { CAMERA_POSITIONS } from "@/lib/animation/timelines"
import {
  useConstellation,
  UNIVERSE_Y,
  CONSTELLATION_SCALE,
} from "@/lib/constellation/useConstellation"

/** How long the journey between the flower and the sky takes, each way. */
const TRAVEL_UP = 2.8
const TRAVEL_DOWN = 2.5

/** Where the camera looks while it is down with the rose. */
const ROSE_TARGET = new THREE.Vector3(0, 1.2, 0)

/**
 * The vertical journey between the rose and the constellation.
 *
 * There is no second scene and no page change. The camera simply climbs — the
 * rose slides out of the bottom of the frame while staying exactly where it is —
 * and comes to rest framing the constellation suspended in the sky above it.
 * Coming back is the same move, reversed.
 *
 * While the camera is up there this component also owns the free look: drag to
 * rotate, pinch or scroll to zoom, double tap to re-centre.
 */
export function ConstellationCamera() {
  const { camera } = useThree()
  const universeMode = useSceneStore((s) => s.universeMode)
  const setUniverseMode = useSceneStore((s) => s.setUniverseMode)
  const recenterTick = useSceneStore((s) => s.recenterTick)
  const igniting = useSceneStore((s) => s.igniting)
  const overtureActive = useSceneStore((s) => s.overtureActive)
  const setOvertureActive = useSceneStore((s) => s.setOvertureActive)
  const setVisionActive = useSceneStore((s) => s.setVisionActive)
  const setOvertureBeat = useSceneStore((s) => s.setOvertureBeat)
  const view = useConstellation()

  const controlsRef = useRef<OrbitControlsImpl>(null)
  // The point the camera is looking at right now. Tweened alongside the
  // position so the horizon rises smoothly instead of snapping.
  const lookAt = useRef(new THREE.Vector3().copy(ROSE_TARGET))

  // Far enough back to hold the whole constellation, whatever shape it came out.
  const framing = useMemo(() => {
    const halfExtent = view.constellation.radius * CONSTELLATION_SCALE
    const fov = ((camera as THREE.PerspectiveCamera).fov ?? 50) * (Math.PI / 180)
    // Frame against the vertical field of view, with just enough margin that the
    // constellation sits in space rather than pressing against the edges.
    const distance = (halfExtent / Math.tan(fov / 2)) * 1.12
    return {
      distance: Math.max(9, Math.min(24, distance)),
      target: new THREE.Vector3(0, UNIVERSE_Y, 0),
    }
  }, [view.constellation.radius, camera])

  // The journey below must depend on the mode and nothing else. Reading the
  // framing through a ref keeps a background refetch of the memories from
  // re-running the effect and restarting the flight halfway up.
  const framingRef = useRef(framing)
  // Synced in an effect rather than during render. Declared above the journey
  // effect, so it is always current by the time that one runs.
  useEffect(() => {
    framingRef.current = framing
  }, [framing])

  // ── The journey ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (universeMode !== "ascending" && universeMode !== "descending") return

    const goingUp = universeMode === "ascending"
    gsap.killTweensOf(camera.position)
    gsap.killTweensOf(lookAt.current)

    const frame = framingRef.current
    const rest = CAMERA_POSITIONS.idle
    const destination = goingUp
      ? new THREE.Vector3(0, UNIVERSE_Y, frame.distance)
      : new THREE.Vector3(rest.x, rest.y, rest.z)
    const destinationLook = goingUp ? frame.target : ROSE_TARGET

    const tl = gsap.timeline({
      onComplete: () => setUniverseMode(goingUp ? "universe" : "rose"),
    })
    const duration = goingUp ? TRAVEL_UP : TRAVEL_DOWN

    // Position: one continuous eased move. Because the destination is almost
    // straight overhead, this reads as pure vertical travel through the world.
    tl.to(
      camera.position,
      {
        x: destination.x,
        y: destination.y,
        z: destination.z,
        duration,
        ease: "power2.inOut",
        onUpdate: () => camera.lookAt(lookAt.current),
      },
      0
    )

    // Gaze: deliberately lagging on the way up, so the rose stays in frame for a
    // beat and then slips away beneath her as she rises. Leading on the way down,
    // so the flower is already waiting when she arrives.
    tl.to(
      lookAt.current,
      {
        x: destinationLook.x,
        y: destinationLook.y,
        z: destinationLook.z,
        duration: duration * (goingUp ? 0.82 : 0.9),
        ease: goingUp ? "power2.in" : "power2.out",
        onUpdate: () => camera.lookAt(lookAt.current),
      },
      goingUp ? duration * 0.18 : 0
    )

    return () => {
      tl.kill()
    }
  }, [universeMode, camera, setUniverseMode])

  // ── The overture ──────────────────────────────────────────────────────────
  // The arrival cinematic. The camera falls in from high and far, sweeps across
  // the face of the constellation, presses in close enough for the near stars to
  // part against the far ones, and pulls back to the resting frame. While it
  // runs the sky is shown finished — this is the one time she sees the whole
  // shape lit, before it fades back to the single star she has actually earned.
  useEffect(() => {
    if (!overtureActive) return

    gsap.killTweensOf(camera.position)
    const centre = new THREE.Vector3(0, UNIVERSE_Y, 0)
    lookAt.current.copy(centre)

    // Spherical orbit around the constellation: azimuth, polar, radius.
    const shot = { a: -1.02, p: 0.78, r: framingRef.current.distance * 2.05 }
    const apply = () => {
      camera.position.set(
        Math.sin(shot.a) * Math.sin(shot.p) * shot.r,
        UNIVERSE_Y + Math.cos(shot.p) * shot.r,
        Math.cos(shot.a) * Math.sin(shot.p) * shot.r
      )
      camera.lookAt(lookAt.current)
    }
    apply()

    const rest = framingRef.current.distance
    const tl = gsap.timeline({
      onComplete: () => {
        setOvertureBeat(-1)
        setOvertureActive(false)
        setVisionActive(false)
      },
    })

    // Fall in from above and far out, until the shape reads as a whole.
    tl.call(() => setOvertureBeat(0), undefined, 0.6)
    tl.to(shot, { a: -0.44, p: 1.4, r: rest * 1.12, duration: 3.4, ease: "sine.inOut", onUpdate: apply })
    // Drift across its face — the depth in the sky separates here.
    tl.call(() => setOvertureBeat(1))
    tl.to(shot, { a: 0.46, p: 1.62, r: rest * 0.82, duration: 3.2, ease: "sine.inOut", onUpdate: apply })
    // Press in close, so the near stars sweep past the far ones.
    tl.to(shot, { a: 0.16, p: 1.5, r: rest * 0.5, duration: 2.1, ease: "power1.inOut", onUpdate: apply })
    tl.call(() => setOvertureBeat(2))
    // Let the vision go a beat before the camera settles, so the last thing that
    // happens is the real sky arriving — not the camera stopping.
    tl.call(() => setVisionActive(false))
    // Pull back to the resting frame.
    tl.to(shot, { a: 0, p: Math.PI / 2, r: rest, duration: 3.0, ease: "power2.inOut", onUpdate: apply })

    return () => { tl.kill() }
  }, [overtureActive, camera, setOvertureActive, setVisionActive, setOvertureBeat])

  // Skipping mid-flight leaves the camera wherever the timeline stopped; ease it
  // to the resting frame so control is never handed back at a strange angle.
  useEffect(() => {
    if (overtureActive || universeMode !== "universe") return
    const rest = framingRef.current
    gsap.to(camera.position, {
      x: 0,
      y: UNIVERSE_Y,
      z: rest.distance,
      duration: 0.9,
      ease: "power2.out",
      onUpdate: () => camera.lookAt(rest.target),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overtureActive])

  // ── Double tap / button → re-frame the whole constellation ────────────────
  useEffect(() => {
    if (recenterTick === 0) return
    const controls = controlsRef.current
    if (!controls) return

    const azimuth = controls.getAzimuthalAngle()
    const spherical = new THREE.Spherical(framing.distance, Math.PI / 2, azimuth * 0.35)
    const destination = new THREE.Vector3().setFromSpherical(spherical).add(controls.target)

    const damping = controls.enableDamping
    controls.enableDamping = false
    gsap.to(camera.position, {
      x: destination.x,
      y: destination.y,
      z: destination.z,
      duration: 1.5,
      ease: "power3.inOut",
      onUpdate: () => camera.lookAt(controls.target),
      onComplete: () => {
        controls.enableDamping = damping
        controls.update()
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recenterTick])

  // OrbitControls stands down while the overture is flying the camera.
  if (universeMode !== "universe" || overtureActive) return null

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      target={[0, UNIVERSE_Y, 0]}
      enablePan={false}
      enableZoom
      enableRotate
      minDistance={4}
      maxDistance={framing.distance * 2.1}
      zoomSpeed={0.65}
      rotateSpeed={0.42}
      // A shallow band of movement: she can look around her sky, but can never
      // tumble it upside down or lose the constellation behind her.
      minPolarAngle={Math.PI / 2 - 0.72}
      maxPolarAngle={Math.PI / 2 + 0.72}
      minAzimuthAngle={-1.05}
      maxAzimuthAngle={1.05}
      // The completed sky turns slowly on its own.
      autoRotate={igniting}
      autoRotateSpeed={0.22}
      enableDamping
      dampingFactor={0.045}
    />
  )
}
