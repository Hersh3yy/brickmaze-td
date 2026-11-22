# BrickMaze TD — Developer Handover & Roadmap

Welcome to **BrickMaze TD**, a Gem-TD-inspired mazing tower defense game built with **React 19 + TypeScript + Vite + Tailwind CSS v4 + HTML5 Canvas**, structured with **Atomic Design** and a decoupled persistence layer ready for your own backend.

---

## 1. Local Setup & Scripts

### Prerequisites
- Node.js `20+` (or `22+`) and `npm`

### Commands
```bash
npm install          # Install dependencies
npm run dev          # Start local Vite dev server (default port 3000)
npm run lint         # Run strict TypeScript typecheck (tsc --noEmit)
npm run build        # Production static bundle -> dist/
npm run preview      # Preview production build locally
```

### Static Hosting on Coolify (Frontend Only)
Because the current frontend compiles to pure static assets (`dist/`), you can deploy it directly on **Coolify** using:
- **Build Pack**: Static (`nixpacks` / `nginx` / Caddy)
- **Build Command**: `npm ci && npm run build`
- **Publish Directory**: `dist`

---

## 2. Codebase Architecture

The codebase separates **pure game math**, **Canvas rendering**, **persistence**, and **Atomic Design UI**:

```text
src/
├── domain/                       # Pure TypeScript rules (framework-agnostic, easy to unit test)
│   ├── types.ts                  # Core models (GridCell, Tower, Creep, Projectile, Profile, DifficultyId)
│   ├── constants.ts              # Grid size (24x16), Weapons, Elemental Bricks, Difficulty & 30-wave curve
│   ├── pathfinding.ts            # Fast typed-array BFS across Start -> CP1 -> CP2 -> CP3 -> Exit
│   ├── synergy.ts                # Elemental ammo math, Double Element (x2), & neighbor cluster resonance
│   └── audio.ts                  # Procedural Web Audio synthesizer (no external mp3/wav dependencies)
│
├── engine/                       # Dedicated 60fps pixel-art rendering layer (swap here for PNGs or PixiJS)
│   ├── spriteAtlas.ts            # Pre-baked 16x16 offscreen pixel sprites (turrets, 2-frame creeps, ammo)
│   └── pixelRenderer.ts          # Nearest-neighbor Canvas renderer + zoom/pan camera transform
│
├── services/                     # Persistence boundary (ready for Rust/Laravel API swap)
│   └── profileRepository.ts      # ProfileRepository interface + LocalStorage + BM1 Transfer Code codec
│
└── components/                   # Strict Atomic Design hierarchy
    ├── atoms/                    # TactileButton, BrickColorGlyph, PhaseStatusLabel, TabularMetricValue, ProgressTrackBar
    ├── molecules/                # DraftBrickSlot, TurretShopCard, SynergyLinkRow, TargetPrioritySwitch, SpeedAudioControlGroup, TransferCodeField
    ├── organisms/                # MatchHudBar, MazeCanvasStage, ContextInspectorRail, BuildControlDock, ProfileTransferModal, MatchOutcomeModal
    ├── templates/                # LobbyShellTemplate, TacticalArenaTemplate (desktop rail + mobile bottom sheet)
    └── pages/                    # TitleLobbyPage, ArenaMatchPage (simulation loop & match state controller)
```

---

## 3. Core Gameplay Mechanics (Current State)

### Weapons (Towers) × Projectile Ammo (Bricks)
Every tower defines **how** it fires; the brick beneath it defines **what ammo** it fires:

| Weapon Tower | Firing Pattern | Best Used For |
| --- | --- | --- |
| **Repeater** (45g) | High-speed twin bolts | Rapidly proccing Lightning chains or Venom stacks |
| **Cannon** (65g) | Lobbed arcing shell with natural AoE | Tight maze bends and Micro Swarms |
| **Pulse** (75g) | 360° shockwave ring | Central spiral hubs; applies Venom/Fire to entire packs |
| **Rail Sniper** (85g) | Extreme-range armor-piercing beam | Iron Beetles and Bosses (every 5th wave) |

| Brick Color | Loaded Ammo | Single Brick Effect | Double Brick (`×2` Fused) Effect |
| --- | --- | --- | --- |
| **Yellow** | Lightning | `+30%` Attack Speed + `2` chain jumps | `+65%+` Speed + `4` chain jumps + crit |
| **Red** | Fire | `+35%` Damage + `+46px` Fire Splash + Burn | `+85%+` Damage + huge splash + heavy Burn |
| **Green** | Venom | `35%` Slow (`2.8s`) + `44%` armor-ignoring DoT | `56%` Slow (`4.0s`) + `95%+` armor-ignoring DoT |
| **Gray** | Kinetic | Standard physical ammo (free to replant during draft, deletable anytime — including mid-wave — for `10g`) | — |

### Adjacency & Cluster Mechanics (Live Now)
- **Cross-Color Neighbors (Hybrid Conduits)**:
  - **Plasma** (`Red + Yellow`): Fire Splash + Lightning Chain + Speed.
  - **Wildfire** (`Red + Green`): Expanded Fire Splash + Armor Shred + Burn/Venom.
  - **Static Venom** (`Yellow + Green`): Lightning Chains spread Venom Slow & DoT to every jumped target.
- **Same-Color Neighbors (Cluster Resonance)**:
  - Adjacent matching bricks trigger **Overcharge** and scale further when **2+ matching bricks** touch the same tile (`+10%` damage and `+25%` elemental power per extra neighbor).
- **Mid-Wave Gray Wall Deletion**:
  - Clicking an empty Gray Wall during `COMBAT` (or pressing `Delete`/`Backspace` while selected) removes it for `10g`. Each active creep carries its own snapshotted `path: Coord[]`, so existing creeps never clip walls or teleport, while newly spawning creeps immediately use the opened path.
- **Difficulty Presets & Boss Telegraphing**:
  - Choose **Standard** (`1.0× HP`, 20 lives), **Hard** (`1.32× HP`, `+5%` armor, 15 lives, `1.35× XP`), or **Brutal** (`1.68× HP`, `+10%` armor, 10 lives, `1.75× XP`) in the Lobby.
  - Waves `5, 10, 15, 20, 25, 30` telegraph upcoming **Bosses** in the HUD, top arena alert bar, and inspector rail (plus a Wave `N-1` heads-up).

---

## 4. Fusion & Adjacency Design Ideas (Next Mechanics)

Since you want to deepen brick fusion and neighbor interactions, here is a clean progression path that fits directly into `src/domain/synergy.ts`:

1. **Spatial Cluster Shapes (Pattern Bonuses)**
   - **2×2 Core ("Brick Reactor")**: Forming a 2×2 square of active bricks grants all 4 tiles `+15%` range and unlocks a shared visual power core.
   - **3-in-a-Row ("Power Line")**: 3 same-color bricks in a straight horizontal/vertical line boosts projectile speed & crit along the entire line.
   - **Tri-Element Corner**: A brick touching all 3 colors (`Yellow`, `Red`, `Green`) unlocks a **Prismatic Overload** passive.
2. **Gray Wall "Conduit Relays"**
   - Normally Gray Walls are neutral obstacles. A cool strategic twist: if a Gray Wall sits directly between two identical colored bricks (`Red — Gray — Red`), it turns into a **Conductive Bridge** at 50% elemental strength—rewarding thoughtful maze geometry instead of just dumping towers on colored tiles.
3. **Multi-Turn Tier 2 & Tier 3 Fusions**
   - Right now fusion happens among the 4 bricks drafted in a single turn.
   - Next step: Allow fusing **adjacent already-placed Active Bricks** between waves (costing gold or a Fusion Charge earned every 5 waves), turning two `×2` bricks into a **`×3 Apex Brick`** or combining `Plasma + Venom` into an Apex Hybrid.
4. **Elemental Tradeoffs & Boss Modifiers**
   - Give late-game Bosses rotating traits (e.g., *Insulated* = resists chain jumps, *Plated* = weak to Venom DoT & Sniper pierce, *Regenerator* = weak to Fire burn) so players actually use the **free tower relocation** mechanic between waves to counter each boss!

---

## 5. Graphics, Sprites & Smoothness Upgrade Roadmap

Right now the game runs at a silky **60fps** on HTML5 2D Canvas using procedural 16×16 pixel matrices pre-baked into offscreen canvases (`src/engine/spriteAtlas.ts`). Because rendering is isolated from React state via `frameRef`, you have a very clean upgrade path:

### Phase 1: Drop-In Real Pixel-Art Spritesheets (Fastest Visual Jump)
Swap the procedural matrices in `src/engine/spriteAtlas.ts` for real PNG spritesheets (24×24 or 32×32 tiles):
- **Recommended CC0 / Free Packs**:
  - **Kenney Tower Defense (Top-Down)** & **Tiny Dungeon / Tiny Battle** (`kenney.nl`, CC0 license)
  - **0x72 DungeonTileset II** (`0x72.itch.io`, crisp animated 16×16 monsters & knights)
  - **Pixel Frog** packs (clean shading + squash-and-stretch idle/walk animations)
  - **Animal Turrets Idea**: Replace mechanical turrets with elemental creatures (e.g. *Salamander* for Fire, *Electric Eel / Firefly* for Lightning, *Dart Frog / Viper* for Venom, *Owl* for Sniper) — keep the same `TowerType` keys and swap the spritesheet lookup!
- **Implementation tip**: Preload `HTMLImageElement` sheets once on boot, slice sprites via `ctx.drawImage(sheet, sx, sy, sw, sh, dx, dy, dw, dh)` with `ctx.imageSmoothingEnabled = false`.

### Phase 2: Visual Juice & Readability (Zero Performance Cost)
- **Brick Elevation & Ambient Occlusion**: Add soft drop shadows on open tiles south/east of brick walls so the maze immediately pops with tabletop 3D depth.
- **Creep Hit Flash & Directional Facing**: Flip creep sprites horizontally (`ctx.scale(-1, 1)`) based on movement `dx`, and flash white for `60ms` on hit.
- **Persistent Scars / Decals**: Keep a lightweight ring buffer (max 60 decals) of scorch marks from Red Fire explosions and acid puddles from Green Venom kills that fade out over 4 seconds.
- **Multi-Frame Turret Animations**: 3-frame recoil/charge cycle + glowing elemental rune rings on `×2` Double Bricks and 2×2 Cluster Reactors.

### Phase 3: Scaling to PixiJS v8 (WebGL / WebGPU)
If you later add hundreds of creeps, dynamic additive lighting, bloom shaders, and dense particle storms (e.g., Endless Wave 60+):
- Replace `src/engine/pixelRenderer.ts` with a **PixiJS v8** renderer mounted to the same `<canvas>` container in `MazeCanvasStage.tsx`.
- Use **`ParticleContainer`** for sparks/projectiles, **`BitmapText`** for damage popups, and **object pooling** for projectiles/particles so GC pauses stay at 0ms.
- `src/domain/*` and all React Atomic Design UI components require **zero changes**.

---

## 6. Lightweight Backend Ideas for Your VPS + Coolify

You mentioned having a **VPS running Coolify**, and asked about **Lumen** vs **learning Rust**. Here is an honest engineering breakdown:

### About Lumen
- **Skip Lumen**: Laravel officially sunset Lumen years ago (it no longer receives new features and is not recommended for new projects).
- If you want PHP, use **slim Laravel 11/12** (the modern skeleton is already minimal and API-friendly, especially with **FrankenPHP** + SQLite in Coolify) or **Slim Framework 4**.

### Why Rust (`Axum` + `SQLx` + `SQLite`) Is a Great Pick Here
If you want a **tiny VPS footprint** AND want to **learn Rust**, a game profile + leaderboard + telemetry API is literally the *best* real-world starter project in Rust:
- **RAM usage**: ~10–25 MB idle in production (vs. 150–300 MB for PHP-FPM/Laravel or Node containers).
- **Single binary in Docker**: Multi-stage build produces a ~12–18 MB Alpine/Debian-slim image that boots in milliseconds on Coolify.
- **Zero database server overhead**: Start with **SQLite in WAL mode** on a Coolify persistent volume (handles thousands of req/sec easily). Migrate `sqlx` to Postgres later by changing 1 connection string if you ever outgrow SQLite.

### Stack Comparison for Coolify VPS

| Option | Idle RAM | Learning Value | Best For |
| --- | --- | --- | --- |
| **Rust (`Axum` + `SQLx` + SQLite)** | ~15 MB | Very High (types, async, ownership) | Learning Rust, ultra-lean VPS, blazing fast API |
| **Laravel 11/12 API + FrankenPHP** | ~120–200 MB | Familiar PHP productivity | Fastest CRUD/admin dashboards if you already know Laravel |
| **Go (`Chi` + `sqlc` + SQLite)** | ~20 MB | Medium (simple concurrency) | Fast single-binary backend with shorter learning curve than Rust |
| **TypeScript (`Hono` + Bun/Node)** | ~45–80 MB | Low (reuses frontend TS types!) | Sharing `src/domain/types.ts` directly between client & server |

### Recommended API Contract (Matches `src/services/profileRepository.ts`)
To swap `LocalProfileRepository` for `ApiProfileRepository`, implement just **4 endpoints**:

```http
GET  /api/health
GET  /api/profiles/:profileId        # Fetch cloud profile by BRICK-XXXX-XXXX code
PUT  /api/profiles/:profileId        # Upsert profile XP, level, unlocked themes, stats
POST /api/runs                       # Record completed run + telemetry events (waves, builds, leaks)
GET  /api/leaderboard?map=crossroad&difficulty=hard
```

### Minimal Rust Starter Crates (`Cargo.toml`)
```toml
[dependencies]
axum = "0.8"
tokio = { version = "1", features = ["full"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
sqlx = { version = "0.8", features = ["runtime-tokio", "sqlite", "macros", "migrate"] }
tower-http = { version = "0.6", features = ["cors", "trace"] }
```

### Minimal Coolify Multi-Stage `Dockerfile` (Rust + SQLite)
```dockerfile
FROM rust:1.85-slim AS builder
WORKDIR /app
COPY Cargo.toml Cargo.lock ./
COPY src ./src
RUN cargo build --release

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /app/target/release/brickmaze-api /usr/local/bin/brickmaze-api
ENV PORT=8080
ENV DATABASE_URL="sqlite:///data/brickmaze.db?mode=rwc"
EXPOSE 8080
CMD ["brickmaze-api"]
```
*(In Coolify, mount a Persistent Storage volume at `/data` so your SQLite file survives redeployments!)*

---

## 7. Mobile & Future Backlog

### Mobile Status
- Responsive HUD, `100dvh` viewport lock, touch pinch-to-zoom + 1-finger pan when zoomed, and a slide-up **Mobile Inspector Sheet** are wired in.
- **Next mobile improvements** for local work:
  - Add a landscape-mode lock prompt or compact horizontal HUD variant for phones in landscape orientation.
  - Add a **Tap-to-Preview → Tap-again-to-Place** toggle on touch screens so placing bricks on a 24×16 grid without hover cursors feels even more accurate at 100% zoom.
  - Add a PWA manifest + Service Worker (`vite-plugin-pwa`) for offline play.

### Telemetry & Gameplay Ideas
- **Match Telemetry Logger**: Push compact JSON events (`{ wave, phase, action, tile, gold, lives }`) to a buffer in `ArenaMatchPage.tsx` and POST to `/api/runs` on match end so you can balance wave HP and weapon DPS from real runs.
- **Daily Seeded Challenge**: Replace `Math.random()` in `rollFourBricks()` with a deterministic PRNG (`mulberry32(dateSeed)`) so every player gets the exact same brick draft sequence for a daily leaderboard.
- **Fast-Forward & Pause**: Add a `0x` Pause button next to `1x / 2x / 3x` for planning complex mid-wave gray wall edits.
