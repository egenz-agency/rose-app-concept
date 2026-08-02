# The Enchanted Rose — Project Reference

A deeply personal, single-user romantic web experience. A boyfriend built this as a living gift for his girlfriend — a glowing rose under a glass dome that she tends every day. If she stops coming, petals fall. If she keeps coming, a constellation of memories grows around it.

---

## What's new — August 2026 (multi-tenant branch)

The gift became a **product you can sell**. Previously anyone who signed up got a fully
working gift for free; there was no payment, no entitlement, and no way to take money.

**Payments (Stripe).** A gift is bought once and stays live for **one year** — a one-time
payment, no auto-renewing subscription. The owner builds the gift for free and pays only to
make the private link work; when the year lapses they buy another and the same link returns.
Checkout → webhook → entitlement → invoice is wired end to end and verified with a real
test purchase. See *Payments* below.

**Entitlement gating.** `lib/payments/entitlement.ts` is the single definition of "is this
gift live", used by every gate — the share link, the gift page, all its server actions, the
PWA manifest, and the dashboard. An unpaid draft or lapsed gift is indistinguishable from
one that never existed, so a recipient is never shown a paywall meant for the buyer.

**Refunds revoke everything.** A full refund destroys the share link (rotates
`access_token`), drops the recipient's devices, and cuts off media. Stacked years are handled
correctly; partial refunds deliberately don't revoke.

**Media is private.** `tenant-media` moved from a public bucket to signed URLs minted
server-side after the gates. A public URL outlived expiry, refund and deletion — meaning the
most personal content in the gift was never actually revocable.

**Legal + identity.** Real trader identity published (EU consumer law + GDPR controller),
terms rewritten to describe the actual one-year model instead of the subscription language
that was there before, and a refund clause backed by a consent step at checkout.

**Fixes along the way.** Signup no longer tells you to check an inbox that will never receive
anything (while still not leaking which emails have accounts); the service worker no longer
caches dev chunks into a reload loop; `.githooks/pre-commit` blocks Stripe keys from being
committed.

**Known gaps.** One account still manages only **one gift** (every dashboard query takes the
oldest), so repeat purchases and self-testing need a second account. `STRIPE_AUTOMATIC_TAX`
is off pending VAT registration. Custom SMTP is not configured, so Supabase's default sender
won't reach real customers. The legacy single-tenant path (`/rosesecret`, the `roseApi`
fallback) is dead code that should be deleted.

---

## Vision

She opens the site. A video plays. Then the rose appears — dead center, under a glass dome, floating in darkness. Stars orbit it slowly, each one a memory they made together. She presses and holds to tend the rose. It spins, blooms, unfurls. If she misses a day, a petal falls.

The site has one visitor. It does not need to scale. It needs to feel like it was made for exactly one person. Because it was.

---

## Location

```
/Users/iliyantachev/Documents/Work/Project Rose/rose-app
```

**Run:** `npm run dev` → `http://localhost:3000`

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19 + TypeScript |
| Styling | Tailwind CSS v4 |
| 3D | React Three Fiber v9 + Drei v10 |
| Physics | @react-three/rapier v2 |
| Post-FX | @react-three/postprocessing v3 |
| Animation | GSAP 3 + Framer Motion 11 |
| State | Zustand 4 |
| Data | TanStack Query 5 + Supabase |
| Fonts | Cormorant Garamond (display) + EB Garamond (body) |

**Critical:** R3F v9 is required — v8 uses `ReactCurrentOwner` which was removed in React 19. Always install with `--legacy-peer-deps`.

---

## Supabase

**Project:** `enchanted-rose`  
**Project ID:** `gwjmiqjativwhsiwryqw`  
**URL:** `https://gwjmiqjativwhsiwryqw.supabase.co`  
**Region:** eu-north-1

Credentials are in `.env.local`. All queries have localStorage fallbacks — the app works fully offline. Real Supabase is needed only for cross-device persistence and letter unlocking.

### Schema

```sql
rose_state          -- single row (id = 00000000-0000-0000-0000-000000000001)
  petals_remaining  -- integer 0–40
  revivals_remaining -- integer 0–3
  last_visited      -- timestamptz
  streak_days       -- integer
  total_visits      -- integer
  is_dead           -- boolean
  is_final_death    -- boolean
  garden_stage      -- integer 0–4

daily_messages      -- 40 seeded love messages (day_number = null = pool)
letters             -- 4 seeded unlockable letters (unlock at 7, 30, 100, 365 visits)
memory_stars        -- player-created constellation points
gallery_photos      -- photo gallery
visit_log           -- every visit logged
daily_videos        -- videos he uploads for her daily visits
```

RLS is enabled on all tables with open `allow all` policies (single-user, no auth needed).

---

## Design System

### Color Tokens (`app/globals.css`)

```css
--color-bg:            #0a0205   /* near-black with red warmth */
--color-rose-alive:    #cc0044   /* deep crimson */
--color-rose-glow:     #8b0030   /* inner emissive */
--color-rose-dead:     #1a0005   /* drained */
--color-gold:          #c9a84c   /* UI gold */
--color-star:          rgba(245,240,232,0.6)
--color-constellation: rgba(201,168,76,0.25)
--color-warm-lift:     #ff3355   /* dome-open glow */
```

### Typography

- **`t-display`** — Cormorant Garamond, italic, 300 weight. Emotional copy only.
- **`t-serif`** — EB Garamond, 400 weight. Body / functional text.
- **`t-label`** — EB Garamond, 10px, 0.28em tracking, uppercase, gold. Labels only.
- **`t-stat`** — Cormorant Garamond, tabular-nums. Numbers only.

### Glass Components

```css
.glass           /* backdrop blur + gold border */
.glass-bezel     /* outer gold gradient ring */
.glass-bezel-inner /* inner dark glass surface */
```

### Spatial Law

- The rose owns the center. Always.
- UI lives in the corners. Nearly invisible.
- Stars breathe at the edges.
- Every transition is slow and weighted. Nothing snaps.

---

## App Phase State Machine

```
LOADING → VIDEO → INTRO_ANIMATION → ROSE_REVEAL → INSTRUCTIONS → IDLE
                                                                     ↓
                                                                  CARING
                                                                     ↓
                                                                  REVIVAL
                                                                     ↓
                                                                 FINAL_DEATH
```

State is managed by Zustand in `lib/store/sceneStore.ts`.

### Phase Durations

| Phase | Duration | What happens |
|---|---|---|
| LOADING | Until preloader completes | Asset loading, gold progress bar |
| VIDEO | Until video ends or skip | Intro video with cinematic bars |
| INTRO_ANIMATION | 2.8 seconds | Camera sweeps from overhead down |
| ROSE_REVEAL | 4.8 seconds | Petals bloom 0→32, cinematic copy |
| INSTRUCTIONS | Until button clicked | Glass card with rules |
| IDLE | Indefinite | Rose scene, nav, constellation, view controls |
| CARING | Until closed | Rose care panel (accessed via HUD "Tend Rose") |
| REVIVAL | Until revived or final | Ember hold mechanic |
| FINAL_DEATH | Terminal | Cinematic letter reveal |

---

## Zustand Store (`lib/store/sceneStore.ts`)

### State

```typescript
phase: ScenePhase
previousPhase: ScenePhase | null
rose: RoseState | null
dailyMessage: string | null
isFirstVisitToday: boolean
petalsFallen: number[]      // indices of fallen petals (0–39)
isAudioEnabled: boolean
activePanelId: string | null
isLoading: boolean
simulationPetals: number | null  // null = real data, number = GrowthSimulator override
domeLifted: boolean              // triggers GSAP dome lift animation
bloomTriggered: boolean          // triggers 3D rose bloom/spin
holdProgress: number             // 0–1, drives HoldRing SVG
isHolding: boolean
viewPreset: "close" | "wide" | "default" | null  // camera vantage preset
viewTick: number                 // bumped on every setViewPreset call (triggers camera GSAP)
magicActive: boolean             // true during the magic hold sequence (stars whirl, sparkles burst)
```

### Key Actions

```typescript
setPhase(phase)              // phase machine transition
triggerBloom()               // fire rose bloom animation (spin + scale pulse)
resetBloom()                 // called by RoseModel after animation completes
setDomeLifted(bool)          // animate dome up/down
setHoldProgress(0–1)         // drive hold ring
setSimulationPetals(n)       // GrowthSimulator override
setViewPreset(preset)        // glide camera to "close" | "wide" | "default"
setMagicActive(bool)         // toggle magic hold sequence (sparkles + star whirl)
```

---

## File Structure

```
rose-app/
├── app/
│   ├── layout.tsx                 # fonts, metadata, viewport
│   ├── globals.css                # design tokens, glass classes, typography
│   ├── page.tsx                   # → ExperiencePage
│   ├── experience/
│   │   └── ExperiencePage.tsx     # phase orchestration, hold mechanic, magic sequence
│   └── api/
│       ├── rose-state/route.ts
│       ├── visit/route.ts
│       └── revive/route.ts
│
├── components/
│   ├── scene/
│   │   ├── SceneRoot.tsx          # R3F Canvas + nested Suspense boundaries (critical)
│   │   ├── SceneErrorBoundary.tsx # catches 3D crashes, UI still shows
│   │   ├── CameraRig.tsx          # GSAP camera per phase; yields to OrbitControls in IDLE
│   │   ├── CameraControls.tsx     # OrbitControls in IDLE/INSTRUCTIONS + view-preset glide
│   │   ├── RoseDome.tsx           # dome + plinth + table texture + dome lift GSAP
│   │   ├── RoseModel.tsx          # GLB loader, Rose.png texture (true colours), cursor tilt, bloom
│   │   ├── MemoryStarField.tsx    # orbiting stars + magic whirl + newborn scale-in
│   │   ├── MagicSparkles.tsx      # soft round particle burst during magic hold (NEW)
│   │   ├── SceneLighting.tsx      # physically-based lights; Environment in own Suspense
│   │   ├── PetalParticles.tsx     # physics petal drops (Rapier)
│   │   ├── DustParticles.tsx      # ambient dust motes
│   │   ├── GardenLayer.tsx        # progressive garden (stages 0–4)
│   │   └── PostProcessing.tsx     # Bloom + Vignette (DepthOfField removed — blacks out scene)
│   │
│   ├── ui/
│   │   ├── Preloader.tsx          # SVG rose + "AWAKENING THE ROSE" + gold bar
│   │   ├── IntroVideo.tsx         # video player (first visit = intro.mp4, return = daily_videos)
│   │   ├── RoseReveal.tsx         # petals grow 0→32 + cinematic copy lines
│   │   ├── InstructionsPanel.tsx  # glass card with rules + "Begin the magic" CTA
│   │   ├── NavigationHUD.tsx      # floating pill (Tend Rose / Letters / Stars)
│   │   ├── HoldRing.tsx           # SVG circular progress ring (hold-to-tend feedback)
│   │   ├── ViewControls.tsx       # right-edge view-angle buttons: Near / Dome / Heavens (NEW)
│   │   ├── CarePanel.tsx          # post-hold panel: petal grid, stats, daily message
│   │   ├── RevivalPanel.tsx       # ember hold mechanic + lives counter
│   │   ├── FinalDeathScene.tsx    # cinematic text reveal + personal letter
│   │   ├── LettersPanel.tsx       # 4 unlockable letters (7/30/100/365 visit gates)
│   │   ├── MemoryStarPanel.tsx    # list/create memory stars
│   │   ├── GrowthSimulator.tsx    # "Preview growth" scrubber (bottom-left, IDLE only)
│   │   └── Icons.tsx              # all SVG icons inline (no emoji, no icon library)
│   │
│   └── providers/
│       └── QueryProvider.tsx      # TanStack Query client
│
├── lib/
│   ├── store/
│   │   └── sceneStore.ts
│   ├── animation/
│   │   ├── timelines.ts           # CAMERA_POSITIONS, TIMELINE_DURATIONS, BLOOM_INTENSITIES
│   │   └── easings.ts             # EASE_CINEMATIC, EASE_SPRING, TRANSITION_PANEL etc.
│   └── supabase/
│       ├── client.ts              # getSupabaseClient() + isSupabaseConfigured check
│       ├── queries.ts             # all DB ops: fetchRoseState, recordVisit, reviveRose, etc.
│       ├── localStars.ts          # localStorage CRUD for memory stars (offline fallback)
│       └── server.ts              # server-side Supabase client
│
├── public/
│   ├── models/
│   │   └── rose.glb               # the 3D rose model (export of rose_model/source/211109_Day3.blend)
│   ├── textures/
│   │   ├── Rose.png               # 1200×1200, deep-red bloom + green leaves (photo texture)
│   │   └── TableTexture.png       # 2048×2048, applied to plinth cylinder
│   ├── fonts/
│   │   └── Cormorant-Italic.woff  # troika font for star labels (MUST exist — 404 suspends scene)
│   └── intro.mp4                  # Beauty and the Beast scene (first-ever visit)
│
├── supabase/
│   └── migrations/
│       ├── 001_initial.sql        # schema + RLS + seed rose_state row
│       └── 002_seed.sql           # 40 messages + 4 letters
│
├── types/
│   ├── scene.ts                   # ScenePhase, RoseState, GardenStage types
│   ├── database.ts                # Supabase table types
│   ├── global.d.ts
│   └── r3f.d.ts
│
└── .env.local                     # Supabase URL + anon key
```

---

## Core Interactions

### 1. Magic Hold (PRIMARY INTERACTION — replaces direct CARING entry)

**Where:** `ExperiencePage.tsx` → `runMagic()` → passed as `onDomePointerDown`/`onDomePointerUp` to `RoseDome`

**Mechanic:**
- Press & hold the glass dome → RAF-based progress 0→1 over 1.5 seconds
- `HoldRing.tsx` shows a gold SVG circular progress ring centered on screen
- Short tap (< 200ms release) = toggle dome lift instead
- On hold complete: `runMagic()` fires — no CARING phase, just the magic sequence
- Daily tending (CARING) is accessed via the **Tend Rose** button in the NavigationHUD

**Magic Sequence (`runMagic`):**
```
setMagicActive(true) + setDomeLifted(true) + setViewPreset("close") + triggerBloom()
  ↓ [900ms]
  createMemoryStar() → invalidate ["memory-stars"] query → newborn star scales in
  ↓ [4200ms total]
  setMagicActive(false) + setViewPreset("default")
```

**What you see:**
- Camera glides in close on the bloom
- Stars orbit 7× faster (whirl in circles)
- 140 soft glowing sparkle-orbs burst and swirl outward (`MagicSparkles.tsx`)
- Rose blooms, spins 360°, emissive flash
- A new memory star scales in from zero and joins the constellation
- Everything settles back to normal after ~4 seconds

### 2. Tend Rose (Daily Care — via HUD)

**Where:** `NavigationHUD.tsx` → "Tend Rose" button → `setPhase("CARING")`

**Mechanic:**
- Opens `CarePanel` which auto-calls `recordVisit()` on mount
- Records the daily visit: petal count, streak, garden stage
- On success: `triggerBloom()` → rose bloom animation

### 3. View-Angle Buttons

**Where:** `components/ui/ViewControls.tsx` — right edge of screen, visible in IDLE only

| Button | Preset | Distance | Effect |
|---|---|---|---|
| Near | `close` | 2.8 units | Close on the bloom — see texture/leaves |
| Dome | `default` | 6.6 units | Full dome view (default) |
| Heavens | `wide` | 9.6 units | Pull back — star constellation fills frame |

**How it works:** `setViewPreset(id)` bumps `viewTick`. `CameraControls.tsx` listens to `viewTick` via `useEffect`, reads `VIEW_PRESETS[preset]` (radius + polar angle), GSAP-tweens the camera position while temporarily pausing OrbitControls autoRotate/damping. After the tween, OrbitControls resumes — drag/scroll still works.

**Critical guard:** `if (!preset) return` — passing an unknown preset key throws `undefined.radius` which crashes the Canvas via SceneErrorBoundary.

### 4. Blender-Style Camera (IDLE / INSTRUCTIONS)

**Where:** `components/scene/CameraControls.tsx`

- `OrbitControls makeDefault` — active only in IDLE + INSTRUCTIONS
- **Drag** → 360° orbit around target `[0, 0.9, 0]`
- **Scroll** → zoom in/out (minDistance 2.2, maxDistance 11)
- **Auto-rotate** — gentle 0.35 speed, stops the instant she grabs it
- Cinematic phases (CARING, REVIVAL, FINAL_DEATH) unmount OrbitControls → `CameraRig` resumes scripted GSAP moves

### 5. Dome Lift

**Where:** `RoseDome.tsx` — `useEffect([domeLifted])`

- `domeLifted = true` → GSAP: dome Y +3.2 units, opacity → 0, inner light 2.5 → 5.0
- Auto-returns after 5 seconds via `setTimeout(() => setDomeLifted(false), 5000)`
- `domeLifted = false` → GSAP: dome returns to PLINTH_TOP, opacity → 0.06, light → 2.5

### 6. Revival Ember Hold

**Where:** `RevivalPanel.tsx`

- Same hold mechanic as tending but 3 seconds
- Lives shown as 3 dots (crimson = remaining, grey = spent)
- On complete: `reviveRose()` → petals restore → `triggerBloom()`
- No revivals: "See the ending" → `setPhase("FINAL_DEATH")`

### 7. Cursor-Reactive Tilt

**Where:** `RoseModel.tsx` — `useFrame`

- Reads `useThree().pointer` (normalized -1 to 1)
- Lerps `groupRef.rotation.x/y` toward pointer position
- Max ±5° (0.087 rad), smooth factor 0.04

---

## 3D Scene Architecture

### Camera Positions (`lib/animation/timelines.ts`)

```typescript
cinematic_start: { x: 0, y: 10,  z: 0.1 }  // overhead sweep start
intro:           { x: 0, y: 4.5, z: 9   }   // post-sweep
idle:            { x: 0, y: 2.8, z: 6.5 }   // snap position before OrbitControls takes over
focus:           { x: 0, y: 2.5, z: 4.5 }   // care mode (closer)
revival:         { x: 1.5, y: 4, z: 7   }
final_death:     { x: 0, y: 6,   z: 12  }
```

In IDLE/INSTRUCTIONS CameraRig snaps to the idle position then yields to `CameraControls` (OrbitControls). No per-frame drift in IDLE — OrbitControls handles movement.

### View Presets (`CameraControls.tsx`)

```typescript
VIEW_PRESETS = {
  close:   { radius: 2.8, polar: 1.32 },  // Near button
  wide:    { radius: 9.6, polar: 1.02 },  // Heavens button
  default: { radius: 6.6, polar: 1.28 },  // Dome button
}
```

### Rose Material (Updated)

The `Rose.png` texture is a real photo with **deep-red bloom and green leaves**. The material uses the texture's true colours instead of tinting them crimson:

| State | Color | Emissive | EmissiveMap | EmissiveIntensity | Opacity |
|---|---|---|---|---|---|
| Alive (full) | #ffffff | #ffffff | Rose.png | 0.34 × petalRatio | 1.0 |
| Alive (partial) | #ffffff | #ffffff | Rose.png | 0.34 × petalRatio | 1.0 |
| Dead | #0a0005 | #000000 | — | 0 | 0.4 |

Using `emissiveMap: roseTexture` with `emissive: white` means the bloom glows red and the leaves glow green, driven by the photo itself. GSAP transitions animate `emissiveIntensity` only.

### Glass Dome Material

```
meshPhysicalMaterial:
  transmission: 0.88,  thickness: 0.1
  roughness: 0.02,     ior: 1.45
  opacity: 0.06,       transparent: true
  color: #c8e8ff (alive) / #8899aa (dead)
  envMapIntensity: 2.0
```

### Lighting (`SceneLighting.tsx`)

Three.js 0.169+ uses physically-based light units (candela/lux). Legacy intensities (1–3.5) render near-black — use these ranges:

| Light | Color | Intensity | Notes |
|---|---|---|---|
| ambientLight | #3a1418 | 0.6 | Warm lift |
| hemisphereLight | #5a2030 / #0a0205 | 0.25 | Mood gradient |
| Gold key (point, pulsing) | #ffce8a | 40 ±6 | Overhead, GSAP pulse |
| Directional fill | #ffd9a0 | 1.6 | Distance-independent key |
| Crimson rim (point) | #ff2a4a | 24 | Left-back accent |
| Neutral fill front (point) | #fff1dc | 15 | Keeps green leaves readable |
| Neutral fill side (point) | #ffe6cf | 12 | Side fill |
| Rose inner glow (point) | #ff6680 | 4 | Right at bloom |
| Environment | `preset="night"` | — | In own Suspense (HDR from CDN) |

**Critical:** Do NOT raise the neutral fills above ~20 — it blows the bloom white and drowns the green leaves.

### Constellation

Memory stars orbit the rose using deterministic parameters derived from their database ID hash:
- `radius`: 2.2–5.0 units
- `speed`: 0.06–0.16 rad/s (× 7 during `magicActive`)
- `yBase`: 0.4–2.2 units
- `phase`: 0–2π offset

Stars integrate their angle incrementally each frame (not `t * speed`) so the speed multiplier works smoothly. Stars created within the last 8 seconds are flagged `isNewborn` and scale in from 0 over 1.4s.

Gold lines connect consecutive stars (`THREE.LineSegments`, `#c9a84c` at 25% opacity).

### Magic Sparkles (`MagicSparkles.tsx`)

- 140 particles, spiral outward from bloom while `magicActive`
- Soft round sprite (canvas-generated radial gradient, set as `map` + `alphaMap`)
- Four-colour palette: gold / rose-pink / warm-white / crimson
- Additive blending, no depth write
- `life` ref ramps 0→1 (fast, 0.45s) and back 1→0 (slow, 1.1s)
- Particles integrate angle per-frame with `seed[spin]` rates (±clockwise mix)

### PostProcessing (`PostProcessing.tsx`)

- **Bloom** (intensity: idle=0.45, caring=1.2, revival=2.0, dead=0.25; luminanceThreshold 0.9)
- **Vignette** (darkness 0.55)
- DepthOfField **removed** — any `focusDistance ≈ 0` blacks out the entire frame
- ChromaticAberration **removed** — was blacking out on some hardware
- No `ToneMapping` effect — renderer handles ACES at `toneMappingExposure: 1.05`

### Suspense Architecture (Critical)

The entire scene was previously wrapped in ONE `<Suspense fallback={null}>`. A single failing loader (font 404, slow HDR) suspended everything → total black, no rose, no stars, no error.

**Current structure in `SceneRoot.tsx`:**
```jsx
<Canvas>
  <Suspense fallback={null}>          {/* outer: Physics + core scene */}
    <Physics>
      <SceneLighting />               {/* Environment in its OWN Suspense inside */}
      <CameraRig />
      <CameraControls />

      <Suspense fallback={null}>      {/* RoseDome (useGLTF) isolated */}
        <RoseDome />
      </Suspense>

      <GardenLayer />

      <Suspense fallback={null}>      {/* MemoryStarField (troika Text) isolated */}
        <MemoryStarField />
      </Suspense>

      <DustParticles />
      <MagicSparkles />
    </Physics>
    <PostProcessing />
  </Suspense>
</Canvas>
```

**Font requirement:** `public/fonts/Cormorant-Italic.woff` MUST exist. A 404 causes troika to suspend the MemoryStarField Suspense boundary indefinitely (stars never appear). troika accepts `.woff` and `.ttf` but NOT `.woff2`.

---

## Data Flow: `recordVisit()`

Called every time she visits (once per calendar day):

```
1. Fetch current rose_state from Supabase
2. Calculate daysMissed since lastVisited
3. Drop petals: petals -= min(daysMissed, currentPetals)
4. Update streak: +1 if consecutive day, reset to 1 otherwise
5. Update garden_stage: 30→stage1, 90→stage2, 180→stage3, 365→stage4
6. Check and unlock letters at visit thresholds (7/30/100/365)
7. Persist to Supabase
8. Pick random message from daily_messages pool
9. Log to visit_log
10. Return: { rose, message, isFirstToday }
```

If Supabase is unreachable, all memory star operations fall back to localStorage via `lib/supabase/localStars.ts`.

---

## Video Logic

**First ever visit** (localStorage key `rose_first_visit_done` not set):
→ plays `/public/intro.mp4` (Beauty and the Beast enchanted rose scene)

**Return visits:**
→ fetches latest row from `daily_videos` table (`is_active = true`, ordered by `created_at DESC`)
→ fallback to `/intro.mp4` if table is empty or Supabase unreachable

To add a new daily video, insert a row into `daily_videos` with the video URL.

---

## Letters System

Four love letters, unlocked by total visit count:

| Letter | Unlocks at |
|---|---|
| The Beginning | 7 visits |
| One Month | 30 visits |
| One Hundred Days | 100 visits |
| One Year — The Last Letter | 365 visits |

Letters are seeded in `supabase/migrations/002_seed.sql`. He can add more directly in Supabase.

---

## Progressive Garden

| Stage | Visits Required | What appears |
|---|---|---|
| 0 (default) | — | Nothing, pure darkness |
| 1 | 30 | 12 small flowers around the dome |
| 2 | 90 | 6 glowing butterfly quads |
| 3 | 180 | Outer garden bed ring |
| 4 | 365 | Greenhouse glow (colored point lights) |

---

## Falling Petals

Petals fall onto the **glass-dome floor** as the rose goes untended, and stay there until it's cared for.

- **Rate:** one petal every **3 hours** since `last_visited` (`HOURS_PER_PETAL` in `ExperiencePage.tsx`), capped at 40. Derived from real elapsed time, so it's correct across reloads.
- **On open:** the floor is seeded with however many petals are already due — they appear **already resting** on the floor, with **no falling animation** (they fell while she was away).
- **Only a petal falling *now* animates.** The store distinguishes intent: `addFallenPetal()` sets `lastAddedPetal` (that one petal drifts down), while `setFallenPetals()` clears it (bulk sync / reset → silent placement). `PetalParticles` animates only `i === lastAddedPetal`.
- **Cleared by:** tending (`CarePanel`) and the press-and-hold bloom (`runMagic`) — both call `setFallenPetals([])`.
- **Motion:** driven by **GSAP tweens, not physics** — each petal drifts from the bloom to a fixed slot on the floor (golden-angle scatter) and rests there. Rapier bodies desynced inside the rotating rose group and never settled.
- **The floor** is the GLB "table" mesh, kept visible, its X/Z footprint scaled to ~0.56 to match the glass base, and given a warm dark-brown material so it contrasts with the pink petals.

---

## Streak

The streak is a **running count of days cared for**, stored in `rose_state.streak_days`. The database is the single source of truth.

- **Display:** read from the DB on every open and shown by `StreakBadge` / `CarePanel`. Nothing on the client derives or overrides it.
- **Increment:** the first tend of a **new day** does `streak_days = streak_days + 1`. Tending again the same day does not change it.
- **Reset only on death:** resets to `0` **only when the rose dies** — after **3 days in a row without a visit**, or if all petals fall. Normal daily use never resets it.
- Applied in **both** `recordVisit()` paths: `lib/server/tenantQueries.ts` (tenant-scoped) and `lib/supabase/queries.ts` (legacy single-tenant).

---

## "I Miss You" Feature (gift-scoped)

A two-way way for the two people in **one gift** to say *"I miss you"*: one taps a heart, the other's phone buzzes with a push notification. Rapid taps batch into a single "×N" ping.

### Security model — why a ping can't cross gifts
This is the important part in a multi-tenant deployment.

- Subscriptions are stored with a **`tenant_id`** and a **`role`** (`giver` | `recipient`), never a free-text name.
- Every action resolves the slug via **`getAccessibleTenant(slug)`**, which requires the secret access-token cookie — a slug alone resolves to nothing.
- Sending selects `tenant_id = <this gift> AND role = <the other role>`. It is therefore **structurally impossible** for one couple's ping to reach another couple's devices.
- `push_subscriptions` and `app_config` have **RLS on with no policy** — only the service-role admin client (server actions) can touch them, matching `rate_limits`.
- Both register and send are **rate-limited** per gift + IP.

### Two sides, two pages
Each person uses **their own** page, so nobody has to pick a role:

| Side | Where | Identity comes from |
|---|---|---|
| **Recipient** (her) | the gift page `/r/[slug]` | the secret access-token cookie → always `recipient` |
| **Giver** (him) | his dashboard `/dashboard` | his logged-in session → always `giver` |

### Flow
1. **Enable (once per device):** one tap → allow notifications. The device subscribes and is registered against that gift with the role implied by the page. No role picker.
2. **Send:** taps batch for 3.5s, then `sendMissYouAction(slug, "recipient", n)` (her) or `sendOwnerMissYouAction(n)` (him).
3. **Route:** the server loads VAPID keys from `app_config`, finds the *other* role's devices in that gift, and sends via `web-push`. Dead subscriptions (404/410) are pruned.
4. **Receive:** the service worker shows `"{name} misses you ×N 💗"` with a heartbeat vibration. Tapping opens **the right page for that person** — her gift (`/r/{slug}`) or his `/dashboard` — reusing an open window when there is one.

If the other side hasn't enabled it yet, the sender is told so rather than the ping silently vanishing.

### Pieces
| Piece | File |
|---|---|
| Server: keys, register, route, send | `lib/server/pushQueries.ts` (`server-only`) |
| Server actions — her side (cookie-checked) | `app/r/[slug]/actions.ts` |
| Server actions — his side (session-checked) | `app/dashboard/actions.ts` |
| Shared browser plumbing | `lib/push/pushCore.ts` |
| Client — her side / his side | `lib/push/missYou.ts` / `lib/push/missYouOwner.ts` |
| Her button (gift page) | `components/ui/MissYouButton.tsx` |
| His card (dashboard) | `app/dashboard/MissYouOwner.tsx` |
| Service worker push + notificationclick | `public/sw.js` |
| Tables | `push_subscriptions`, `app_config` (rose-saas) |

### Keys
The **public** VAPID key is served to the browser on demand; the **private** key lives only in `app_config` on rose-saas (RLS-locked, service-role only) — never in git, and a **separate keypair** from the single-tenant `enchanted-rose` deployment.

### Requirements / gotchas
- **iOS:** Web Push only works for a PWA **installed to the home screen** on **iOS 16.4+** — not in a Safari tab. iOS also ignores the `vibrate` pattern (the system decides).
- Each side enables on **their own page** (she on the gift link, he on the dashboard) — that is what assigns the role.
- Re-enabling on the same device updates in place (keyed on endpoint), so a device can move sides without duplicating.
- If the other side hasn't enabled yet, the sender is told rather than the ping silently vanishing.

---

## Known Issues & Notes

### SceneErrorBoundary
`components/scene/SceneErrorBoundary.tsx` wraps `SceneRoot`. If any 3D component throws (GLB load error, Three.js crash, unknown viewPreset key), the canvas silently disappears but all UI layers remain functional. **Always guard `VIEW_PRESETS[preset]` — an unknown key returns `undefined` and crashes the whole Canvas.**

### PostProcessing
`DepthOfField` blacks the frame when `focusDistance ≈ 0`. `ToneMapping` effect combined with the renderer's own ACES blows the scene white. Current chain (Bloom + Vignette only) is stable.

### RoseModel Geometry Extraction
`RoseModel.tsx` traverses the GLB scene and prefers the mesh named "Rose". Material uses `Rose.png` as both `map` and `emissiveMap` with white base colour so the photo's true colours show through (red bloom, green leaves). Original GLB materials are not used.

### Magic Hold creates a star every time
Each full press-and-hold creates a new memory star. If the constellation gets crowded, prune stars from the **Stars** panel. If you want to gate it (e.g. only create one star total), add a check in `runMagic()`.

### Dev Server Degradation
After heavy Hot Module Replacement (many rapid saves), the preview WebGL context corrupts and renders black. This is NOT a code bug. Fix: `npm run dev` restart. Signs: "THREE.WebGLRenderer: Context Lost" in console, even trivial geometry is black.

### localStorage Offline Mode
The app works without Supabase for memory stars (create/read). Rose state (petals, revivals, visits) requires Supabase to persist. Without credentials, rose state resets on each page load.

### Rapier Deprecation Warning
`using deprecated parameters for the initialization function` — harmless, from `@react-three/rapier`. Petals use Rapier physics for realistic falling behaviour.

---

## Copy Direction

Every word on this site is a letter. Write accordingly.

| Moment | Copy |
|---|---|
| Idle prompt | "She needs you." |
| Tended today | "She has been tended today." |
| On success | "The rose remembers you." |
| Revival prompt | "A single ember still burns. Hold it and breathe her back to life." |
| Death (with revivals) | "The rose has fallen into sleep." |
| Death (no revivals) | "The rose has faded forever." |
| Empty constellation | "Waiting for your first memory." |

Banned words: modern, clean, minimal, premium, professional, elegant, beautiful.

---

## Deployment

1. **Supabase** — already live at `gwjmiqjativwhsiwryqw.supabase.co`. Credentials in `.env.local`.
2. **Vercel** — push to GitHub, connect repo to Vercel, add env vars from `.env.local`.
3. **Video** — upload `intro.mp4` to Vercel/CDN or keep in `public/`. For daily videos, insert rows into `daily_videos` table with a hosted video URL.
4. **Domain** — point a custom domain from Vercel settings.

---

## Payments (multi-tenant / rose-saas only)

A gift is **bought once and stays live for one year**. There is no auto-renewing
subscription — when the year lapses the owner buys another year, and the same
link comes back to life.

### What is gated, and what is not
The owner **builds their gift for free**. Only the things that actually *reach the
recipient* are gated, so a lapsed gift never holds the owner's own writing hostage:

| Gated | Free |
|---|---|
| The share link `/g/<token>` and the gift page `/r/<slug>` | Creating the gift, messages, moments, names, uploads |
| The per-gift PWA manifest (an installed app also goes dark) | The whole dashboard |
| "I miss you" pushes to her phone | — |

### Entitlement
`lib/payments/entitlement.ts` holds the **single definition** of live, shared by the
gates and the dashboard so they can't drift: `status = 'active' AND paid AND expires_at > now()`.
Lifecycle is `draft → live → expired` (plus `suspended`).

New gifts are created by `create_my_tenant()` as **`draft`** — unpaid, link dead.

### Trust model
- Payment is granted **only** by the Stripe webhook, after signature verification over the
  raw body. The browser's `?paid=1` success redirect grants nothing — anyone can visit it.
- The webhook trusts only `metadata.tenant_id`, set server-side at checkout from the buyer's
  own RLS-scoped session — so a checkout can never credit someone else's gift.
- `record_gift_payment()` is **idempotent on the Stripe session id**, so Stripe's retries
  grant exactly one year. Renewals **stack on the remaining time**; a lapsed gift restarts today.
- `gift_payments` has **RLS on with no policy** — only the service-role webhook can read or
  write it (same pattern as `app_config` / `push_subscriptions` / `rate_limits`).
- `record_gift_payment()` has `EXECUTE` **revoked** from `anon` and `authenticated`.
- A draft or expired gift is **indistinguishable from one that never existed** to the
  recipient — she is never shown a paywall meant for the buyer.

### Pieces
| Piece | File |
|---|---|
| Entitlement rule (shared, no server-only imports) | `lib/payments/entitlement.ts` |
| Stripe client + env accessors | `lib/payments/stripe.ts` (`server-only`) |
| Checkout (buy / renew) | `app/dashboard/checkout.ts` |
| Webhook — the only place a gift becomes paid | `app/api/stripe/webhook/route.ts` |
| Paywall + link + renewal UI | `app/dashboard/GiftStatus.tsx` |
| Gates | `lib/security/giftAccess.ts`, `app/g/[token]/route.ts`, `app/r/[slug]/manifest.webmanifest/route.ts` |
| Tables / functions | `tenants.paid`, `tenants.expires_at`, `gift_payments`, `record_gift_payment()` |

### Invoicing + customers
Every buyer gets a **persistent Stripe Customer** (`tenants.stripe_customer_id`), not the
throwaway guest that `customer_email` creates per session — a guest can't be invoiced or
looked up later. `invoice_creation` is on, and the invoice id is stored on the ledger row
(`gift_payments.stripe_invoice_id`) so support can resend a receipt without digging through
the Dashboard.

### Tax (VAT/GST) — read before trusting it
`automatic_tax: { enabled: true }` is set on the Checkout Session, **but Stripe collects
nothing until an active tax registration exists** in the buyer's jurisdiction — and it
returns *no error* when there isn't one. Enabling the flag is not the same as being
compliant. Two more prerequisites:

- The **Product** needs a product tax code (set in the Dashboard; never hardcode a `txcd_`).
- The **Price** needs a `tax_behavior` (inclusive vs exclusive). EU B2C usually shows
  tax-inclusive prices.

Because a saved Customer is used, `billing_address_collection: 'required'` +
`customer_update: { address: 'auto' }` are both set — without them Checkout keeps reusing the
customer's stale saved address and taxes the wrong place.

### Refunds revoke everything
A full refund (`charge.refunded`) calls `revoke_gift_payment()`, which:

1. Recomputes `expires_at` from the payments that remain un-refunded — so refunding
   one of two stacked years leaves the other intact.
2. If no paid time survives: **rotates `access_token`**, permanently killing the shared
   link, and deletes the recipient's `push_subscriptions`.
3. Media stops resolving, because signed URLs are only minted after the entitlement gate.

A **partial** refund deliberately does *not* revoke — that's the goodwill case where you
part-refund someone for a problem but leave their gift running.

Expiry and refund differ on purpose: an expired year restores **the same link** on renewal;
a refunded one issues a **new** link, so a forwarded copy is dead forever.

Manual kill switch, independent of payment:
```sql
update tenants set status = 'suspended' where slug = '…';  -- beats every other state
```

### Media is private
`tenant-media` is a **private** bucket. `customization.introVideoUrl` / `songUrl` store the
storage **path**, and `lib/server/media.ts` mints a 6-hour signed URL at render time — in
`/r/[slug]` and the dashboard, both *after* the gates. A public bucket was the hole here: a
public URL outlives expiry, refund, and deletion, so "revoke their access" silently excluded
the video and the song. Verified: public URL → 400, signed → 200, tampered token → 400.

### Stripe conventions this integration follows
- **Never** pass `payment_method_types` — it would disable dynamic payment methods and lock
  buyers to cards, hurting conversion.
- `integration_identifier` tags sessions for Dashboard funnel comparison. It is **stable**;
  don't regenerate the suffix per session or the sessions stop grouping.
- Prefer a **restricted key** (`rk_`) over `sk_`; on Vercel store it as a *sensitive* env var.
- `.githooks/pre-commit` blocks Stripe keys / `whsec_` / `service_role` from being committed
  (`git config core.hooksPath .githooks`).

### Environment
`STRIPE_SECRET_KEY` (prefer `rk_`), `STRIPE_PRICE_ID` (a **one-time** price, not recurring),
`STRIPE_WEBHOOK_SECRET`. Unset → checkout throws a clear error rather than falling back.

---

## Development Commands

```bash
# Start dev server
cd "/Users/iliyantachev/Documents/Work/Project Rose/rose-app"
npm run dev

# Type check
npx tsc --noEmit

# Build
npm run build

# Apply DB migrations manually (if needed)
# Use Supabase MCP or the dashboard SQL editor
```

---

*Last updated: 1 August 2026 — payments, entitlement gating, refund revocation and private
media added on the `multi-tenant` branch. See "What's new" at the top.*
