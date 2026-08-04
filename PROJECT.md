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

**The Memory Constellation.** Memories stopped being loose orbiting orbs and became a
procedurally generated sky of 40–60 stars, unique to each gift and rebuilt from a seed rather
than stored — no two couples can ever be given the same one. It hangs in the **same 3D world**
as the rose, far above it; the camera flies up to it and back, with no second scene and no page
change. Connections are the sky's minimum spanning tree, which is what guarantees no line ever
crosses another.

Around it: an **arrival cinematic** that shows the sky finished before fading back to the one
star she has actually earned; a **first-visit guide**; a **notification** at the rose each time
tending wakes a new star, which then pulses until she goes and looks; **share** a completed sky
as a picture or a recorded clip; and a **growth preview** that walks the whole arc forward day
by day so the progression can be proven without waiting months for it. See *Memory
Constellation* below.

**A CSS landmine, cleared.** An unlayered `* { padding: 0 }` in `globals.css` was silently
beating Tailwind's `@layer utilities` and nulling **every** padding and margin utility in the
app — 90 of them across 14 files. Panels looked merely cramped rather than broken, so it had
gone unnoticed. See *Padding and margin utilities were dead app-wide*.

**Legal + identity.** Real trader identity published (EU consumer law + GDPR controller),
terms rewritten to describe the actual one-year model instead of the subscription language
that was there before, and a refund clause backed by a consent step at checkout.

**Fixes along the way.** Signup no longer tells you to check an inbox that will never receive
anything (while still not leaking which emails have accounts); the service worker no longer
caches dev chunks into a reload loop; `.githooks/pre-commit` blocks Stripe keys from being
committed.

**Operator console (`/admin`).** A single `masteradmin` — enforced by a unique index, so the
database refuses a second one — sees revenue, the package breakdown and the signup funnel,
and can create free roses without touching Stripe. Keyed on `user_id`, never on an email
address, so changing your email keeps the role and nobody inherits it by re-registering the
old address. Non-admins get a **404**, not a "forbidden" page. See *Operator console* below.

**Packages.** `plan` now names the product tier (`regular` is the base) rather than the
billing shape it used to hold. The catalogue is in `lib/payments/plans.ts`; adding a tier is
one object plus one env var. The package is recorded on the payment as well as the gift, so
upgrading someone never rewrites past revenue.

**CAPTCHA.** Cloudflare Turnstile on signup, sign-in and magic-link. Signup and magic-link
both email whatever address is typed in — without a challenge that's a spam cannon pointed at
strangers, sent from our domain. Invisible for real users; inert until the site key is set.

**Installable apps.** Three distinct PWAs on one origin, each with its own `start_url`: the
gift (`/g/<token>`, so an installed app re-establishes her access cookie), the owner dashboard
(`/dashboard`), and the root. `InstallAppButton` prompts on Chrome/Android, falls back to
Share → Add to Home Screen instructions on iOS (which has no install API), and renders nothing
once installed. On iPhone this is the only route to push notifications. New icons cut from
`public/logo.png`.

**Passwordless sign-in.** One flow for everyone: enter an email, get a numeric code,
you're in (the account is created on first use). No passwords, so no reset flow — which
went through email anyway, protecting nothing the inbox didn't already gate. Deliberately a
**code, not a magic link**: Gmail/Outlook pre-fetch URLs in mail and Supabase's link is
single-use, so a scanner burns it before the human clicks. Templates in
`supabase/email-templates/` are code-only for the same reason — the link and the code are
the same token, so including the URL would let a scanner invalidate the code.

**Two typefaces, split by audience.** The gift keeps Cormorant + EB Garamond; the owner's
surfaces (dashboard, operator console, sign-in, legal) use **Work Sans**. Serif is the
default because the recipient's experience is the product; owner surfaces opt in with
`.ui-surface`. See *Typography* below.

**Support + first-run guide.** "Report a bug" / "Contact us" open a prefilled mailto with
diagnostics attached. A seven-step guide runs on the first dashboard visit, reopenable from
the footer.

**Voice messages.** A moment can carry a recorded voice note — recorded in the browser via
MediaRecorder, or an uploaded audio file for browsers without it. Stored in the **private**
bucket as a path and signed at render, so a lapsed or refunded gift stops serving it along
with everything else. Note the asymmetry: `photo_url`/`video_url` are external links the
owner pastes; `audio_url` is our storage path.

**She can keep it.** Every revealed moment has a Save control — photo, video, voice, or the
words as a `.txt` when there's no media. Implemented as a blob fetch rather than
`<a download>`, which browsers ignore cross-origin, so a signed Supabase URL would otherwise
navigate away from the gift instead of saving.

**Operator console shows engagement.** Each gift lists streak, total visits and when it was
last tended — a gift that is live but never tended is the signal worth seeing.

**Known gaps.** One account still manages only **one gift** (every dashboard query takes the
oldest), so repeat purchases need a second account — the operator console works around this
for your own testing. `STRIPE_AUTOMATIC_TAX` is off pending VAT registration. Custom SMTP is
not configured, so Supabase's default sender won't reach real customers. The legacy
single-tenant path (`/rosesecret`, the `roseApi` fallback, and the stale
`NEXT_PUBLIC_SUPABASE_*` env vars pointing at the old project) is dead code that should be
deleted.

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
| Fonts | Cormorant Garamond + EB Garamond (the gift) · Work Sans (owner surfaces) |

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
memory_stars        -- one memory capsule, bound to one star of one constellation
  title, date, memory, photos
  position_x/y/z      -- legacy: still drives the orbiting MemoryStarField
  constellation_index -- which chapter (0 = the first sky)
  slot_index          -- which generated star holds it; null = adopted into the
                      --   earliest free slot (pre-constellation rows)
  video_url, voice_url, song_url, location, quote
  is_favorite         -- burns brighter
  is_anniversary      -- carries a rose-coloured aura
gallery_photos      -- photo gallery
visit_log           -- every visit logged
daily_videos        -- videos he uploads for her daily visits
```

RLS is enabled on all tables with open `allow all` policies (single-user, no auth needed).

**Migrations are applied by hand** — there is no Supabase CLI setup here and no
`supabase/config.toml`, so `supabase db push` does not work. Paste the file into the project's
SQL editor (or use the Supabase connector) and record it in the file header, as
`rose-saas-migrations/*.sql` do. Two databases, two folders: `supabase/migrations/` →
`gwjmiqjativwhsiwryqw`, `supabase/rose-saas-migrations/` → `fqosivbvqgjjfgfpfcbu`.

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

// ── Memory Constellation ──
universeMode: "rose" | "ascending" | "universe" | "descending"
                                 // where the camera is in the one shared world
revealTick: number               // bumped to animate the connection lines
recenterTick: number             // bumped to re-frame the whole constellation
activeSlot: number | null        // the constellation slot whose capsule is open
igniting: boolean                // the completion sequence is playing
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
setUniverseMode(mode)        // "ascending" starts the flight up; "descending" flies back
triggerReveal()              // draw the constellation's connections, then let them fade
triggerRecenter()            // re-frame the whole constellation (double tap)
setActiveSlot(slot | null)   // open / close a memory capsule
setIgniting(bool)            // the completion sequence (every star lights at once)
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
│   │   ├── Constellation.tsx      # the memory sky: stars, halos, reveal lines, sealed chapters
│   │   ├── ConstellationCamera.tsx # the vertical flight rose ⇄ sky + free look up there
│   │   ├── CosmicBackdrop.tsx     # nebulae (shader), distant stars, cosmic dust
│   │   ├── constellationTextures.ts # shared canvas-drawn glow / flare sprites
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
│   │   ├── ConstellationHUD.tsx   # sky HUD (name, reveal, back) + completion moment
│   │   ├── ConstellationGuide.tsx # first-visit guide to the sky, once per gift
│   │   ├── ConstellationPreview.tsx # walk the sky forward day by day (owner testing)
│   │   ├── MemoryCapsulePanel.tsx # one star opened: read a capsule, or write one
│   │   ├── GrowthSimulator.tsx    # "Preview growth" scrubber (bottom-left, IDLE only)
│   │   └── Icons.tsx              # all SVG icons inline (no emoji, no icon library)
│   │
│   └── providers/
│       └── QueryProvider.tsx      # TanStack Query client
│
├── lib/
│   ├── store/
│   │   └── sceneStore.ts
│   ├── constellation/
│   │   ├── random.ts              # FNV-1a hash + mulberry32 seeded PRNG
│   │   ├── generate.ts            # the procedural generator (spine, branches, EMST)
│   │   ├── names.ts               # the poetic name a completed sky earns
│   │   └── useConstellation.ts    # binds stored memories → slots; unlocks; chapters
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

### 1b. Universe (the flight up to the constellation)

**Where:** `NavigationHUD.tsx` → **Universe**, the fourth item in the nav pill. It sits there
rather than floating at the bottom of the screen, where a real gift already stacks the "I miss
you" button and its hint. While a cinematic owns the camera (emergence or the magic hold) it
renders dimmed and disabled instead of vanishing, so the way in is visible before it is usable.

Sets `universeMode: "ascending"`. The camera climbs ~2.8s through the same world to the sky
above the rose, then `ConstellationCamera` hands over to free look. Everything belonging to
the rose — the nav pill, view controls, "I miss you", the preview buttons, the idle hint —
steps out of frame while `universeMode !== "rose"`. Coming back is the same move reversed.

Up there: **drag** to rotate, **scroll/pinch** to zoom, **double tap** to re-frame, **tap a
star** to open its capsule, **Reveal constellation** to draw the connections.

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

### Orbiting Memory Stars (`MemoryStarField.tsx`)

Distinct from the **Memory Constellation** below — these are the small stars that circle the
rose itself at close range. They predate the constellation and still read `position_x/y/z`.

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
- **In the sky** (`universeMode !== "rose"`): intensity 1.05 (1.55 while igniting) and
  luminanceThreshold drops to 0.42 — up there the stars *are* the image, and that soft halo is
  what makes a point of light read as a star rather than a dot
- **Vignette** (darkness 0.55; 0.72 in the sky)
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

## Memory Constellation

A chapter of the relationship, drawn as a sky of 40–60 stars. Every gift's constellation is
unique, none of them are real constellations, and **none of the geometry is stored** — it is
regenerated from a seed, so a couple's sky is permanent for free and no two gifts can collide.

### Generation (`lib/constellation/generate.ts`)

Seeded by `tenantSlug + chapterIndex` (the legacy personal gift uses the seed
`enchanted-rose`). Pure and deterministic: same arguments, same sky, forever. Results are
memoised in a module-level cache because four components ask for the same sky each render.

The shape is grown, not sampled:

1. **A spine** — a wandering curve of 4–6 Catmull-Rom control points with a bounded turn rate
   (≤ ~55°, biased consistently one way). Bounding the turn is what stops the silhouette
   curling back into itself and gives it an unhurried, drawn-by-hand flow.
2. **2–4 branches** split off at a real angle (0.55–1.25 rad), their roots kept ≥ 0.16 apart
   along the spine so the shape doesn't sprout everything from one spot.
3. **3–5 clusters** of 2–4 satellites — pockets of density against the open space.
4. **2–4 lonely stars** thrown outward into the negative space.

Six candidate silhouettes are grown and scored on **proportion** (aspect near 0.62),
**airiness** (~30% of a 9×9 grid occupied — the rest is the negative space) and **balance**
(mass not piled into one corner). Best wins; the loop is fixed and seeded, so "best" is
decided identically on every device. Stars closer than `0.052` normalized units are pruned so
every star stays its own light.

### Connections are a minimum spanning tree — and that's load-bearing

Edges are the **Euclidean minimum spanning tree** of the stars as seen head-on (Prim's, on the
XY projection). A planar EMST provably contains **no crossing edges**, so "Reveal
Constellation" can never draw a tangle over itself — no geometric special-casing needed.

Prim's *insertion order from the root* doubles as the **unlock order**, so the sky always
grows outward contiguously from its heart rather than lighting up scattered points.

> Verified across 21 constellations from 7 seeds: 40–60 stars each, **zero crossings**,
> deterministic, and distinct per seed and per chapter.

### The sky lives in the rose's world

`UNIVERSE_Y = 28`, `CONSTELLATION_SCALE = 6.4`. There is **no second scene and no route
change** — the constellation is a group in the same `<Canvas>`, hidden while
`universeMode === "rose"` so 60 stars cost nothing down at the flower.

`ConstellationCamera.tsx` owns the journey. `CameraRig` and `CameraControls` both bail out
while `universeMode !== "rose"` so nothing fights over the camera.

| | |
|---|---|
| Up | 2.8s, `power2.inOut`. The **gaze lags** the position by 18% — the rose stays in frame a beat, then slips away beneath her as she rises |
| Down | 2.5s. The gaze **leads**, so the flower is already waiting when she arrives |
| Framing | `(radius × SCALE / tan(fov/2)) × 1.12`, clamped 9–24 |
| Free look | OrbitControls, damped, azimuth ±1.05 and polar ±0.72 — she can look around her sky but can never tumble it or lose it behind her |

The flight effect depends on `universeMode` alone, reading framing through a ref — otherwise a
background refetch of the memories would restart the flight halfway up.

### Unlock progression

`1 + rose.totalVisits` stars are awake, minus those consumed by sealed chapters. One star is
lit on day one; every tending of the rose wakes one more, in the tree's growth order.

| State | Look |
|---|---|
| Asleep | `#6f7fa8`, luminance 0.13 — dim, but the silhouette hints at what's coming |
| Awake, empty | `#f3f6ff`, 0.5 |
| Filled | `#ffd48a`, 1.0 — a permanent warm glow |
| Favourite | `#ffe6b0` at 1.22× |
| Anniversary | `#ffa8c8` plus a persistent coloured aura sprite |

A star that has just woken or just been filled **flares** (a half-sine burst decaying over
2.2s) and settles. Each star drifts on its own small path and shimmers on its own phase.

### Reveal

One `<lineSegments>` for the whole graph — a single draw call. Each edge waits its turn by
its depth from the root, then draws by lerping its far endpoint outward (~2s), holds 1.7s,
fades 1.4s. Edges touching a sleeping star render at 22% in cold blue-white: she can see the
shape she is working toward without it shouting. Additive blending means per-vertex RGB
doubles as alpha.

### Completion and the long term

When every star is filled, the sky ignites, the constellation takes one slow breath, the
connections come back one final time and it receives its **earned poetic name**
(`lib/constellation/names.ts` — four sentence shapes, seeded). Their own song fades in
underneath if the gift has one.

A finished chapter is only **sealed** once the next one has been started — otherwise the
moment a couple wrote their last memory the sky would blink to an empty one, and that moment
is the whole point. Sealed chapters hang nearby at 66% scale and 42% brightness, placed on the
golden angle so they never line up in a row. The universe grows sideways into the dark.

### The overture (`ConstellationOverture.tsx` + the camera)

The arrival cinematic — the constellation's answer to the rose's emergence. ~12.3s, and while
it runs the sky is shown **finished**: every star warm gold, every connection drawn. The sky
assembles itself in three movements before it is joined up — stars light **one after another**
along the constellation's growth order (4.2s), then **all of them bloom together** (1.0s), and
only then do the **connections draw** (from 5.2s). Timings live at the top of
`Constellation.tsx`. It is a
vision of what the two of them are building, never a state she has earned, and it fades back
to the single lit star before she is handed the controls.

Four movements, choreographed in `ConstellationCamera` as a spherical orbit (azimuth, polar,
radius) tweened by GSAP:

| Movement | Shot |
|---|---|
| 3.4s | Falls in from high and far out, until the shape reads as a whole |
| 3.2s | Drifts across its face — the depth in the sky separates here |
| 2.1s | Presses in close, so near stars sweep past far ones |
| 3.0s | Pulls back to the resting frame |

The vision is released one beat *before* the camera settles, so the last thing that happens is
the real sky arriving rather than the camera stopping.

**Captions are driven by the camera, not a clock.** The timeline emits `overtureBeat` via GSAP
`.call()`, and the overlay maps beat → line. Wall-clock timers would drift out of sync with the
shot on a slow device or a throttled tab. They crossfade *without* `mode="wait"` — an incoming
line must never be held hostage by the outgoing one's exit animation.

Plays once per gift (`rose_sky_overture_v1:<seed>`), marked watched the moment it starts so an
interrupted first visit doesn't replay forever. It is a **permanent feature**, not something
spent on the first visit: **The finished sky** in the sky HUD replays it any time. Skip is
always available; skipping mid-flight eases the camera to the resting frame so control is never
handed back at a strange angle.

While it runs, OrbitControls stands down, and the guide, growth preview, sky HUD and double-tap
recentre all step aside.

**`visionActive` never unlocks anything.** It is a render flag read only inside the frame loop:
luminance follows the sweep, and colour is lerped toward the warm gold and back. Deliberately
*not* part of the star list's memo — otherwise toggling it would reallocate all 60 stars and
fire a false "just changed state" flare on every one of them. The moment it clears, the real
unlock state is what remains, and sleeping stars settle back to pale placeholders.

### A star waking (`useNewStars.ts`, `StarWokeToast.tsx`)

Tending the rose wakes a star, and that is announced **at the rose** — because that is where
the waking happens. A toast under the nav reads *"A new star has woken in your sky."* and
carries **Look up**, which starts the flight. It retires after 9s; the stars themselves keep
**pulsing** until she actually goes and looks.

The count of lifetime unlocks she has already seen lives in
`rose_sky_seen_unlocks:<seed>`, **seeded to the current count** on a device that has never seen
this gift — so an existing couple is never told that thirty stars are new. Arriving in the sky
marks them seen after 1.2s. The growth preview is excluded: nothing simulated has really woken.

### Sharing a finished sky (`ShareSky.tsx`, `captureSky.ts`)

Offered once a constellation is complete.

- **Picture** — `toBlob` straight off the canvas. This is why `SceneRoot` sets
  `preserveDrawingBuffer: true`; without it the buffer is cleared and the capture comes back
  empty.
- **Clip** — `captureStream(30)` into a `MediaRecorder` while the overture is replayed, so what
  leaves the app is the cinematic rather than a static frame (~13.4s). The container is chosen
  from what the browser actually supports (mp4/avc1 → vp9 → vp8 → webm); if none is, the option
  is hidden rather than failing.
- Both go through the OS share sheet where `canShare({ files })` allows it, and fall back to a
  download. A cancelled share sheet is **not** treated as a failure, so it doesn't then force a
  download the user just declined.
- The canvas is found by picking the **largest** on the page, not the first — other canvases
  exist and grabbing the wrong one would silently capture nothing.

Deliberately available inside the growth preview too, so the flow can be checked before launch;
the `Preview · day N` badge sits in the captured frame, so a simulated sky labels itself.

### First arrival (`ConstellationGuide.tsx`)

Four short cards, shown **once per gift**, 1.4s after the flight lands. They sit low so the
constellation is never covered, the sky stays draggable behind them, and `Skip` ends it at any
point. Marked read in `localStorage` under `rose_sky_guide_v1:<seed>`; leaving the sky without
finishing does NOT mark it, so an interrupted first visit still gets the guide next time.

While it is up, `guideActive` in the store tells the sky HUD to step aside rather than stack
two pills at the bottom of the screen.

### Growth preview (`ConstellationPreview.tsx`)

Proving the progression works shouldn't cost a hundred days of waiting. **Preview growth**
(bottom-left in the sky) replays the whole arc as if the rose were tended once a day.

Driven by `previewDays` in the store, which stands in for `rose.totalVisits`. When it is not
null, `useConstellation` takes an entirely separate path (`previewView`) that consults **no
stored row and writes nothing** — closing the panel restores the real sky untouched. A gold
`Preview · day N` badge sits top-right the whole time so a simulated sky can never be mistaken
for the real one.

- **Scrub or Play** — one simulated day per 260ms. Stars wake in the constellation's own order.
- **Write a memory each day** (on by default) fills each star as it wakes. This is the only way
  chapters ever complete, so it is also the only way to preview the completion sequence and the
  chapters after the first. With it off, stars wake but stay empty and the sky stops at chapter one.
- **Playback holds on a completed sky.** Completion lasts a single simulated day before the
  chapter seals, so Play would otherwise blow straight past the moment. It stops there, the
  transport becomes **Next chapter**, and pressing it carries on into the following sky.
- Favourites and anniversaries are seeded deterministically (every 7th and 13th star) so those
  two variants actually show up to be checked.

Verified against the `enchanted-rose` seed: day 0 → 1 of 58; day 57 → complete, ignites, earns
*Infinite Garden*; day 58 → Chapter Two, 1 of 49, one chapter sealed. Growth is monotonic and
in range across every day of the first four chapters.

### What keeps it cheap

- The star frame loop **returns immediately while the camera is at the rose**. The sky is
  hidden there, and it was otherwise updating 60 stars every frame for nobody.
- **Sealed chapters render as a single additive point cloud**, not ~100 meshes and sprites
  each. They are distant, dim and untouchable, so per-star materials would buy nothing visible.
  Only the most recent `MAX_VISIBLE_ARCHIVES` (5) are drawn.
- Generation is memoised in a module-level cache; several components ask for the same sky on
  the same render.
- The vision is a frame-loop concern, so it never invalidates the star list.

### Binding memories to slots (`useConstellation.ts`)

Rows carry their own `slot_index`. Rows written **before** the constellation existed have a
null slot and are adopted into the earliest free slot in unlock order, oldest memory first —
so nothing anyone ever wrote is orphaned by the upgrade. Overflow carries into the next
chapter rather than being dropped.

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

### Padding and margin utilities were dead app-wide (fixed)

`app/globals.css` had this as a bare, **unlayered** rule:

```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
```

Unlayered CSS outranks *every* layered rule, and Tailwind v4 puts all utilities in
`@layer utilities` — so this silently beat all 90 `p-*` / `m-*` classes across 14 files.
`gap-*` still worked, which is why it went unnoticed: panels looked merely cramped rather than
obviously broken. The memory capsule's header computed `padding: 0` against its `px-7 pt-7`.

It now lives inside `@layer base`. **Keep it there** — moving it back out re-breaks every
padding utility in the app at once.

Watch for `*/` inside CSS comments too (e.g. writing `p-*/m-*`); it terminates the comment
early and corrupts the following rule.

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

### Typography
Two identities, on purpose. Three tokens in `globals.css`:

| Token | Font | Where |
|---|---|---|
| `--font-display` | Cormorant Garamond | gift headings |
| `--font-body` | EB Garamond | gift body — and the **default** for `body` |
| `--font-ui` | Work Sans | anything inside `.ui-surface` |

Serif is the default because the **recipient's** experience is the product; the owner's
surfaces opt in by putting `.ui-surface` on their root element. Changing the product's UI
typeface is therefore one line, not the 77 inline declarations it used to be.

Two non-obvious details:
- **`button, input, select, textarea { font-family: inherit }`** — form controls do *not*
  inherit font-family; browsers substitute their own UI font. Without that reset every
  button and field silently falls back to Arial regardless of the surface. That is exactly
  why the font used to be repeated inline on all of them.
- **Owner headings dropped italic.** In a serif, italic reads as elegance; in a sans it
  reads as emphasis. Hierarchy there now comes from weight (500) and tighter tracking.
  For the same reason, buttons lost their positive letter-spacing — tracking suits serif
  caps and small labels, but thins out a sans at body size.

Shared components (`InstallAppButton`, `SupportLinks`) set no font at all, so they inherit
whichever surface they're rendered into — serif on the gift page, sans on the dashboard.

### Operator console (`/admin`)
| Piece | File |
|---|---|
| Role check (never email-based) | `lib/server/admin.ts` |
| Stats, gift list, free-rose creation | `app/admin/actions.ts` |
| Console UI | `app/admin/AdminClient.tsx` |
| Role table + single-admin index + stats query | `app_admins`, `admin_overview()` |

Security: `app_admins` is RLS-locked with **no policy**, so a customer can't discover it
exists. `admin_overview()`, `grant_complimentary_year()`, `record_gift_payment()` and
`revoke_gift_payment()` all have `EXECUTE` revoked from `anon` and `authenticated` — verified
by attempting each as a signed-in user. `/admin` returns **404** rather than 403, so the route
never confirms itself. The dashboard's Operator link is cosmetic; the page guards itself.

Free roses: `grant_complimentary_year(slug, note)` writes a **€0 ledger row** so comped gifts
stay auditable and never inflate revenue. Reuses `record_gift_payment`, keeping entitlement
maths in one place.

Engagement: each gift row shows **streak, total visits and when it was last tended**. A gift
that is *live but never tended* is the signal worth watching — it means the link was bought
but never really landed. `listGiftsAction` embeds `rose_state` through its foreign key, so
this stays one query rather than N+1.

To move masteradmin to another account, delete the row first — the unique index enforces one.

### Packages (plans)
`lib/payments/plans.ts` is the catalogue: one entry per tier, each naming its own
`STRIPE_PRICE_ID*` env var and carrying **feature flags**, so gating reads
`planOf(tenant.plan).features.moments` rather than scattering `plan === "premium"` string
comparisons. `plan` is stored on the gift *and* the payment: a gift may be upgraded later, but
revenue-by-package must reflect what was actually bought at the time.

### CAPTCHA
Cloudflare Turnstile on all three auth calls (`components/auth/Turnstile.tsx`). Verification
happens in **Supabase** — no `siteverify` endpoint of our own. Notes:
- Tokens are **single use**; the widget is reset after every attempt or a failed login can
  never be retried.
- Inert until `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is set, so a missing key can't lock anyone out.
- CSP allows `challenges.cloudflare.com` in `script-src` and `frame-src`.
- **Order matters when enabling:** set the site key and confirm sign-in works *before*
  switching CAPTCHA on in Supabase → Project Settings → Authentication → Bot and Abuse
  Protection. Reversing it locks out every account until the toggle is switched back off.
- The widget's domain list must include `localhost` or local sign-in fails.

### Voice messages
A moment can carry a recorded voice note. `app/dashboard/VoiceRecorder.tsx` records via
MediaRecorder, with a file picker for browsers without it.

| Piece | File |
|---|---|
| Recorder + file fallback | `app/dashboard/VoiceRecorder.tsx` |
| Upload action | `uploadVoiceAction` in `app/dashboard/actions.ts` |
| Path validation | `cleanStoragePath` in `lib/security/validate.ts` |
| Signing on delivery | `withSignedAudio` in `lib/server/tenantQueries.ts` |
| Playback | `components/ui/MomentPanel.tsx` |
| Column | `scheduled_moments.audio_url` |

⚠️ **`audio_url` is a storage PATH, not a URL** — unlike `photo_url`/`video_url` beside it,
which hold external links the owner pastes in. A voice note is recorded in the app, so it
lives in the private `tenant-media` bucket and is signed at render time. That means a lapsed
or refunded gift stops serving it along with everything else, with no separate check.

Things that took a specific decision:
- **Format is whatever the browser produces** — Chrome/Firefox `audio/webm` (opus), Safari
  `audio/mp4`. Both are accepted; forcing one silently breaks recording on half of all
  phones. The mime check compares the *base* type because MediaRecorder reports
  `audio/webm;codecs=opus`.
- **Uploads when recording stops**, not when the moment is saved, so a failed upload surfaces
  next to the microphone rather than on submit.
- **The mic is released on unmount**, or the browser keeps showing its recording indicator.
- `cleanStoragePath` is the first user-supplied *path* in the codebase (everything else is a
  URL or a UUID), so it rejects traversal, absolute paths, backslashes and anything outside
  the caller's own tenant folder. Tested against all of those.

### Saving a moment
Every revealed moment offers a Save control — photo, video, voice, or the words as `.txt`
when there is no media (`components/ui/SaveMoment.tsx`).

Deliberately **not** `<a download>`: that attribute is ignored for cross-origin responses, and
the media sits on Supabase's storage domain behind a signed URL. The browser would navigate
to the file instead of saving it — on a phone, that means leaving the gift. So the bytes are
fetched and handed back as a same-origin `blob:` URL, which always saves.

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

*Last updated: 4 August 2026 — payments, entitlement gating, refund revocation, private
media, the operator console, passwordless sign-in and voice messages, all on the
`multi-tenant` branch. See "What's new" at the top.*
