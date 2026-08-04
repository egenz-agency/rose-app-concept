"use client"
import { useRef, useMemo, useEffect } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { useSceneStore } from "@/lib/store/sceneStore"
import {
  useConstellation,
  UNIVERSE_Y,
  CONSTELLATION_SCALE,
  ARCHIVE_SPACING,
} from "@/lib/constellation/useConstellation"
import { useNewStars } from "@/lib/constellation/useNewStars"
import type { Constellation as ConstellationData } from "@/lib/constellation/generate"
import { getGlowTexture } from "./constellationTextures"

// ── Palette ──────────────────────────────────────────────────────────────────
// Sleeping stars are cold and almost absent. Woken ones are white. Filled ones
// hold the warm gold of a kept memory. Anniversaries carry a rose aura.
const COLOR_LOCKED = new THREE.Color("#6f7fa8")
const COLOR_EMPTY = new THREE.Color("#f3f6ff")
const COLOR_FILLED = new THREE.Color("#ffd48a")
const COLOR_FAVORITE = new THREE.Color("#ffe6b0")
const COLOR_ANNIVERSARY = new THREE.Color("#ffa8c8")

/** Rest luminance per state — what "permanent warm glow" settles to. */
// Sleeping stars sit just above visible: enough to ghost the shape she is
// working toward, never enough to be mistaken for one that has woken.
const LIT_LOCKED = 0.18
const LIT_EMPTY = 0.5
const LIT_FILLED = 1.0

type StarState = "locked" | "empty" | "filled"

interface RenderStar {
  slot: number
  home: THREE.Vector3
  state: StarState
  color: THREE.Color
  /** Where this star's glow settles once it has finished waking. */
  restLit: number
  size: number
  twinklePhase: number
  twinkleSpeed: number
  driftPhase: number
  isAnniversary: boolean
}

// ── Connections ──────────────────────────────────────────────────────────────

const REVEAL_DRAW = 2.0 // the lines take ~2s to travel the whole shape
const REVEAL_HOLD = 1.7
const REVEAL_FADE = 1.4
const REVEAL_TOTAL = REVEAL_DRAW + REVEAL_HOLD + REVEAL_FADE

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

// ── The vision's choreography ────────────────────────────────────────────────
// Stars light one after another along the constellation's own growth order, then
// every one of them blooms together, and only then do the connections draw. The
// order matters: the shape assembles itself before it is joined up.
const VISION_SWEEP = 4.2      // one-by-one ignition
const VISION_BLOOM = 1.0      // then all at once
const VISION_LINES_AT = VISION_SWEEP + VISION_BLOOM
/** How long a single star takes to come up once its turn arrives. */
const VISION_STAR_RISE = 0.42

/**
 * The glowing lines between stars, hidden until asked for.
 *
 * All edges live in one geometry, so the whole reveal is a single draw call. The
 * animation moves each line's far endpoint outward from the constellation's root
 * so the shape draws itself the way a hand would — and because the edge set is a
 * planar minimum spanning tree, no line can ever cross another.
 */
function ConstellationLines({
  data,
  positions,
  unlocked,
  visionClock,
}: {
  data: ConstellationData
  positions: THREE.Vector3[]
  unlocked: Set<number>
  /** Shared vision stopwatch, so the lines wait for the stars to finish. */
  visionClock: React.RefObject<number>
}) {
  const linesRef = useRef<THREE.LineSegments>(null)
  const revealTick = useSceneStore((s) => s.revealTick)
  const igniting = useSceneStore((s) => s.igniting)
  const vision = useSceneStore((s) => s.visionActive)
  const elapsed = useRef(Infinity) // Infinity = idle, nothing drawn

  const maxDepth = useMemo(
    () => data.edges.reduce((m, e) => Math.max(m, e.depth), 1),
    [data]
  )

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(data.edges.length * 6), 3))
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(data.edges.length * 6), 3))
    return g
  }, [data])

  useEffect(() => () => geometry.dispose(), [geometry])

  // Any bump of revealTick restarts the animation from the root. The vision
  // draws itself the same way, then simply stays.
  useEffect(() => {
    if (revealTick > 0) elapsed.current = 0
  }, [revealTick])

  useEffect(() => {
    if (vision) elapsed.current = 0
  }, [vision])

  // During the vision the lines are held back until the stars have all bloomed.
  const visionDrawn = () => Math.max(0, visionClock.current - VISION_LINES_AT)

  useFrame((_, delta) => {
    const mesh = linesRef.current
    if (!mesh) return

    if (!vision && elapsed.current >= REVEAL_TOTAL) {
      if (mesh.visible) mesh.visible = false
      return
    }
    // While the vision holds, the lines follow the shared vision clock and stop
    // at the end of the draw, so the whole shape stays joined for as long as the
    // camera is showing it off.
    if (vision) {
      const drawn = visionDrawn()
      if (drawn <= 0) {
        if (mesh.visible) mesh.visible = false
        return
      }
      elapsed.current = Math.min(REVEAL_DRAW, drawn)
    } else {
      elapsed.current += Math.min(delta, 0.05)
    }
    mesh.visible = true

    const t = elapsed.current
    // Draw outward, hold, then let it go — so the sky is never left cluttered.
    const draw = Math.min(1, t / REVEAL_DRAW)
    const fade = vision
      ? 1
      : t <= REVEAL_DRAW + REVEAL_HOLD
        ? 1
        : Math.max(0, 1 - (t - REVEAL_DRAW - REVEAL_HOLD) / REVEAL_FADE)

    const pos = geometry.attributes.position as THREE.BufferAttribute
    const col = geometry.attributes.color as THREE.BufferAttribute
    const posArr = pos.array as Float32Array
    const colArr = col.array as Float32Array

    for (let i = 0; i < data.edges.length; i++) {
      const e = data.edges[i]
      const a = positions[e.a]
      const b = positions[e.b]

      // Each edge waits its turn according to how far it sits from the root.
      const wave = (e.depth / maxDepth) * 0.62
      const local = easeOutCubic(Math.max(0, Math.min(1, (draw - wave) / 0.38)))

      const o = i * 6
      posArr[o] = a.x
      posArr[o + 1] = a.y
      posArr[o + 2] = a.z
      posArr[o + 3] = a.x + (b.x - a.x) * local
      posArr[o + 4] = a.y + (b.y - a.y) * local
      posArr[o + 5] = a.z + (b.z - a.z) * local

      // Lines into the part of the sky that is still asleep are only a whisper —
      // she can see the shape she is working toward without it shouting.
      const awake = vision || (unlocked.has(e.a) && unlocked.has(e.b))
      const strength = (awake ? 1 : 0.22) * local * fade * (igniting ? 1.35 : 1)
      const r = (awake ? 0.98 : 0.62) * strength
      const g = (awake ? 0.82 : 0.72) * strength
      const bl = (awake ? 0.52 : 0.95) * strength

      for (let v = 0; v < 2; v++) {
        colArr[o + v * 3] = r
        colArr[o + v * 3 + 1] = g
        colArr[o + v * 3 + 2] = bl
      }
    }

    pos.needsUpdate = true
    col.needsUpdate = true
  })

  return (
    <lineSegments ref={linesRef} geometry={geometry} visible={false} frustumCulled={false}>
      <lineBasicMaterial
        vertexColors
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </lineSegments>
  )
}

// ── One constellation ────────────────────────────────────────────────────────

/**
 * A single sky. Rendered the same way whether it is the chapter being written or
 * one already sealed — a finished constellation just hangs further out, dimmer,
 * and no longer answers to a tap.
 */
function ConstellationBody({
  data,
  memories,
  unlockedSlots,
  interactive,
  dim = 1,
  sealed = false,
  newSlots,
}: {
  data: ConstellationData
  memories: Map<number, { is_favorite?: boolean | null; is_anniversary?: boolean | null }>
  unlockedSlots: number[]
  interactive: boolean
  dim?: number
  /** A finished chapter — every star holds a memory, so every star burns warm. */
  sealed?: boolean
  /** Stars that have woken since she last looked — they pulse until she does. */
  newSlots?: Set<number>
}) {
  const setActiveSlot = useSceneStore((s) => s.setActiveSlot)
  const igniting = useSceneStore((s) => s.igniting)
  const vision = useSceneStore((s) => s.visionActive)
  // Nothing here needs updating while the camera is down at the rose.
  const active = useSceneStore((s) => s.universeMode !== "rose")

  // Where each star falls in the constellation's growth order — the sequence the
  // vision lights them in.
  const orderIndex = useMemo(() => {
    const m = new Map<number, number>()
    data.unlockOrder.forEach((slot, i) => m.set(slot, i))
    return m
  }, [data])

  // A shared stopwatch for the vision, read by the lines below.
  const visionClock = useRef(0)

  const glowTexture = useMemo(() => getGlowTexture(), [])
  const coreGeometry = useMemo(() => new THREE.SphereGeometry(1, 10, 10), [])
  useEffect(() => () => coreGeometry.dispose(), [coreGeometry])

  const unlocked = useMemo(() => new Set(unlockedSlots), [unlockedSlots])

  const stars = useMemo<RenderStar[]>(
    () =>
      data.stars.map((s) => {
        const memory = memories.get(s.index)
        const isUnlocked = unlocked.has(s.index)
        const state: StarState = memory || sealed ? "filled" : isUnlocked ? "empty" : "locked"

        let color = COLOR_LOCKED
        let restLit = LIT_LOCKED
        if (state === "filled") {
          color = memory?.is_anniversary
            ? COLOR_ANNIVERSARY
            : memory?.is_favorite
              ? COLOR_FAVORITE
              : COLOR_FILLED
          // A favourite memory burns a little brighter than the rest.
          restLit = LIT_FILLED * (memory?.is_favorite ? 1.22 : 1)
        } else if (state === "empty") {
          color = COLOR_EMPTY
          restLit = LIT_EMPTY
        }

        return {
          slot: s.index,
          home: new THREE.Vector3(
            s.x * CONSTELLATION_SCALE,
            s.y * CONSTELLATION_SCALE,
            s.z * CONSTELLATION_SCALE
          ),
          state,
          color,
          restLit: restLit * s.brightness * dim,
          size: s.size,
          twinklePhase: s.twinklePhase,
          twinkleSpeed: s.twinkleSpeed,
          driftPhase: s.driftPhase,
          isAnniversary: Boolean(memory?.is_anniversary),
        }
      }),
    [data, memories, unlocked, dim, sealed]
  )

  const positions = useMemo(() => stars.map((s) => s.home), [stars])

  const coreRefs = useRef<(THREE.Mesh | null)[]>([])
  const glowRefs = useRef<(THREE.Sprite | null)[]>([])
  // Current animated luminance per star, so a star that has just woken can flare
  // gold and settle rather than snapping on.
  const lit = useRef<Float32Array>(new Float32Array(0))
  const flare = useRef<Float32Array>(new Float32Array(0))
  const known = useRef<Map<number, StarState>>(new Map())

  // Detect what changed since the last render: a star that has just woken, or
  // just been filled, gets a burst of golden light.
  useEffect(() => {
    if (lit.current.length !== stars.length) {
      lit.current = new Float32Array(stars.length)
      flare.current = new Float32Array(stars.length)
      // First mount — light everything at rest, no fireworks for history.
      stars.forEach((s, i) => {
        lit.current[i] = s.restLit
        known.current.set(s.slot, s.state)
      })
      return
    }
    stars.forEach((s, i) => {
      const was = known.current.get(s.slot)
      if (was && was !== s.state) flare.current[i] = 1
      known.current.set(s.slot, s.state)
    })
  }, [stars])

  useFrame(({ clock }, delta) => {
    // Down at the rose the whole sky is hidden — skip 60 stars' worth of work.
    if (!active) return

    const d = Math.min(delta, 0.05)
    const t = clock.getElapsedTime()

    visionClock.current = vision ? visionClock.current + d : 0
    const vt = visionClock.current
    // Every star blooms together once the one-by-one sweep has finished.
    const bloom =
      vision && vt >= VISION_SWEEP && vt < VISION_SWEEP + VISION_BLOOM
        ? Math.sin(((vt - VISION_SWEEP) / VISION_BLOOM) * Math.PI)
        : 0
    const lastIndex = Math.max(1, data.unlockOrder.length - 1)

    for (let i = 0; i < stars.length; i++) {
      const s = stars[i]
      const core = coreRefs.current[i]
      const glow = glowRefs.current[i]
      if (!core || !glow) continue

      let target: number
      if (vision) {
        // Its turn in the sweep, then a quick rise — the shape assembles itself
        // star by star along the order it will really wake in.
        const turnAt = ((orderIndex.get(s.slot) ?? 0) / lastIndex) * VISION_SWEEP
        const rise = Math.max(0, Math.min(1, (vt - turnAt) / VISION_STAR_RISE))
        target = LIT_LOCKED * 0.4 + easeOutCubic(rise) * (LIT_FILLED - LIT_LOCKED * 0.4)
      } else {
        // The completion sequence lights the whole real sky at once.
        target = igniting ? Math.max(s.restLit, LIT_FILLED) : s.restLit
      }
      // Snap up fast during the sweep so each star reads as a distinct beat,
      // and settle gently back to reality once the vision releases.
      lit.current[i] += (target - lit.current[i]) * Math.min(1, d * (vision ? 6 : 1.6))

      // A newly woken or newly filled star flares bright gold, then settles.
      if (flare.current[i] > 0) flare.current[i] = Math.max(0, flare.current[i] - d / 2.2)
      const burst = Math.sin(flare.current[i] * Math.PI) * 1.5

      // A star she hasn't seen yet keeps pulsing until she comes and looks.
      const isNew = !vision && newSlots?.has(s.slot)
      const pulse = isNew ? 0.42 + Math.sin(t * 2.6 + s.twinklePhase) * 0.42 : 0

      // Ambient shimmer — never still, never distracting.
      const shimmer = 1 + Math.sin(t * s.twinkleSpeed + s.twinklePhase) * 0.11
      const luminance = (lit.current[i] + burst + bloom * 0.9 + pulse) * shimmer

      // Each star breathes on its own path around its home position.
      core.position.set(
        s.home.x + Math.sin(t * 0.13 + s.driftPhase) * 0.05,
        s.home.y + Math.cos(t * 0.11 + s.driftPhase) * 0.05,
        s.home.z + Math.sin(t * 0.09 + s.driftPhase * 1.7) * 0.04
      )
      glow.position.copy(core.position)

      const coreScale = 0.055 * s.size * (0.55 + luminance * 0.55)
      core.scale.setScalar(coreScale)

      const mat = core.material as THREE.MeshBasicMaterial
      mat.opacity = Math.min(1, 0.25 + luminance)
      // Colour is driven here rather than in the star list, so toggling the
      // vision never reallocates every star. Lerped, so it warms and cools.
      mat.color.lerp(vision ? COLOR_FILLED : s.color, Math.min(1, d * 3))

      glow.scale.setScalar(0.62 * s.size * (0.5 + luminance * 0.85))
      const gm = glow.material as THREE.SpriteMaterial
      gm.opacity = Math.min(1, luminance * 0.72)
      gm.color.lerp(vision ? COLOR_FILLED : s.color, Math.min(1, d * 3))
    }
  })

  return (
    <group>
      {stars.map((s, i) => (
        <group key={s.slot}>
          {/* The star itself — a small unlit sphere of pure colour, left to the
              bloom pass to turn into light. */}
          <mesh
            ref={(el) => {
              coreRefs.current[i] = el
            }}
            geometry={coreGeometry}
            position={s.home}
            frustumCulled={false}
          >
            <meshBasicMaterial color={s.color} transparent toneMapped={false} />
          </mesh>

          {/* Its halo, which is also the tap target — far kinder to a fingertip
              than the few pixels of the core. */}
          <sprite
            ref={(el) => {
              glowRefs.current[i] = el
            }}
            position={s.home}
            frustumCulled={false}
            onClick={
              interactive
                ? (e) => {
                    e.stopPropagation()
                    setActiveSlot(s.slot)
                  }
                : undefined
            }
            onPointerEnter={
              interactive ? () => { document.body.style.cursor = "pointer" } : undefined
            }
            onPointerLeave={
              interactive ? () => { document.body.style.cursor = "auto" } : undefined
            }
          >
            <spriteMaterial
              map={glowTexture}
              color={s.color}
              transparent
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </sprite>

          {/* An anniversary keeps a coloured aura around it, always. */}
          {s.isAnniversary && (
            <sprite position={s.home} scale={1.9 * s.size} frustumCulled={false}>
              <spriteMaterial
                map={glowTexture}
                color={COLOR_ANNIVERSARY}
                transparent
                opacity={0.16 * dim}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
                toneMapped={false}
              />
            </sprite>
          )}
        </group>
      ))}

      {interactive && (
        <ConstellationLines
          data={data}
          positions={positions}
          unlocked={unlocked}
          visionClock={visionClock}
        />
      )}
    </group>
  )
}

/** How many sealed chapters are worth drawing before they're just noise. */
const MAX_VISIBLE_ARCHIVES = 5

/**
 * A finished chapter, rendered as cheaply as it can be: a single additive point
 * cloud. It is far away, dim and untouchable, so paying for meshes, sprites and
 * per-star materials would buy nothing visible.
 */
function SealedConstellation({ data }: { data: ConstellationData }) {
  const points = useMemo(() => {
    const positions = new Float32Array(data.stars.length * 3)
    const colors = new Float32Array(data.stars.length * 3)
    data.stars.forEach((s, i) => {
      positions[i * 3] = s.x * CONSTELLATION_SCALE
      positions[i * 3 + 1] = s.y * CONSTELLATION_SCALE
      positions[i * 3 + 2] = s.z * CONSTELLATION_SCALE
      const b = 0.34 * s.brightness
      colors[i * 3] = COLOR_FILLED.r * b
      colors[i * 3 + 1] = COLOR_FILLED.g * b
      colors[i * 3 + 2] = COLOR_FILLED.b * b
    })
    return { positions, colors }
  }, [data])

  const glowTexture = useMemo(() => getGlowTexture(), [])

  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[points.positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[points.colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        map={glowTexture}
        size={0.44}
        vertexColors
        transparent
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </points>
  )
}

// ── The sky above the rose ───────────────────────────────────────────────────

/**
 * Everything the couple has built, suspended in the same world as the rose and
 * far above it. Completed chapters drift nearby and stay forever; the universe
 * grows sideways into the dark as the years pass.
 */
export function Constellation() {
  const groupRef = useRef<THREE.Group>(null)
  const igniting = useSceneStore((s) => s.igniting)
  const universeMode = useSceneStore((s) => s.universeMode)
  const view = useConstellation()
  const newStars = useNewStars()

  // Off-screen entirely while the camera is down at the rose — no reason to pay
  // for 60 stars nobody can see.
  const visible = universeMode !== "rose"

  useFrame(({ clock }) => {
    const g = groupRef.current
    if (!g || !visible) return
    const t = clock.getElapsedTime()

    // The whole constellation drifts — barely. You feel it more than see it.
    g.rotation.y = Math.sin(t * 0.045) * 0.06
    g.rotation.z = Math.sin(t * 0.031) * 0.018
    g.position.y = UNIVERSE_Y + Math.sin(t * 0.07) * 0.14

    // On completion the sky takes one long breath.
    const pulse = igniting ? 1 + Math.sin(t * 1.1) * 0.022 : 1
    g.scale.setScalar(pulse)
  })

  return (
    <group ref={groupRef} position={[0, UNIVERSE_Y, 0]} visible={visible}>
      <ConstellationBody
        data={view.constellation}
        memories={view.memories}
        unlockedSlots={view.unlockedSlots}
        interactive
        newSlots={newStars.slots}
      />

      {/* Sealed chapters, hanging further out in the dark. They are finished and
          permanent, so they cost almost nothing: one point cloud each rather
          than a hundred meshes and sprites. Only the most recent few are drawn —
          past that they'd be specks behind specks. */}
      {view.completed.slice(-MAX_VISIBLE_ARCHIVES).map((done, i, shown) => {
        const ring = shown.length - i // nearest sealed chapter sits closest
        const angle = ring * 2.399 // golden angle — they never line up in a row
        return (
          <group
            key={done.index}
            position={[
              Math.cos(angle) * ARCHIVE_SPACING * (1 + (ring - 1) * 0.16),
              Math.sin(angle) * ARCHIVE_SPACING * 0.36,
              -ring * 7,
            ]}
            scale={0.66}
          >
            <SealedConstellation data={done} />
          </group>
        )
      })}
    </group>
  )
}
