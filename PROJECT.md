# The Enchanted Rose — Project Reference

A deeply personal, single-user romantic web experience. A boyfriend built this as a living gift for his girlfriend — a glowing rose under a glass dome that she tends every day. If she stops coming, petals fall. If she keeps coming, a constellation of memories grows around it.

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

*Last updated: June 2026. All features implemented and verified.*
