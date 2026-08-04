"use client"
import { useRef, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { makeRng } from "@/lib/constellation/random"
import { useSceneStore } from "@/lib/store/sceneStore"
import { UNIVERSE_Y } from "@/lib/constellation/useConstellation"

// The deep space the whole world sits inside — the rose in the foreground and
// the constellation far above it are lit by the same sky. It is drawn on the
// inside of one large sphere plus two point clouds, all additive and all very
// faint, so at the rose it reads as nothing more than atmosphere.

const SKY_RADIUS = 70
const FAR_STAR_COUNT = 900
const DUST_COUNT = 220

/** Slow, layered value noise — enough for soft nebula clouds, cheap enough for phones. */
const NEBULA_VERT = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const NEBULA_FRAG = /* glsl */ `
  precision mediump float;
  varying vec3 vDir;
  uniform float uTime;

  float hash(vec3 p) {
    p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  float noise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
          mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
      mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
          mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
  }

  float fbm(vec3 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * noise(p);
      p *= 2.03;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    // Two clouds drifting at different speeds, one blue and one violet. Kept
    // fine-grained and faint: these are distant nebulae behind a field of stars,
    // not fog in the foreground.
    vec3 p = vDir * 6.5;
    float drift = uTime * 0.006;
    float a = fbm(p + vec3(drift, drift * 0.4, -drift * 0.7));
    float b = fbm(p * 1.9 + vec3(-drift * 0.8, 0.0, drift * 0.5));

    vec3 blue   = vec3(0.10, 0.16, 0.40);
    vec3 violet = vec3(0.22, 0.10, 0.36);

    float clouds = smoothstep(0.52, 0.98, a) * 0.34 + smoothstep(0.66, 1.0, b) * 0.20;
    vec3 color = mix(blue, violet, smoothstep(0.35, 0.8, b));

    // Fade the nebulae out toward the ground so they never wash over the rose's
    // own warm world — they belong to the sky, and they only really open up at
    // the altitude the constellation hangs at.
    float height = smoothstep(-0.1, 0.75, vDir.y);

    gl_FragColor = vec4(color * clouds * height, 1.0);
  }
`

function Nebulae() {
  const matRef = useRef<THREE.ShaderMaterial>(null)
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), [])

  useFrame(({ clock }) => {
    uniforms.uTime.value = clock.getElapsedTime()
    if (matRef.current) matRef.current.uniformsNeedUpdate = true
  })

  return (
    <mesh frustumCulled={false} renderOrder={-10}>
      <sphereGeometry args={[SKY_RADIUS, 32, 24]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={NEBULA_VERT}
        fragmentShader={NEBULA_FRAG}
        uniforms={uniforms}
        side={THREE.BackSide}
        transparent
        blending={THREE.AdditiveBlending}
        // Depth-tested, but never writing: the sky sits at radius 70, so it is
        // correctly occluded by the rose and its dome instead of being additively
        // painted over the top of them.
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  )
}

/** Tiny distant stars, scattered on the inside of the sky and never moving. */
function DistantStars() {
  const { positions, colors } = useMemo(() => {
    const rng = makeRng("distant-stars")
    const positions = new Float32Array(FAR_STAR_COUNT * 3)
    const colors = new Float32Array(FAR_STAR_COUNT * 3)

    for (let i = 0; i < FAR_STAR_COUNT; i++) {
      // Even coverage of the sphere, biased upward — most of the sky is above.
      const u = rng()
      const theta = rng() * Math.PI * 2
      const phi = Math.acos(1 - 2 * u) * 0.92
      const r = SKY_RADIUS * 0.94
      positions[i * 3] = Math.sin(phi) * Math.cos(theta) * r
      positions[i * 3 + 1] = Math.cos(phi) * r * 0.85 + 12
      positions[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * r

      // Mostly cold white, a few warm — a real sky is never one colour.
      const warm = rng() > 0.82
      const b = 0.45 + rng() * 0.55
      colors[i * 3] = (warm ? 1.0 : 0.82) * b
      colors[i * 3 + 1] = (warm ? 0.9 : 0.87) * b
      colors[i * 3 + 2] = (warm ? 0.76 : 1.0) * b
    }
    return { positions, colors }
  }, [])

  return (
    <points frustumCulled={false} renderOrder={-9}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.34}
        vertexColors
        transparent
        opacity={0.85}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </points>
  )
}

/**
 * Cosmic dust around the constellation — the same slow motes that drift near the
 * rose, only up here, so the two altitudes feel like one continuous world.
 */
function CosmicDust() {
  const ref = useRef<THREE.Points>(null)
  const universeMode = useSceneStore((s) => s.universeMode)

  const { positions, drift } = useMemo(() => {
    const rng = makeRng("cosmic-dust")
    const positions = new Float32Array(DUST_COUNT * 3)
    const drift = new Float32Array(DUST_COUNT * 3)
    for (let i = 0; i < DUST_COUNT; i++) {
      positions[i * 3] = rng.jitter(16)
      positions[i * 3 + 1] = rng.jitter(11)
      positions[i * 3 + 2] = rng.jitter(11)
      drift[i * 3] = rng.jitter(0.05)
      drift[i * 3 + 1] = 0.02 + rng() * 0.05
      drift[i * 3 + 2] = rng.jitter(0.04)
    }
    return { positions, drift }
  }, [])

  useFrame((_, delta) => {
    const pts = ref.current
    if (!pts || universeMode === "rose") return
    const attr = pts.geometry.attributes.position as THREE.BufferAttribute
    const arr = attr.array as Float32Array
    const d = Math.min(delta, 0.05)
    for (let i = 0; i < DUST_COUNT; i++) {
      arr[i * 3] += drift[i * 3] * d
      arr[i * 3 + 1] += drift[i * 3 + 1] * d
      arr[i * 3 + 2] += drift[i * 3 + 2] * d
      if (arr[i * 3 + 1] > 11) arr[i * 3 + 1] = -11
    }
    attr.needsUpdate = true
  })

  // Nothing to compute while the camera is down at the rose.
  const visible = universeMode !== "rose"

  return (
    <points ref={ref} position={[0, UNIVERSE_Y, 0]} visible={visible} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.075}
        color="#cfd8ff"
        transparent
        opacity={0.4}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </points>
  )
}

export function CosmicBackdrop() {
  return (
    <>
      <Nebulae />
      <DistantStars />
      <CosmicDust />
    </>
  )
}
