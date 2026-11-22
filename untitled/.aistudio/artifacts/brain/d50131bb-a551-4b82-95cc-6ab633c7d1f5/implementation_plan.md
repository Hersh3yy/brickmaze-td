# BrickMaze TD — Tactile Pixel-Art Mazing Tower Defense

A Gem-TD-inspired mazing tower defense game where every turn you draft and place four random colored plastic bricks to sculpt a winding multi-checkpoint labyrinth, empower one brick per turn, mount and freely relocate miniature pixel-art turrets between waves, and unlock explosive color-combination synergies across 30-minute matches.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> All four core gameplay and technical choices from discovery are locked into this blueprint:
> - **Confirmed Decision 1 (RNG Mazing Loop)**: Each build turn deals **4 random colored bricks** placed individually onto the grid. After placing all 4, you choose **1 brick to keep as an Active Colored Brick** (or fuse matching turn bricks into a stronger Dual-Color Master Brick), while the other **3 solidify into neutral Gray Maze Bricks** that extend the path.
> - **Confirmed Decision 2 (Towers, Colors & Relocation)**: Towers are purchased with wave Gold and snapped onto placed bricks. Brick colors grant direct stat boosts and form **adjacent Color Synergy Circuits**; **between waves**, any tower can be picked up and moved to another brick for free (relocation is locked during active waves).
> - **Confirmed Decision 3 (Sprite Aesthetics)**: Tactile pixel-art plastic bricks with raised studs, bevel shading, miniature rotating turrets, projectile trails, and animated pixel creeps rendered on a crisp pixel-locked canvas.
> - **Confirmed Decision 4 (Zero-Signup Cloud Profile)**: Cloud profiles backed by Firestore using **random high-entropy Sync Codes** (e.g., `BRICK-7K9P-4M2X-8Q5R`) stored locally and portable across any browser/device with zero account creation, email, or password.

---

## 1. Overview & Core Concept

- **What It Does**: Combines long-form mazing strategy (inspired by Gem TD's multi-waypoint pathing and RNG build turns) with active tower repositioning and color-combo crafting. Players funnel waves through numbered checkpoints (`Start -> 1 -> 2 -> 3 -> Exit`), balancing maze length, brick color placement, and tower relocation as the battlefront shifts.
- **Target Audience / Persona**: Strategy and classic custom-map TD fans looking for deep ~30-minute browser sessions with high replayability, tactile toybox charm, and instant cross-device progress tracking without registration friction.
- **Key Value**: Solves static-tower regret—as your maze grows and better color clusters emerge in later turns, moving existing high-investment towers between waves turns positioning into an evolving puzzle rather than a one-time guess.

---

## 2. User Experience & Visual Design

### Key User Flows

```
┌──────────────────┐     ┌─────────────────────────────────────────────┐
│  Title & Profile │────▶│          Build Phase (Between Waves)        │
│  - Sync Code     │     │  1. Place 4 RNG Colored Bricks (BFS check)  │
│  - Map Select    │     │  2. Pick 1 Active Brick (or Fuse Recipe)    │
│  - Board Theme   │     │  3. Buy / Upgrade / Relocate Towers freely  │
└──────────────────┘     └──────────────────────┬──────────────────────┘
                                                │ [Send Wave]
                                                ▼
┌──────────────────┐     ┌─────────────────────────────────────────────┐
│ Victory / Report │◀────│          Combat Phase (Active Wave)         │
│  - Match Stats   │     │  - Creeps traverse Start -> CP1..3 -> Exit  │
│  - XP & Unlocks  │     │  - Synergies & Turrets fire at 1x / 2x / 3x │
│  - Endless Opt.  │     │  - Tower movement locked; Brick draft paused│
└──────────────────┘     └─────────────────────────────────────────────┘
```

1. **Title & Cloud Profile Entry**: Immediately displays the game title artwork, quick-start **Play Match** button, Map Layout selector (Classic Crossroad, Twin Choke, Spiral Vault), and a compact Cloud Sync Code panel showing the auto-assigned profile code (with one-click Copy and Switch/Load Sync Code input).
2. **Build Phase (Brick Drafting + Tower Management)**:
   - **Step A — Place 4 Bricks**: Player sees the 4-brick turn queue at the bottom dock. Hovering the grid shows a ghost brick plus a **live dotted path preview** recalculated across all checkpoints. Invalid placements that would completely block any checkpoint path are highlighted in red with a clear warning label and blocked from placement.
   - **Step B — Choose 1 to Keep (or Combine)**: Once all 4 bricks are placed, the 4 turn bricks pulse on the board. Selecting one promotes it to an **Active Colored Brick** (glowing stud socket), while the other 3 convert to **Gray Maze Walls**. If the 4 placed bricks contain a valid **Turn Recipe** (e.g., 2 matching colors or a specific pair), a highlighted **Combine** action lets the player fuse them into a **Tier-2 Dual-Color Master Brick**.
   - **Step C — Buy, Upgrade & Relocate Towers**: With remaining build time or before clicking **Send Wave**, players buy turrets onto any brick, upgrade turrets, or click **Move Tower** to pick up any placed turret and snap it onto a better Active Colored Brick elsewhere in the maze.
3. **Combat Phase (30 Waves, ~30 Min Total)**:
   - Creeps spawn with wave traits (Swarm, Armored, Swift, Regenerating, Boss every 5th wave) and follow the exact BFS shortest path through Checkpoints 1, 2, and 3 to Exit.
   - Players can toggle `1x / 2x / 3x` simulation speed, inspect creep/tower DPS stats, and view active Color Synergy lines glowing between adjacent colored bricks.
   - Clearing Wave 30 triggers the Victory & XP Summary modal (with an **Continue Endless** option); losing all 20 Lives triggers Game Over with full run breakdown and instant **Play Again**.
4. **Account Progression (Cosmetic & Light QoL)**:
   - Completing waves and matches awards **Architect XP** synced to the user's cloud profile.
   - Leveling up unlocks **Board Themes** (Toybox Slate, Midnight Workshop, Retro Handheld, Volcanic), **Turret Trim Skins**, **Alternate Map Layouts**, and **capped non-breaking QoL perks** (e.g., +1 Brick Reroll per match at Rank 3, +10 starting Gold at Rank 6) so skill and mazing decisions remain 95%+ of match power.

### Visual Identity & Theme

- **Aesthetic Direction**: Tactile pixel-art tabletop workshop—crisp pixelated plastic studs, beveled toy-brick edges, subtle grid baseplate dimples, and clean high-contrast miniature turrets.
- **Color Palette (60-30-10 Budget)**:
  - *60% Dominant Arena Canvas*: Deep workshop slate baseplate (`#161B22`) with subtle dimpled grid cells (`#1E2631`).
  - *30% Structural UI Surfaces*: Matte charcoal panels (`#222B38`) with crisp 1px structural borders (`#324054`) and off-white readable text (`#F1F5F9`).
  - *10% Focal Actions & Brick Signals*: Tactile brick hues strictly reserved for game pieces and primary CTAs—Crimson (`#EF4444`), Cobalt (`#3B82F6`), Amber (`#F59E0B`), Emerald (`#10B981`), Violet (`#A855F7`), and primary action Amber/Emerald highlights. Every color signal on bricks and waves is paired with distinct pixel icons/glyphs and text tooltips so no state relies on hue alone.
- **Typography & Hierarchy**:
  - *Display / Headings*: `Outfit` (bold, clean geometric presence for game title, wave banners, and modals).
  - *Body & Controls*: `Plus Jakarta Sans` (clear, readable single-line labels for shop buttons, synergy tooltips, and profile actions).
  - *Metrics & HUD Counters*: `JetBrains Mono` with `tabular-nums` for Gold, Lives, Wave (`14/30`), Path Length (`48 tiles`), DPS, and Sync Codes.
- **Interactive Feedback & Audio**:
  - Synthesized Web Audio API chiptune/plastic-snap sound effects (satisfying brick snap click, fusion chime, turret fire pops, wave horn, mute toggle).
  - Micro-animations under 200ms (`transform`, `opacity` only) for brick placement bounce, tower pickup float, and synergy link activation.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: 4-Brick Draft + 1-Keep Rule (Gem-TD Inspired)**
  - *Chosen Approach*: Each turn requires placing 4 random colored bricks before keeping 1 (or fusing a pair) and turning the rest into gray walls.
  - *Why*: Recreates the signature tension of Gem TD—forcing players to extend their maze with suboptimal walls while gambling on where their kept colored pedestal or fusion lands—while trimming 5 drops to 4 keeps total match duration right around 30 minutes.
  - *Alternatives Considered*: Picking 1 of 3 cards from a menu without placing the others (too little maze growth per turn, loses the signature Gem-TD spatial puzzle).

- **Decision 2: Free Tower Relocation Between Waves (Locked Mid-Wave)**
  - *Chosen Approach*: Towers are separate entities mounted onto bricks; players can freely move any tower to another valid brick during Build Phases, while relocation is disabled during Combat Phases.
  - *Why*: Rewards long-term maze evolution—players never feel punished for building early towers near the entrance when later turns open a stronger multi-pass kill-box or Tri-Color Prism synergy across the map.
  - *Alternatives Considered*: Paid relocation or permanent placement (discourages experimentation and conflicts with the core user design).

- **Decision 3: Procedural Pixel-Art Sprite Canvas + Bespoke Title Emblem**
  - *Chosen Approach*: Render the 18×14 (or 20×14) board, studs, rotating turret sprites, projectiles, synergy energy beams, and multi-frame creeps using pixel-locked (`imageSmoothingEnabled = false`) offscreen pixel-art sprite matrices on HTML5 `<canvas>`, paired with a custom generated pixel-art game emblem on the Title/Menu view.
  - *Why*: Guarantees 60 FPS performance with hundreds of projectiles and pixel particles, razor-sharp 1px highlights on every Lego stud, and real-time turret barrel rotation toward targets without DOM bloat.
  - *Alternatives Considered*: Pure CSS/DOM grid tiles (stutters during multi-target projectile waves and cannot smoothly rotate pixel turret barrels).

- **Decision 4: Zero-Signup Cloud Profiles via Random Sync Codes (Firestore)**
  - *Chosen Approach*: Auto-generate a high-entropy random Sync Code (`BRICK-XXXX-XXXX-XXXX`, 80+ bits of randomness) stored in `localStorage` and mirrored to a Firestore document keyed by that Sync Code, with `allow list: if false` to prevent profile enumeration, plus strict schema & size rules.
  - *Why*: Meets the exact user request for cross-device cloud profiles with zero account creation or login screens, while protecting against scraping or malformed writes.
  - *Alternatives Considered*: Local-only `localStorage` (cannot transfer to another device); mandatory Google Sign-In (adds login friction the user explicitly asked to avoid).

---

## 4. Technical Architecture & Data Strategy

### System & Component Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                             Application Root                            │
│  - Cloud Profile Provider (Sync Code load/save, XP/Rank, Unlocks)       │
│  - Web Audio Synthesizer (Brick Snap, Fusion, Turret FX, Mute Toggle)   │
└───────────────┬─────────────────────────────────────────┬───────────────┘
                │                                         │
                ▼                                         ▼
┌───────────────────────────────┐         ┌───────────────────────────────┐
│     Title & Profile Overlay   │         │       Active Match Screen     │
│  - Pixel-Art Game Emblem      │         │  - Top HUD (Wave/Gold/Lives)  │
│  - Map & Theme Selectors      │         │  - Pixel Canvas Board View    │
│  - Sync Code Copy / Switch    │         │  - Right Inspector (Tower/    │
└───────────────────────────────┘         │    Brick/Synergy Details)     │
                                          │  - Bottom Build & Tower Dock  │
                                          └───────────────┬───────────────┘
                                                          │
                       ┌──────────────────────────────────┴────────────────────┐
                       ▼                                                       ▼
┌─────────────────────────────────────────────┐     ┌──────────────────────────┐
│           Simulation & Rules Engine         │     │   Cloud Sync (Firestore) │
│  - Multi-Checkpoint BFS Path Validator      │     │  - profiles/{syncCode}   │
│  - 4-Brick RNG Drafter & Turn Fusion Solver │     │  - Strict Schema Rules   │
│  - Adjacency Color Synergy Graph Calculator │     │  - Debounced Auto-Sync   │
│  - Wave Spawner, Targeting & Projectile Sim │     │  - LocalStorage Fallback │
└─────────────────────────────────────────────┘     └──────────────────────────┘
```

### Data Model & State Entities

- **CloudProfile** (persisted in Firestore at `profiles/{syncCode}` and cached locally):
  - `syncCode`: Unique random identifier (`BRICK-XXXX-XXXX-XXXX`).
  - `displayName`: Editable workshop nickname (default e.g. `Builder #482`).
  - `xp` & `level`: Total Architect XP and derived Rank (1–50+).
  - `stats`: `gamesPlayed`, `gamesWon`, `highestWave`, `longestMazePath`, `synergiesTriggered`.
  - `unlockedThemes` & `selectedTheme`: Cosmetic board palettes unlocked by rank.
  - `createdAt` & `updatedAt`: Server-validated Firestore timestamps.
- **GridCell / Brick**:
  - Coordinates `(x, y)`, terrain type (`OPEN`, `CHECKPOINT`, `START`, `EXIT`, `GRAY_WALL`, `ACTIVE_BRICK`, `MASTER_BRICK`).
  - `color`: `red | blue | yellow | green | purple` (or dual-color pair for Master Bricks).
  - `synergyIds`: Computed list of active adjacency bonuses affecting this tile.
- **Tower**:
  - `id`, `type` (`blaster`, `frost`, `arc`, `mortar`, `prism`, `venom`), `level` (1–3), `brickCoord` (`x, y`), `targetingMode` (`first | strongest | closest`), `angle`, `cooldown`, `totalDamage`.
- **MatchState**:
  - `phase`: `'BUILD_PLACE' | 'BUILD_PICK' | 'BUILD_MANAGE' | 'COMBAT' | 'VICTORY' | 'GAME_OVER'`.
  - `wave`: `1..30+`, `lives`: `20`, `gold`, `rerollsRemaining`, `draftQueue` (4 RNG bricks), `placedTurnCoords`, `pathNodes` (ordered BFS route through checkpoints), `creeps`, `projectiles`, `floatingTexts`.

### Interactive Component & State Mapping

- **Canvas Board Click / Hover**:
  - During `BUILD_PLACE`: Hover runs live BFS path validation and previews the next brick + route length delta; click places the brick into `placedTurnCoords` (blocked with feedback if path breaks).
  - During `BUILD_PICK`: Clicking any of the 4 glowing turn bricks keeps it as an `ACTIVE_BRICK` and turns the other 3 into `GRAY_WALL`; clicking **Fuse Pair** executes an available turn combination into a `MASTER_BRICK`.
  - During `BUILD_MANAGE`: Clicking an empty brick with a selected shop tower buys & snaps the tower onto it; clicking **Move** on an existing tower enters relocation targeting mode, letting the player click any unoccupied brick (Active, Master, or Gray) to relocate it instantly with recalculated synergy stats.
  - During `COMBAT`: Clicking a tower inspects live DPS/synergy stats and allows switching targeting priority (`First / Strongest / Closest`); relocation and brick placement buttons lock cleanly with a `"Locked During Wave"` label.
- **Cloud Profile Modal / Drawer**:
  - **Copy Code** writes `syncCode` to clipboard with instant confirmation.
  - **Load Profile Code** validates format, fetches `profiles/{code}` from Firestore via `getDoc`, handles `"Code not found"` / offline errors gracefully, and hot-swaps the active profile state.
