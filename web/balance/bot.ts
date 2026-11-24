// A headless bot that plays full BrickMaze matches with the real rules and the real
// combat simulation, so balance changes can be measured instead of guessed.
//
// It mirrors the player flow in composables/useArenaMatch.ts: each wave it drafts
// 4 bricks into the maze, keeps or fuses one, spends its gold on towers and
// upgrades, then fights the wave with stepSimulation. The decisions are simple
// greedy rules, so treat its results as "a competent, not brilliant, player".

import {
  BASE_STARTING_GOLD,
  BRICKS_PER_TURN,
  BRICK_COLOR_LIST,
  DIFFICULTY_DEFS,
  ELITE_LEVEL,
  MAX_TOWER_LEVEL,
  MAX_WAVES,
  TOWER_DEFS,
} from '../app/game/domain/constants';
import { computeMazePath, createInitialGrid, isBrickCell } from '../app/game/domain/pathfinding';
import {
  beginWave,
  cachedTileModifiers,
  canBecomeElite,
  createSimState,
  defaultTargetingFor,
  flightPathFor,
  stepSimulation,
} from '../app/game/domain/simulation';
import type { SimWorld } from '../app/game/domain/simulation';
import { matchColorPairSynergy } from '../app/game/domain/synergy';
import type {
  BrickColor,
  Coord,
  DifficultyId,
  GridCell,
  MapLayoutId,
  Tower,
  TowerLevel,
  TowerType,
} from '../app/game/domain/types';

export interface Strategy {
  name: string;
  /** Which weapon to buy next, given how many towers exist already. */
  nextTower(towerCount: number): TowerType;
  /** Spend on upgrades before new towers (true) or the other way round. */
  upgradeFirst: boolean;
}

export const STRATEGIES: Strategy[] = [
  { name: 'repeaters', nextTower: () => 'repeater', upgradeFirst: false },
  {
    name: 'balanced',
    nextTower: (n) => (['repeater', 'cannon', 'sniper', 'pulse', 'harpoon'] as const)[n % 5]!,
    upgradeFirst: false,
  },
  {
    name: 'upgrader',
    nextTower: (n) => (['repeater', 'cannon', 'sniper', 'pulse', 'harpoon'] as const)[n % 5]!,
    upgradeFirst: true,
  },
  {
    name: 'snipers',
    nextTower: (n) => (n % 3 === 2 ? 'cannon' : 'sniper'),
    upgradeFirst: true,
  },
  {
    name: 'aoe',
    nextTower: (n) => (n % 2 === 0 ? 'cannon' : 'pulse'),
    upgradeFirst: false,
  },
];

export interface MatchResult {
  strategy: string;
  difficulty: DifficultyId;
  map: MapLayoutId;
  seed: number;
  /** Last wave fully cleared (30 = won the match). */
  wavesCleared: number;
  won: boolean;
  livesLeft: number;
  towers: number;
  pathLength: number;
}

/** Small seeded PRNG so every run of a seed is identical. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** How many path tiles a weapon of `range` tiles standing on (x, y) can reach. */
/** Tiles under the straight flight lines fliers take between the waypoints. */
function flightTiles(grid: GridCell[][]): Coord[] {
  const pts = flightPathFor(grid);
  const out: Coord[] = [];
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i]!;
    const b = pts[i + 1]!;
    const steps = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y), 1);
    for (let k = 0; k <= steps; k++) {
      out.push({
        x: Math.round(a.x + ((b.x - a.x) * k) / steps),
        y: Math.round(a.y + ((b.y - a.y) * k) / steps),
      });
    }
  }
  return out;
}

/**
 * How useful a weapon of `range` tiles on (x, y) is: the maze path it covers, plus half
 * credit for the flier lines (cannons cannot hit fliers, so they get none).
 */
function towerValue(grid: GridCell[][], path: Coord[], type: TowerType, x: number, y: number, range: number): number {
  const ground = coverage(path, x, y, range);
  const air = type === 'cannon' ? 0 : coverage(flightTiles(grid), x, y, range);
  return ground + air * 0.5;
}

function coverage(path: Coord[], x: number, y: number, range: number): number {
  let n = 0;
  const r2 = range * range;
  for (const p of path) {
    const dx = p.x - x;
    const dy = p.y - y;
    if (dx * dx + dy * dy <= r2) n += 1;
  }
  return n;
}

function hasColouredNeighbour(grid: GridCell[][], x: number, y: number): boolean {
  for (const [dx, dy] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ] as const) {
    const c = grid[y + dy]?.[x + dx];
    if (c && (c.kind === 'ACTIVE_BRICK' || c.kind === 'MASTER_BRICK')) return true;
  }
  return false;
}

/**
 * Draft step: place 4 bricks where they lengthen the path most, then keep/fuse one.
 * Returns a new grid, like the game does, because brick bonuses are cached per grid object.
 */
function draftTurn(prev: GridCell[][], map: MapLayoutId, rng: () => number): GridCell[][] {
  const grid = prev.map((row) => row.slice());
  const hand: BrickColor[] = [];
  for (let i = 0; i < BRICKS_PER_TURN; i++) {
    hand.push(BRICK_COLOR_LIST[Math.floor(rng() * BRICK_COLOR_LIST.length)]!);
  }

  const placed: Coord[] = [];
  for (const color of hand) {
    const current = computeMazePath(grid, map);
    // Blocking a tile can only lengthen the shortest path if the tile is on that path,
    // so those are the only candidates worth testing (about 3x fewer than its neighbours).
    const seen = new Set<string>();
    let best: { c: Coord; len: number; tie: number } | null = null;
    for (const p of current.path) {
      const key = `${p.x},${p.y}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const cell = grid[p.y]?.[p.x];
      if (!cell || cell.kind !== 'OPEN') continue;
      const res = computeMazePath(grid, map, p);
      if (!res.valid) continue;
      // Prefer longer paths; break ties toward existing bricks (combos) then randomly.
      const tie = (hasColouredNeighbour(grid, p.x, p.y) ? 1 : 0) + rng() * 0.5;
      if (!best || res.length > best.len || (res.length === best.len && tie > best.tie)) {
        best = { c: { x: p.x, y: p.y }, len: res.length, tie };
      }
    }
    if (!best) break;
    grid[best.c.y]![best.c.x] = { x: best.c.x, y: best.c.y, kind: 'TURN_DRAFT', color };
    placed.push(best.c);
  }
  if (placed.length === 0) return grid;

  // Keep (as the fused Master brick) the draft brick that covers the most path.
  const path = computeMazePath(grid, map).path;
  let anchor = 0;
  let bestCover = -1;
  placed.forEach((c, i) => {
    const cov = coverage(path, c.x, c.y, 3.5);
    if (cov > bestCover) {
      bestCover = cov;
      anchor = i;
    }
  });
  const anchorColor = grid[placed[anchor]!.y]![placed[anchor]!.x]!.color!;
  // Fusing is always at least as good as keeping one brick; prefer a same-colour double.
  let partnerColor: BrickColor | undefined;
  placed.forEach((c, i) => {
    if (i === anchor) return;
    const col = grid[c.y]![c.x]!.color!;
    if (!matchColorPairSynergy(anchorColor, col)) return;
    if (!partnerColor || col === anchorColor) partnerColor = col;
  });

  placed.forEach((c, i) => {
    if (i === anchor) {
      grid[c.y]![c.x] = partnerColor
        ? { x: c.x, y: c.y, kind: 'MASTER_BRICK', color: anchorColor, secondaryColor: partnerColor }
        : { x: c.x, y: c.y, kind: 'ACTIVE_BRICK', color: anchorColor };
    } else {
      grid[c.y]![c.x] = { x: c.x, y: c.y, kind: 'GRAY_WALL' };
    }
  });
  return grid;
}

/** Spend gold on new towers and upgrades according to the strategy. */
function spend(
  grid: GridCell[][],
  path: Coord[],
  towers: Tower[],
  state: { gold: number; uid: number },
  strategy: Strategy
): void {
  const tryUpgrade = (): boolean => {
    let pick: Tower | null = null;
    let pickScore = -1;
    for (const t of towers) {
      if (t.level >= MAX_TOWER_LEVEL) continue;
      if (t.level === ELITE_LEVEL - 1 && !canBecomeElite(t, towers)) continue;
      const cost = TOWER_DEFS[t.type].upgradeCosts[t.level - 1]!;
      if (cost > state.gold) continue;
      const score = towerValue(grid, path, t.type, t.x, t.y, TOWER_DEFS[t.type].baseRange);
      if (score > pickScore) {
        pick = t;
        pickScore = score;
      }
    }
    if (!pick || pickScore <= 0) return false;
    const cost = TOWER_DEFS[pick.type].upgradeCosts[pick.level - 1]!;
    state.gold -= cost;
    pick.investedGold += cost;
    pick.level = (pick.level + 1) as TowerLevel;
    return true;
  };

  const tryBuy = (): boolean => {
    const type = strategy.nextTower(towers.length);
    const def = TOWER_DEFS[type];
    if (def.cost > state.gold) return false;
    const taken = new Set(towers.map((t) => `${t.x},${t.y}`));
    let best: { x: number; y: number; score: number } | null = null;
    for (const row of grid) {
      for (const cell of row) {
        if (!isBrickCell(cell) || taken.has(`${cell.x},${cell.y}`)) continue;
        const mods = cachedTileModifiers(grid, cell.x, cell.y);
        const cov = towerValue(grid, path, type, cell.x, cell.y, def.baseRange * mods.rangeMult);
        // Coloured bricks load elemental ammo, so they are worth more than gray walls.
        const score = cov * (mods.primaryElement === 'kinetic' ? 1 : 1.4);
        if (!best || score > best.score) best = { x: cell.x, y: cell.y, score };
      }
    }
    if (!best || best.score < 3) return false;
    state.uid += 1;
    towers.push({
      id: `bot_${state.uid}`,
      type,
      level: 1,
      x: best.x,
      y: best.y,
      targeting: defaultTargetingFor(grid, best.x, best.y),
      angle: 0,
      cooldown: 0,
      recoil: 0,
      muzzleFlash: 0,
      totalDamage: 0,
      kills: 0,
      investedGold: def.cost,
    });
    state.gold -= def.cost;
    return true;
  };

  for (let guard = 0; guard < 200; guard++) {
    const did = strategy.upgradeFirst ? tryUpgrade() || tryBuy() : tryBuy() || tryUpgrade();
    if (!did) break;
  }
}

/** Plays one full match and reports how far the bot got. */
export function playMatch(
  strategy: Strategy,
  difficulty: DifficultyId,
  map: MapLayoutId,
  seed: number
): MatchResult {
  const rng = mulberry32(seed);
  let grid = createInitialGrid(map);
  const towers: Tower[] = [];
  const state = { gold: BASE_STARTING_GOLD, uid: 0 };
  let lives = DIFFICULTY_DEFS[difficulty].startingLives;
  let wavesCleared = 0;

  for (let wave = 1; wave <= MAX_WAVES; wave++) {
    grid = draftTurn(grid, map, rng);
    const path = computeMazePath(grid, map).path;
    spend(grid, path, towers, state, strategy);

    const sim = createSimState(path.length);
    beginWave(sim, wave, difficulty);
    const world: SimWorld = {
      grid,
      phase: 'COMBAT',
      wave,
      difficulty,
      endlessMode: false,
      lives,
      gold: state.gold,
      towers,
      path,
      speed: 1,
    };

    let cleared = false;
    let dead = false;
    const dt = 0.05;
    for (let step = 0; step < 20 * 60 * 10 && !cleared && !dead; step++) {
      stepSimulation(sim, world, dt, step * dt * 1000, {
        waveCleared: () => {
          cleared = true;
        },
        defeat: () => {
          dead = true;
          sim.matchEnded = true;
        },
      }, rng);
    }

    state.gold = world.gold;
    lives = world.lives;
    if (!cleared || dead || lives <= 0) break;
    wavesCleared = wave;
  }

  return {
    strategy: strategy.name,
    difficulty,
    map,
    seed,
    wavesCleared,
    won: wavesCleared >= MAX_WAVES,
    livesLeft: lives,
    towers: towers.length,
    pathLength: computeMazePath(grid, map).length,
  };
}
