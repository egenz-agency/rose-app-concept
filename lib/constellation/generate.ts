// Procedural constellation generation.
//
// These are NOT real constellations. Each one is grown from a seed into an
// abstract piece of celestial artwork: a smooth organic spine, a few branches
// off it, small clusters, and a handful of lonely stars sitting in the negative
// space. The silhouette is meant to read as hand-designed and memorable, not as
// a scientific star map.
//
// The connection graph is the Euclidean minimum spanning tree of the stars as
// seen head-on. That is deliberate: a planar EMST provably contains no crossing
// edges, so "Reveal Constellation" can never draw a tangle over itself, and the
// tree grows outward from one root — which is exactly the order stars unlock in.

import { makeRng, type Rng } from "./random"
import { chapterTitle, constellationName } from "./names"

// ── Public shape ─────────────────────────────────────────────────────────────

export interface ConstellationStar {
  /** Stable slot number. A memory is bound to a constellation by this index. */
  index: number
  x: number
  y: number
  z: number
  /** Relative radius multiplier, ~0.7 – 1.5. */
  size: number
  /** Relative luminance, ~0.6 – 1.0. */
  brightness: number
  /** How many connections this star has — hubs read as anchors of the shape. */
  degree: number
  twinklePhase: number
  twinkleSpeed: number
  driftPhase: number
}

export interface ConstellationEdge {
  a: number
  b: number
  /** Distance from the root, in edges. Drives the reveal's ripple ordering. */
  depth: number
}

export interface Constellation {
  seed: string
  index: number
  /** The name this sky earns once every star is filled. */
  name: string
  /** What it is called while still being written. */
  workingTitle: string
  stars: ConstellationStar[]
  edges: ConstellationEdge[]
  /** The order stars unlock in — a contiguous growth outward from the root. */
  unlockOrder: number[]
  root: number
  /** Max distance of any star from the centre, in local units (~1). */
  radius: number
}

const MIN_STARS = 40
const MAX_STARS = 60
/** Closest two stars may sit in normalized units — keeps every star readable. */
const MIN_SEPARATION = 0.052

// ── Small vector helpers (2.5D — the shape is near-planar with gentle depth) ──

interface Pt {
  x: number
  y: number
  z: number
}

function dist2D(a: Pt, b: Pt) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

/** Catmull-Rom interpolation between p1 and p2, using p0/p3 as tangent context. */
function catmullRom(p0: number, p1: number, p2: number, p3: number, t: number) {
  const t2 = t * t
  const t3 = t2 * t
  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
  )
}

/** Sample a smooth open curve through the given control points. */
function sampleCurve(controls: Pt[], perSegment = 24): Pt[] {
  if (controls.length < 2) return [...controls]
  const out: Pt[] = []
  const at = (i: number) => controls[Math.max(0, Math.min(controls.length - 1, i))]

  for (let i = 0; i < controls.length - 1; i++) {
    const p0 = at(i - 1)
    const p1 = at(i)
    const p2 = at(i + 1)
    const p3 = at(i + 2)
    const last = i === controls.length - 2
    const steps = last ? perSegment : perSegment - 1
    for (let s = 0; s <= steps; s++) {
      const t = s / perSegment
      out.push({
        x: catmullRom(p0.x, p1.x, p2.x, p3.x, t),
        y: catmullRom(p0.y, p1.y, p2.y, p3.y, t),
        z: catmullRom(p0.z, p1.z, p2.z, p3.z, t),
      })
    }
  }
  return out
}

/** Cumulative arc lengths along a polyline (2D — depth is decorative). */
function arcLengths(poly: Pt[]): number[] {
  const acc = [0]
  for (let i = 1; i < poly.length; i++) acc.push(acc[i - 1] + dist2D(poly[i - 1], poly[i]))
  return acc
}

/** Point at normalized arc position u ∈ [0,1] along a polyline. */
function pointAtArc(poly: Pt[], acc: number[], u: number): Pt {
  const target = Math.max(0, Math.min(1, u)) * acc[acc.length - 1]
  let lo = 0
  let hi = acc.length - 1
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1
    if (acc[mid] <= target) lo = mid
    else hi = mid
  }
  const span = acc[hi] - acc[lo] || 1
  const t = (target - acc[lo]) / span
  return {
    x: poly[lo].x + (poly[hi].x - poly[lo].x) * t,
    y: poly[lo].y + (poly[hi].y - poly[lo].y) * t,
    z: poly[lo].z + (poly[hi].z - poly[lo].z) * t,
  }
}

/** Unit tangent of a polyline at normalized arc position u. */
function tangentAtArc(poly: Pt[], acc: number[], u: number): { x: number; y: number } {
  const eps = 0.012
  const a = pointAtArc(poly, acc, u - eps)
  const b = pointAtArc(poly, acc, u + eps)
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy) || 1
  return { x: dx / len, y: dy / len }
}

// ── Stage 1: grow a raw point cloud ──────────────────────────────────────────

/**
 * A wandering spine with a bounded turn rate. Bounding the turn is what keeps
 * the silhouette from curling back into itself and gives it that unhurried,
 * drawn-by-hand flow.
 */
function buildSpine(rng: Rng): Pt[] {
  const controlCount = rng.int(4, 6)
  const controls: Pt[] = []
  let angle = rng.range(0, Math.PI * 2)
  let x = 0
  let y = 0

  for (let i = 0; i < controlCount; i++) {
    controls.push({ x, y, z: rng.jitter(0.18) })
    // Turn by at most ~55°, biased consistently one way so the spine sweeps
    // rather than zig-zags.
    const bias = rng() < 0.5 ? -1 : 1
    angle += bias * rng.range(0.18, 0.95)
    const step = rng.range(0.75, 1.35)
    x += Math.cos(angle) * step
    y += Math.sin(angle) * step
  }
  return controls
}

interface RawCloud {
  points: Pt[]
  /** Indices that came from the spine or a branch — the structural stars. */
  structural: number[]
}

function growCloud(rng: Rng, target: number): RawCloud {
  const points: Pt[] = []
  const structural: number[] = []

  const push = (p: Pt, isStructural: boolean) => {
    points.push(p)
    if (isStructural) structural.push(points.length - 1)
  }

  // ── The spine ──
  const spine = sampleCurve(buildSpine(rng))
  const spineAcc = arcLengths(spine)

  const spineCount = Math.round(target * rng.range(0.4, 0.5))
  // Uneven spacing: walk the curve in jittered steps rather than dividing it up.
  const gaps: number[] = []
  for (let i = 0; i < spineCount; i++) gaps.push(rng.range(0.5, 1.6))
  const gapTotal = gaps.reduce((s, g) => s + g, 0)
  let u = 0
  const spineAnchors: number[] = []
  for (let i = 0; i < spineCount; i++) {
    const p = pointAtArc(spine, spineAcc, u)
    push({ x: p.x + rng.jitter(0.035), y: p.y + rng.jitter(0.035), z: p.z + rng.jitter(0.06) }, true)
    spineAnchors.push(points.length - 1)
    u += gaps[i] / gapTotal
  }

  // ── Branches off the spine ──
  const branchCount = rng.int(2, 4)
  const usedU: number[] = []
  for (let b = 0; b < branchCount; b++) {
    // Keep branch roots apart so the shape doesn't sprout everything from one spot.
    let bu = 0
    for (let tries = 0; tries < 12; tries++) {
      bu = rng.range(0.12, 0.88)
      if (usedU.every((v) => Math.abs(v - bu) > 0.16)) break
    }
    usedU.push(bu)

    const origin = pointAtArc(spine, spineAcc, bu)
    const tan = tangentAtArc(spine, spineAcc, bu)
    // Split off at a real angle so a branch reads as a branch, not a wobble.
    const side = rng() < 0.5 ? -1 : 1
    let angle = Math.atan2(tan.y, tan.x) + side * rng.range(0.55, 1.25)

    const controls: Pt[] = [origin]
    let bx = origin.x
    let by = origin.y
    const segs = rng.int(2, 3)
    for (let s = 0; s < segs; s++) {
      angle += rng.jitter(0.45)
      const step = rng.range(0.4, 0.8)
      bx += Math.cos(angle) * step
      by += Math.sin(angle) * step
      controls.push({ x: bx, y: by, z: origin.z + rng.jitter(0.16) })
    }

    const curve = sampleCurve(controls, 18)
    const acc = arcLengths(curve)
    const n = rng.int(3, 6)
    for (let i = 1; i <= n; i++) {
      const p = pointAtArc(curve, acc, (i / n) * rng.range(0.86, 1.0))
      push({ x: p.x + rng.jitter(0.03), y: p.y + rng.jitter(0.03), z: p.z + rng.jitter(0.05) }, true)
    }
  }

  // ── Small clusters — pockets of density against the open space ──
  const clusterCount = rng.int(3, 5)
  for (let c = 0; c < clusterCount; c++) {
    const anchor = points[rng.pick(structural)]
    const n = rng.int(2, 4)
    const spread = rng.range(0.13, 0.3)
    let a = rng.range(0, Math.PI * 2)
    for (let i = 0; i < n; i++) {
      a += rng.range(1.1, 2.6)
      const r = spread * rng.range(0.5, 1.15)
      push(
        {
          x: anchor.x + Math.cos(a) * r,
          y: anchor.y + Math.sin(a) * r,
          z: anchor.z + rng.jitter(0.07),
        },
        false
      )
    }
  }

  // ── Lonely stars, thrown outward into the negative space ──
  const centroid = points.reduce(
    (s, p) => ({ x: s.x + p.x / points.length, y: s.y + p.y / points.length, z: 0 }),
    { x: 0, y: 0, z: 0 }
  )
  const isolatedCount = rng.int(2, 4)
  for (let i = 0; i < isolatedCount; i++) {
    const from = points[rng.pick(structural)]
    const dx = from.x - centroid.x
    const dy = from.y - centroid.y
    const len = Math.hypot(dx, dy) || 1
    const away = rng.range(0.45, 0.95)
    const swing = rng.jitter(0.7)
    const ox = (dx / len) * Math.cos(swing) - (dy / len) * Math.sin(swing)
    const oy = (dx / len) * Math.sin(swing) + (dy / len) * Math.cos(swing)
    push({ x: from.x + ox * away, y: from.y + oy * away, z: from.z + rng.jitter(0.1) }, false)
  }

  return { points, structural }
}

// ── Stage 2: normalize, prune, judge ─────────────────────────────────────────

function normalize(points: Pt[], rng: Rng): Pt[] {
  if (points.length === 0) return points

  // Centre on the centroid.
  let cx = 0
  let cy = 0
  for (const p of points) {
    cx += p.x / points.length
    cy += p.y / points.length
  }
  let pts = points.map((p) => ({ x: p.x - cx, y: p.y - cy, z: p.z }))

  // Rotate the principal axis flat, then tilt it back off-axis. Flat first so
  // the shape composes inside a landscape frame; tilted after so it never looks
  // mechanically aligned.
  let sxx = 0
  let syy = 0
  let sxy = 0
  for (const p of pts) {
    sxx += p.x * p.x
    syy += p.y * p.y
    sxy += p.x * p.y
  }
  const principal = 0.5 * Math.atan2(2 * sxy, sxx - syy)
  const rot = -principal + rng.jitter(0.3)
  const cos = Math.cos(rot)
  const sin = Math.sin(rot)
  pts = pts.map((p) => ({ x: p.x * cos - p.y * sin, y: p.x * sin + p.y * cos, z: p.z }))

  // Scale so the furthest star sits at radius 1.
  let maxR = 0
  for (const p of pts) maxR = Math.max(maxR, Math.hypot(p.x, p.y))
  const k = maxR > 0 ? 1 / maxR : 1
  // Depth stays shallow — enough for parallax, never enough to read as a cloud.
  return pts.map((p) => ({ x: p.x * k, y: p.y * k, z: p.z * k * 0.55 }))
}

/** Drop stars that crowd an earlier one — every star must be its own light. */
function prune(points: Pt[]): Pt[] {
  const kept: Pt[] = []
  for (const p of points) {
    if (kept.every((q) => dist2D(p, q) >= MIN_SEPARATION)) kept.push(p)
  }
  return kept
}

/** Top up a thin cloud with satellites until it reaches the target count. */
function pad(points: Pt[], target: number, rng: Rng): Pt[] {
  const out = [...points]
  let guard = 0
  while (out.length < target && guard++ < target * 40) {
    const anchor = out[rng.int(0, out.length - 1)]
    const a = rng.range(0, Math.PI * 2)
    const r = rng.range(MIN_SEPARATION * 1.4, 0.18)
    const p = {
      x: anchor.x + Math.cos(a) * r,
      y: anchor.y + Math.sin(a) * r,
      z: anchor.z + rng.jitter(0.05),
    }
    if (out.every((q) => dist2D(p, q) >= MIN_SEPARATION)) out.push(p)
  }
  return out
}

/**
 * How good this silhouette is as a piece of composition: well-proportioned,
 * spread across its frame, and holding real negative space.
 */
function score(points: Pt[]): number {
  if (points.length < MIN_STARS) return 0

  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const p of points) {
    minX = Math.min(minX, p.x)
    maxX = Math.max(maxX, p.x)
    minY = Math.min(minY, p.y)
    maxY = Math.max(maxY, p.y)
  }
  const w = maxX - minX
  const h = maxY - minY
  if (w <= 0 || h <= 0) return 0

  // Proportion — reward something between a square and a wide sweep.
  const aspect = Math.min(w, h) / Math.max(w, h)
  const proportion = 1 - Math.abs(aspect - 0.62) / 0.62

  // Occupancy — some cells full, most empty. That balance is the negative space.
  const GRID = 9
  const cells = new Set<number>()
  for (const p of points) {
    const gx = Math.min(GRID - 1, Math.floor(((p.x - minX) / w) * GRID))
    const gy = Math.min(GRID - 1, Math.floor(((p.y - minY) / h) * GRID))
    cells.add(gy * GRID + gx)
  }
  const occupancy = cells.size / (GRID * GRID)
  const airiness = 1 - Math.abs(occupancy - 0.3) / 0.3

  // Balance — the mass shouldn't pile into one corner of its own frame.
  let cx = 0
  let cy = 0
  for (const p of points) {
    cx += p.x / points.length
    cy += p.y / points.length
  }
  const offX = Math.abs(cx - (minX + maxX) / 2) / (w / 2)
  const offY = Math.abs(cy - (minY + maxY) / 2) / (h / 2)
  const balance = 1 - Math.min(1, (offX + offY) / 1.2)

  const clamp = (v: number) => Math.max(0, Math.min(1, v))
  return clamp(proportion) * 0.4 + clamp(airiness) * 0.34 + clamp(balance) * 0.26
}

// ── Stage 3: connect ─────────────────────────────────────────────────────────

/**
 * Prim's algorithm on the head-on projection. Returns the minimum spanning tree
 * — which for points in a plane is guaranteed free of crossing edges — together
 * with the order stars joined the tree, which becomes the unlock order.
 */
function spanningTree(points: Pt[], root: number) {
  const n = points.length
  const inTree = new Array<boolean>(n).fill(false)
  const best = new Array<number>(n).fill(Infinity)
  const parent = new Array<number>(n).fill(-1)
  const order: number[] = []
  const edges: { a: number; b: number }[] = []

  best[root] = 0
  for (let iter = 0; iter < n; iter++) {
    let pick = -1
    for (let i = 0; i < n; i++) if (!inTree[i] && (pick === -1 || best[i] < best[pick])) pick = i
    if (pick === -1) break

    inTree[pick] = true
    order.push(pick)
    if (parent[pick] >= 0) edges.push({ a: parent[pick], b: pick })

    for (let i = 0; i < n; i++) {
      if (inTree[i]) continue
      const d = dist2D(points[pick], points[i])
      if (d < best[i]) {
        best[i] = d
        parent[i] = pick
      }
    }
  }
  return { edges, order, parent }
}

// ── The generator ────────────────────────────────────────────────────────────

// Generation is pure, so the result can be kept. Several components (the scene,
// the camera, the HUD, the capsule panel) all ask for the same sky on the same
// render, and a couple's completed chapters are rebuilt on every recompute.
const cache = new Map<string, Constellation>()

/**
 * Build the constellation for a given identity and chapter number. Pure and
 * deterministic — same arguments, same sky, forever.
 */
export function generateConstellation(seed: string, index: number): Constellation {
  const key = `${seed} ${index}`
  const hit = cache.get(key)
  if (hit) return hit
  const built = buildConstellation(seed, index)
  // A gift only ever has a handful of chapters; the bound is pure paranoia.
  if (cache.size > 256) cache.clear()
  cache.set(key, built)
  return built
}

function buildConstellation(seed: string, index: number): Constellation {
  const targetCount = makeRng(`count:${seed}:${index}`).int(MIN_STARS, MAX_STARS)

  // Grow a few candidate silhouettes and keep the best-composed one. The loop is
  // fixed and seeded, so "best" is decided the same way on every device.
  let bestPoints: Pt[] = []
  let bestScore = -1
  for (let attempt = 0; attempt < 6; attempt++) {
    const rng = makeRng(`shape:${seed}:${index}:${attempt}`)
    const raw = growCloud(rng, targetCount)
    let pts = prune(normalize(raw.points, rng))
    if (pts.length < targetCount) pts = pad(pts, targetCount, rng)
    if (pts.length > targetCount) pts = pts.slice(0, targetCount)
    pts = normalize(pts, makeRng(`settle:${seed}:${index}:${attempt}`))

    const s = score(pts)
    if (s > bestScore) {
      bestScore = s
      bestPoints = pts
    }
    if (s >= 0.74) break // already a lovely shape — no need to keep rolling
  }

  const points = bestPoints

  // The root — the star nearest the heart of the shape. It is the one that is
  // already lit on day one, and everything else grows outward from it.
  let root = 0
  let rootD = Infinity
  for (let i = 0; i < points.length; i++) {
    const d = Math.hypot(points[i].x, points[i].y)
    if (d < rootD) {
      rootD = d
      root = i
    }
  }

  const { edges: rawEdges, order, parent } = spanningTree(points, root)

  // Distance from the root in edges — the reveal ripples outward along this.
  const depth = new Array<number>(points.length).fill(0)
  for (const i of order) depth[i] = parent[i] >= 0 ? depth[parent[i]] + 1 : 0

  const degree = new Array<number>(points.length).fill(0)
  for (const e of rawEdges) {
    degree[e.a]++
    degree[e.b]++
  }

  const look = makeRng(`look:${seed}:${index}`)
  const stars: ConstellationStar[] = points.map((p, i) => {
    // Hubs anchor the eye; leaves stay delicate. Never uniform, never regular.
    const hub = degree[i] >= 3 ? 0.2 : 0
    const isRoot = i === root ? 0.16 : 0
    return {
      index: i,
      x: p.x,
      y: p.y,
      z: p.z,
      size: 0.72 + look() * 0.42 + hub + isRoot,
      brightness: 0.62 + look() * 0.38 + hub * 0.5,
      degree: degree[i],
      twinklePhase: look() * Math.PI * 2,
      twinkleSpeed: 0.4 + look() * 0.9,
      driftPhase: look() * Math.PI * 2,
    }
  })

  const edges: ConstellationEdge[] = rawEdges.map((e) => ({
    a: e.a,
    b: e.b,
    depth: Math.max(depth[e.a], depth[e.b]),
  }))

  let radius = 0
  for (const p of points) radius = Math.max(radius, Math.hypot(p.x, p.y))

  return {
    seed,
    index,
    name: constellationName(seed, index),
    workingTitle: chapterTitle(index),
    stars,
    edges,
    unlockOrder: order,
    root,
    radius: radius || 1,
  }
}
