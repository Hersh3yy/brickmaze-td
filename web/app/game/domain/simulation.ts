// Headless combat simulation: creeps, towers, projectiles and elemental effects.
//
// This is the tick that used to live inside the React ArenaMatchPage. It is pure
// TypeScript with no DOM, audio or framework access, so the same code drives the
// live game (see composables/useArenaMatch.ts) and can be run in tests to check
// balance without a browser.

import {
  BRICK_COLORS,
  HERO_BOUNTY_MULT,
  HERO_HP_MULT,
  HERO_LIVES_COST,
  MAX_WAVES,
  RALLY_MAX_BONUS,
  RALLY_TOUGHNESS_PER_KILL,
  TILE_SIZE,
  TOWER_DEFS,
  VANGUARD_SPEED_BONUS,
  WARDEN_REGEN_PER_SEC,
  getWaveDefinition,
} from './constants';
import { computeTileModifiers } from './synergy';
import type {
  BeamEffect,
  BrickColor,
  Coord,
  Creep,
  DifficultyId,
  FloatingText,
  GamePhase,
  GridCell,
  ImpactRing,
  Particle,
  Projectile,
  TargetingMode,
  Tower,
} from './types';

export interface SimState {
  creeps: Creep[];
  projectiles: Projectile[];
  beams: BeamEffect[];
  impactRings: ImpactRing[];
  particles: Particle[];
  floatingTexts: FloatingText[];
  spawnQueueLeft: number;
  spawnTimer: number;
  longestPathSeen: number;
  totalKills: number;
  matchEnded: boolean;
  lastShotAudioAt: number;
  /** Creeps spawned so far this wave, and how many the wave has in total (heroes included). */
  waveSpawned: number;
  waveTotal: number;
  /** Rally waves: toughness multiplier built up by kills, applied to creeps still to spawn. */
  rallyMult: number;
}

/** Match values the simulation reads each tick. It writes back `gold` and `lives`. */
export interface SimWorld {
  grid: GridCell[][];
  phase: GamePhase;
  wave: number;
  difficulty: DifficultyId;
  endlessMode: boolean;
  lives: number;
  gold: number;
  towers: Tower[];
  path: Coord[];
  speed: number;
}

export interface SimEvents {
  /** A weapon fired (already rate-limited for audio). */
  shoot?(pitch: number): void;
  lifeLost?(): void;
  /** Lives reached zero. `wavesCleared` counts fully cleared waves. */
  defeat?(wavesCleared: number): void;
  /** Every creep of the wave is gone. `final` = last scripted wave outside endless mode. */
  waveCleared?(wave: number, clearBonus: number, final: boolean): void;
}

export function createSimState(longestPathSeen = 0): SimState {
  return {
    creeps: [],
    projectiles: [],
    beams: [],
    impactRings: [],
    particles: [],
    floatingTexts: [],
    spawnQueueLeft: 0,
    spawnTimer: 0,
    longestPathSeen,
    totalKills: 0,
    matchEnded: false,
    lastShotAudioAt: 0,
    waveSpawned: 0,
    waveTotal: 0,
    rallyMult: 1,
  };
}

/** Clears a sim in place, so anything holding its arrays (the renderer) keeps working. */
export function resetSimState(sim: SimState, longestPathSeen = 0): void {
  sim.creeps.length = 0;
  sim.projectiles.length = 0;
  sim.beams.length = 0;
  sim.impactRings.length = 0;
  sim.particles.length = 0;
  sim.floatingTexts.length = 0;
  sim.spawnQueueLeft = 0;
  sim.spawnTimer = 0;
  sim.longestPathSeen = longestPathSeen;
  sim.totalKills = 0;
  sim.matchEnded = false;
  sim.lastShotAudioAt = 0;
  sim.waveSpawned = 0;
  sim.waveTotal = 0;
  sim.rallyMult = 1;
}

/** Queues the creeps of `world.wave`. Returns how many will spawn. */
export function beginWave(sim: SimState, wave: number, difficulty: DifficultyId): number {
  const waveDef = getWaveDefinition(wave, difficulty);
  const total = waveDef.count + (waveDef.modifier === 'escort' ? 2 : 0);
  sim.spawnQueueLeft = total;
  sim.spawnTimer = 0.2;
  sim.waveSpawned = 0;
  sim.waveTotal = total;
  sim.rallyMult = 1;
  return total;
}

export function elementAccent(el: BrickColor | 'kinetic'): string {
  if (el === 'kinetic') return '#CBD5E1';
  return BRICK_COLORS[el].hex;
}

let uidCounter = 1;
export function nextUid(prefix: string): string {
  uidCounter += 1;
  return `${prefix}_${uidCounter}`;
}

type Point = { x: number; y: number };

// Particles per burst. Kept small: the board is busy and old phones pay for every one.
const HIT_BURST = 3;
const KILL_BURST = 5;
const BOSS_KILL_BURST = 12;

/** Effects that run out within this many seconds count as gone for 'fresh' targeting. */
const DEBUFF_REFRESH_WINDOW = 0.4;

function carriesDebuff(c: Creep, venom: boolean, burn: boolean): boolean {
  if (venom && (c.poisonTimer > DEBUFF_REFRESH_WINDOW || c.slowTimer > DEBUFF_REFRESH_WINDOW)) {
    return true;
  }
  return burn && c.burnTimer > DEBUFF_REFRESH_WINDOW;
}

/** Default targeting for a tower on (x, y): venom-loaded towers spread their debuff. */
export function defaultTargetingFor(grid: GridCell[][], x: number, y: number): TargetingMode {
  const mods = computeTileModifiers(grid, x, y);
  return mods.slowFactor > 0 || mods.poisonDpsRatio > 0 ? 'fresh' : 'first';
}

/** Whether 'fresh' targeting means anything for a tower on (x, y). */
export function tileAppliesDebuff(grid: GridCell[][], x: number, y: number): boolean {
  const mods = computeTileModifiers(grid, x, y);
  return mods.slowFactor > 0 || mods.poisonDpsRatio > 0 || mods.burnDpsRatio > 0;
}

function buildJaggedPoints(from: Point, to: Point, segments: number, rng: () => number): Point[] {
  const pts: Point[] = [from];
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;

  for (let i = 1; i < segments; i++) {
    const t = i / segments;
    const jitter = (rng() - 0.5) * 14;
    pts.push({
      x: from.x + dx * t + nx * jitter,
      y: from.y + dy * t + ny * jitter,
    });
  }
  pts.push(to);
  return pts;
}

/**
 * Advances the match by one frame.
 *
 * @param rawDt seconds since the last frame (the caller clamps it); visual effects
 *              age in real time, combat runs at `rawDt * world.speed`.
 * @param nowMs a monotonic clock in milliseconds, only used to rate-limit shot sounds.
 * @param rng   random source in [0, 1); pass a seeded one for reproducible runs.
 */
export function stepSimulation(
  sim: SimState,
  world: SimWorld,
  rawDt: number,
  nowMs: number,
  events: SimEvents = {},
  rng: () => number = Math.random
): void {
  const dt = rawDt * world.speed;
  const waveDef = getWaveDefinition(world.wave, world.difficulty);

  const spawnBurst = (x: number, y: number, color: string, count = 6, maxSpeed = 85) => {
    for (let i = 0; i < count; i++) {
      const ang = rng() * Math.PI * 2;
      const spd = 24 + rng() * maxSpeed;
      sim.particles.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        size: 3 + Math.floor(rng() * 3),
        color,
        ttl: 0.2 + rng() * 0.25,
        maxTtl: 0.45,
      });
    }
  };

  const spawnRing = (
    x: number,
    y: number,
    maxRadius: number,
    color: string,
    ttl = 0.24,
    fillAlpha = 0
  ) => {
    sim.impactRings.push({ id: nextUid('rg'), x, y, maxRadius, color, fillAlpha, ttl, maxTtl: ttl });
  };

  const addFloatingText = (x: number, y: number, text: string, color: string) => {
    sim.floatingTexts.push({ id: nextUid('ft'), x, y, text, color, ttl: 0.72, maxTtl: 0.72 });
  };

  // Rally waves: every kill makes the rest of the wave tougher, including creeps not yet
  // spawned. The bonus adds up per kill and is capped, so rallyMult runs 1 → 1 + max.
  const onCreepKilled = (dead: Creep) => {
    if (waveDef.modifier !== 'rally') return;
    const next = Math.min(1 + RALLY_MAX_BONUS, sim.rallyMult + RALLY_TOUGHNESS_PER_KILL);
    if (next <= sim.rallyMult) return;
    const mult = next / sim.rallyMult;
    sim.rallyMult = next;
    for (const c of sim.creeps) {
      if (c === dead || c.hp <= 0) continue;
      c.hp *= mult;
      c.maxHp *= mult;
    }
  };

  /**
   * Armor only stops physical damage: direct hits from bolts, shells and the pulse ring.
   * Magic damage (lightning chains, splash on anyone but the main target) ignores it,
   * as does poison and burn, which are applied elsewhere. The Rail Sniper pierces armor.
   */
  const damageCreep = (
    creep: Creep,
    rawDamage: number,
    opts: { isCrit: boolean; ignoreArmor?: boolean; magic?: boolean; sourceTowerId: string }
  ) => {
    if (creep.hp <= 0) return;
    const effectiveArmor =
      opts.ignoreArmor || opts.magic
        ? 0
        : Math.max(0, creep.armor - (creep.shredTimer > 0 ? 0.25 : 0));
    const dealt = Math.max(1, rawDamage * (1 - effectiveArmor));
    creep.hp -= dealt;

    const srcTower = world.towers.find((t) => t.id === opts.sourceTowerId);
    if (srcTower) srcTower.totalDamage += dealt;

    if (opts.isCrit) {
      addFloatingText(creep.x, creep.y - 12, `${Math.round(dealt)}!`, '#FDE047');
    }

    if (creep.hp <= 0) {
      sim.totalKills += 1;
      if (srcTower) srcTower.kills += 1;
      world.gold += creep.bounty;
      addFloatingText(creep.x, creep.y - 8, `+${creep.bounty}g`, '#FBBF24');
      spawnBurst(
        creep.x,
        creep.y,
        creep.trait === 'boss' ? '#F43F5E' : '#F8FAFC',
        creep.trait === 'boss' ? BOSS_KILL_BURST : KILL_BURST
      );
      onCreepKilled(creep);
    }
  };

  // Yellow Lightning chains jumping out from an impact target
  const triggerLightningChain = (
    originCreep: Creep,
    chainCount: number,
    baseDamage: number,
    opts: {
      sourceTowerId: string;
      spreadVenom: boolean;
      slowFactor: number;
      slowDuration: number;
      poisonDps: number;
    }
  ) => {
    if (chainCount <= 0) return;
    const hitIds = new Set<string>([originCreep.id]);
    const jaggedChain: Point[] = [];
    let prevPt: Point = { x: originCreep.x, y: originCreep.y };
    let chainDmg = baseDamage * 0.68;

    for (let jump = 0; jump < chainCount; jump++) {
      let nextTarget: Creep | null = null;
      let minDist = 115;
      for (const cand of sim.creeps) {
        if (cand.hp <= 0 || hitIds.has(cand.id)) continue;
        const d = Math.hypot(cand.x - prevPt.x, cand.y - prevPt.y);
        if (d < minDist) {
          minDist = d;
          nextTarget = cand;
        }
      }
      if (!nextTarget) break;

      hitIds.add(nextTarget.id);
      const seg = buildJaggedPoints(prevPt, { x: nextTarget.x, y: nextTarget.y }, 4, rng);
      if (jaggedChain.length === 0) jaggedChain.push(...seg);
      else jaggedChain.push(...seg.slice(1));
      prevPt = { x: nextTarget.x, y: nextTarget.y };

      if (opts.spreadVenom && opts.slowFactor > 0) {
        nextTarget.slowTimer = Math.max(nextTarget.slowTimer, opts.slowDuration);
        nextTarget.slowFactor = Math.max(nextTarget.slowFactor, opts.slowFactor);
        nextTarget.poisonTimer = Math.max(nextTarget.poisonTimer, 3.2);
        nextTarget.poisonDps = Math.max(nextTarget.poisonDps, opts.poisonDps);
      }

      spawnRing(nextTarget.x, nextTarget.y, 14, opts.spreadVenom ? '#34D399' : '#FDE047', 0.14);
      damageCreep(nextTarget, chainDmg, {
        isCrit: false,
        magic: true,
        sourceTowerId: opts.sourceTowerId,
      });
      chainDmg *= 0.8;
    }

    if (jaggedChain.length >= 2) {
      sim.beams.push({
        id: nextUid('ch'),
        points: jaggedChain,
        color: opts.spreadVenom ? '#10B981' : '#F59E0B',
        coreColor: '#FEF08A',
        ttl: 0.16,
        maxTtl: 0.16,
        width: 2.5,
      });
    }
  };

  // Visual-only state ages in real time, in every phase.
  for (const t of world.towers) {
    if (t.recoil > 0) t.recoil = Math.max(0, t.recoil - rawDt * 7);
    if (t.muzzleFlash > 0) t.muzzleFlash = Math.max(0, t.muzzleFlash - rawDt);
  }

  for (let i = sim.beams.length - 1; i >= 0; i--) {
    const b = sim.beams[i]!;
    b.ttl -= rawDt;
    if (b.ttl <= 0) sim.beams.splice(i, 1);
  }
  for (let i = sim.impactRings.length - 1; i >= 0; i--) {
    const r = sim.impactRings[i]!;
    r.ttl -= rawDt;
    if (r.ttl <= 0) sim.impactRings.splice(i, 1);
  }
  for (let i = sim.particles.length - 1; i >= 0; i--) {
    const p = sim.particles[i]!;
    p.x += p.vx * rawDt;
    p.y += p.vy * rawDt;
    p.ttl -= rawDt;
    if (p.ttl <= 0) sim.particles.splice(i, 1);
  }
  for (let i = sim.floatingTexts.length - 1; i >= 0; i--) {
    const ft = sim.floatingTexts[i]!;
    ft.y -= 26 * rawDt;
    ft.ttl -= rawDt;
    if (ft.ttl <= 0) sim.floatingTexts.splice(i, 1);
  }

  if (world.phase !== 'COMBAT') return;

  // 1. Spawn creeps. Each one keeps its own path snapshot, so deleting a gray wall
  //    mid-wave never makes creeps already walking clip or teleport.
  if (sim.spawnQueueLeft > 0) {
    sim.spawnTimer -= dt;
    const startTile = world.path[0];
    if (sim.spawnTimer <= 0 && startTile) {
      const index = sim.waveSpawned;
      const hero =
        waveDef.modifier === 'escort'
          ? index === 0
            ? ('vanguard' as const)
            : index === sim.waveTotal - 1
              ? ('warden' as const)
              : undefined
          : undefined;
      const hp = waveDef.hp * sim.rallyMult * (hero ? HERO_HP_MULT : 1);
      sim.creeps.push({
        id: nextUid('cr'),
        wave: world.wave,
        trait: waveDef.trait,
        x: startTile.x * TILE_SIZE + TILE_SIZE / 2,
        y: startTile.y * TILE_SIZE + TILE_SIZE / 2,
        path: world.path.slice(),
        pathIndex: 1,
        hp,
        maxHp: hp,
        speed: waveDef.speed,
        armor: waveDef.armor,
        bounty: hero ? waveDef.bounty * HERO_BOUNTY_MULT : waveDef.bounty,
        slowTimer: 0,
        slowFactor: 0,
        poisonTimer: 0,
        poisonDps: 0,
        burnTimer: 0,
        burnDps: 0,
        shredTimer: 0,
        animTime: rng() * 6,
        radius: waveDef.trait === 'boss' ? 13 : hero ? 11 : 8,
        hero,
      });
      sim.waveSpawned += 1;
      sim.spawnQueueLeft -= 1;
      sim.spawnTimer = waveDef.spawnInterval;
    }
  }

  // 2. Move creeps and tick Venom DoT / Fire burn / regeneration
  let vanguardAlive = false;
  let wardenAlive = false;
  for (const c of sim.creeps) {
    if (c.hp <= 0) continue;
    if (c.hero === 'vanguard') vanguardAlive = true;
    else if (c.hero === 'warden') wardenAlive = true;
  }

  let livesLostThisFrame = 0;
  for (let i = sim.creeps.length - 1; i >= 0; i--) {
    const c = sim.creeps[i]!;
    if (c.hp <= 0) {
      sim.creeps.splice(i, 1);
      continue;
    }

    c.animTime += dt;

    if (c.trait === 'regen' && c.hp < c.maxHp) {
      c.hp = Math.min(c.maxHp, c.hp + c.maxHp * 0.055 * dt);
    }

    // Escort aura: the warden heals the rest of its wave while it lives.
    if (wardenAlive && !c.hero && c.hp < c.maxHp) {
      c.hp = Math.min(c.maxHp, c.hp + c.maxHp * WARDEN_REGEN_PER_SEC * dt);
    }

    if (c.slowTimer > 0) {
      c.slowTimer -= dt;
      if (c.slowTimer <= 0) c.slowFactor = 0;
    }
    if (c.shredTimer > 0) c.shredTimer -= dt;

    // Green Venom DoT ignores armor
    if (c.poisonTimer > 0) {
      c.poisonTimer -= dt;
      c.hp -= c.poisonDps * dt;
    }
    // Red Fire burn
    if (c.burnTimer > 0) {
      c.burnTimer -= dt;
      c.hp -= c.burnDps * dt;
    }

    if (c.hp <= 0) {
      sim.totalKills += 1;
      world.gold += c.bounty;
      addFloatingText(c.x, c.y - 8, `+${c.bounty}g`, c.poisonTimer > 0 ? '#4ADE80' : '#FB923C');
      spawnBurst(c.x, c.y, c.poisonTimer > 0 ? '#10B981' : '#EF4444', KILL_BURST);
      onCreepKilled(c);
      sim.creeps.splice(i, 1);
      continue;
    }

    // Escort aura: while the vanguard lives the whole wave moves faster, the vanguard
    // included, so it stays out in front of the creeps it is leading.
    const auraSpeed = vanguardAlive ? 1 + VANGUARD_SPEED_BONUS : 1;
    let remaining = c.speed * auraSpeed * (1 - c.slowFactor) * TILE_SIZE * dt;
    while (remaining > 0 && c.pathIndex < c.path.length) {
      const targetTile = c.path[c.pathIndex]!;
      const tx = targetTile.x * TILE_SIZE + TILE_SIZE / 2;
      const ty = targetTile.y * TILE_SIZE + TILE_SIZE / 2;
      const dx = tx - c.x;
      const dy = ty - c.y;
      const dist = Math.hypot(dx, dy);

      if (dist <= remaining) {
        c.x = tx;
        c.y = ty;
        remaining -= dist;
        c.pathIndex += 1;
      } else {
        c.x += (dx / dist) * remaining;
        c.y += (dy / dist) * remaining;
        remaining = 0;
      }
    }

    if (c.pathIndex >= c.path.length) {
      livesLostThisFrame += c.trait === 'boss' ? 3 : c.hero ? HERO_LIVES_COST : 1;
      sim.creeps.splice(i, 1);
    }
  }

  if (livesLostThisFrame > 0) {
    events.lifeLost?.();
    world.lives = Math.max(0, world.lives - livesLostThisFrame);
    if (world.lives <= 0) {
      events.defeat?.(Math.max(0, world.wave - 1));
    }
  }

  // 3. Weapons fire, using the element of the brick they stand on
  for (const tower of world.towers) {
    tower.cooldown = Math.max(0, tower.cooldown - dt);
    if (tower.cooldown > 0) continue;

    const def = TOWER_DEFS[tower.type];
    const mods = computeTileModifiers(world.grid, tower.x, tower.y);
    const dmgScale = tower.level === 1 ? 1 : tower.level === 2 ? 1.6 : 2.4;
    const rateScale = tower.level === 1 ? 1 : tower.level === 2 ? 1.15 : 1.32;
    const rangeScale = 1 + (tower.level - 1) * 0.1;

    const rangePx = def.baseRange * rangeScale * mods.rangeMult * TILE_SIZE;
    const cx = tower.x * TILE_SIZE + TILE_SIZE / 2;
    const cy = tower.y * TILE_SIZE + TILE_SIZE / 2;

    const elColor = elementAccent(mods.primaryElement);
    const isCrit = rng() < mods.critChance;
    let dmg = def.baseDamage * dmgScale * mods.damageMult;
    if (isCrit) dmg *= 1.75;

    const poisonDps = mods.poisonDpsRatio > 0 ? dmg * mods.poisonDpsRatio : 0;
    const burnDps = mods.burnDpsRatio > 0 ? dmg * mods.burnDpsRatio : 0;

    // PULSE: 360° nova ring hitting every creep in range
    if (tower.type === 'pulse') {
      const inRange = sim.creeps.filter(
        (c) => c.hp > 0 && Math.hypot(c.x - cx, c.y - cy) <= rangePx
      );
      const first = inRange[0];
      if (!first) continue;

      const fireRate = def.baseFireRate * rateScale * mods.fireRateMult;
      tower.cooldown = 1 / Math.max(0.2, fireRate);
      tower.recoil = 0.8;

      if (nowMs - sim.lastShotAudioAt > 85) {
        events.shoot?.(0.8);
        sim.lastShotAudioAt = nowMs;
      }

      spawnRing(cx, cy, rangePx, elColor, 0.22, 0.07);
      if (mods.secondaryElement) {
        spawnRing(cx, cy, rangePx * 0.68, BRICK_COLORS[mods.secondaryElement].hex, 0.18, 0.05);
      }

      for (const c of inRange) {
        if (mods.slowFactor > 0) {
          c.slowTimer = Math.max(c.slowTimer, mods.slowDuration);
          c.slowFactor = Math.max(c.slowFactor, mods.slowFactor);
        }
        if (poisonDps > 0) {
          c.poisonTimer = Math.max(c.poisonTimer, 3.2);
          c.poisonDps = Math.max(c.poisonDps, poisonDps);
        }
        if (burnDps > 0) {
          c.burnTimer = Math.max(c.burnTimer, 2.5);
          c.burnDps = Math.max(c.burnDps, burnDps);
        }
        if (mods.armorShred) c.shredTimer = Math.max(c.shredTimer, 3.0);

        damageCreep(c, dmg, { isCrit: false, sourceTowerId: tower.id });
      }

      // Yellow Lightning on a Pulse arcs out from the first creep
      if (mods.chainCount > 0) {
        triggerLightningChain(first, mods.chainCount, dmg, {
          sourceTowerId: tower.id,
          spreadVenom: mods.spreadVenomOnChain,
          slowFactor: mods.slowFactor,
          slowDuration: mods.slowDuration,
          poisonDps,
        });
      }
      continue;
    }

    // Directional weapons (Repeater, Cannon, Rail Sniper)
    let best: Creep | null = null;
    let bestMetric = -Infinity;
    const appliesVenom = mods.slowFactor > 0 || mods.poisonDpsRatio > 0;
    const appliesBurn = mods.burnDpsRatio > 0;

    for (const c of sim.creeps) {
      if (c.hp <= 0) continue;
      const d = Math.hypot(c.x - cx, c.y - cy);
      if (d > rangePx) continue;

      let metric = 0;
      if (tower.targeting === 'first') metric = c.pathIndex * 1000 - d * 0.01;
      else if (tower.targeting === 'strongest') metric = c.hp;
      else if (tower.targeting === 'fresh') {
        metric = c.pathIndex * 1000 - d * 0.01;
        if (carriesDebuff(c, appliesVenom, appliesBurn)) metric -= 1e9;
      } else metric = -d;

      if (metric > bestMetric) {
        bestMetric = metric;
        best = c;
      }
    }

    if (!best) continue;
    const target: Creep = best;

    tower.angle = Math.atan2(target.y - cy, target.x - cx);
    tower.recoil = 1;
    tower.muzzleFlash = 0.075;

    const fireRate = def.baseFireRate * rateScale * mods.fireRateMult;
    tower.cooldown = 1 / Math.max(0.2, fireRate);

    if (nowMs - sim.lastShotAudioAt > 85) {
      events.shoot?.(tower.type === 'cannon' ? 0.62 : tower.type === 'sniper' ? 1.45 : 1.05);
      sim.lastShotAudioAt = nowMs;
    }

    const muzzleX = cx + Math.cos(tower.angle) * 13;
    const muzzleY = cy + Math.sin(tower.angle) * 13;

    if (tower.type === 'sniper') {
      // Instant rail beam, coloured by the brick element
      const totalSplash = mods.extraSplashRadius;
      sim.beams.push({
        id: nextUid('sn'),
        points:
          mods.primaryElement === 'yellow'
            ? buildJaggedPoints({ x: muzzleX, y: muzzleY }, { x: target.x, y: target.y }, 5, rng)
            : [
                { x: muzzleX, y: muzzleY },
                { x: target.x, y: target.y },
              ],
        color: elColor,
        coreColor: '#FFFFFF',
        ttl: 0.18,
        maxTtl: 0.18,
        width: isCrit ? 4 : 3,
      });

      if (mods.slowFactor > 0) {
        target.slowTimer = Math.max(target.slowTimer, mods.slowDuration);
        target.slowFactor = Math.max(target.slowFactor, mods.slowFactor);
      }
      if (poisonDps > 0) {
        target.poisonTimer = Math.max(target.poisonTimer, 3.4);
        target.poisonDps = Math.max(target.poisonDps, poisonDps);
      }
      if (burnDps > 0) {
        target.burnTimer = Math.max(target.burnTimer, 2.8);
        target.burnDps = Math.max(target.burnDps, burnDps);
      }
      if (mods.armorShred) target.shredTimer = Math.max(target.shredTimer, 3.2);

      damageCreep(target, dmg, { isCrit, ignoreArmor: true, sourceTowerId: tower.id });

      if (totalSplash > 0) {
        const visSplash = Math.min(36, Math.max(16, totalSplash * 0.45));
        spawnRing(target.x, target.y, visSplash, '#EF4444', 0.16, 0.07);
        spawnBurst(target.x, target.y, '#FB923C', HIT_BURST, 60);
        for (const c of sim.creeps) {
          if (c.hp <= 0 || c.id === target.id) continue;
          if (Math.hypot(c.x - target.x, c.y - target.y) <= totalSplash) {
            damageCreep(c, dmg * 0.55, { isCrit: false, magic: true, sourceTowerId: tower.id });
          }
        }
      } else {
        spawnBurst(target.x, target.y, elColor, HIT_BURST, 80);
      }

      if (mods.chainCount > 0) {
        triggerLightningChain(target, mods.chainCount, dmg, {
          sourceTowerId: tower.id,
          spreadVenom: mods.spreadVenomOnChain,
          slowFactor: mods.slowFactor,
          slowDuration: mods.slowDuration,
          poisonDps,
        });
      }
    } else {
      // Projectile weapons: Repeater and Cannon
      const totalSplash = def.baseSplashRadius + mods.extraSplashRadius;
      const distTotal = Math.max(12, Math.hypot(target.x - muzzleX, target.y - muzzleY));

      sim.projectiles.push({
        id: nextUid('pr'),
        towerType: tower.type,
        element: mods.primaryElement,
        secondaryElement: mods.secondaryElement,
        x: muzzleX,
        y: muzzleY,
        startX: muzzleX,
        startY: muzzleY,
        targetId: target.id,
        targetX: target.x,
        targetY: target.y,
        angle: tower.angle,
        speed: def.projectileSpeed,
        distanceTotal: distTotal,
        distanceTraveled: 0,
        arcHeight: tower.type === 'cannon' ? Math.min(54, Math.max(26, distTotal * 0.28)) : 0,
        spin: 0,
        trail: [],
        damage: dmg,
        splashRadius: totalSplash,
        chainCount: mods.chainCount,
        slowFactor: mods.slowFactor,
        slowDuration: mods.slowDuration,
        poisonDps,
        poisonDuration: 3.4,
        burnDps,
        shredArmor: mods.armorShred,
        spreadVenomOnChain: mods.spreadVenomOnChain,
        isCrit,
        ignoreArmor: def.armorPierce,
        sourceTowerId: tower.id,
      });
    }
  }

  // 4. Advance projectiles and trigger elemental impacts
  for (let i = sim.projectiles.length - 1; i >= 0; i--) {
    const p = sim.projectiles[i]!;
    const liveTarget = sim.creeps.find((c) => c.id === p.targetId && c.hp > 0);
    if (liveTarget && p.towerType !== 'cannon') {
      p.targetX = liveTarget.x;
      p.targetY = liveTarget.y;
    }

    const dx = p.targetX - p.x;
    const dy = p.targetY - p.y;
    const dist = Math.hypot(dx, dy);
    const step = p.speed * dt;

    const progress = p.distanceTotal > 0 ? Math.min(1, p.distanceTraveled / p.distanceTotal) : 0;
    const z = p.arcHeight > 0 ? Math.sin(progress * Math.PI) * p.arcHeight : 0;
    p.trail.push({ x: p.x, y: p.y, z });
    if (p.trail.length > (p.towerType === 'cannon' ? 8 : 5)) {
      p.trail.shift();
    }

    p.spin += dt * 11;
    if (dist > 1) p.angle = Math.atan2(dy, dx);

    if (dist <= step + 6) {
      const impactX = p.targetX;
      const impactY = p.targetY;
      const elColor = elementAccent(p.element);

      const applyHit = (target: Creep, mult = 1) => {
        if (p.slowFactor > 0 && p.slowDuration > 0) {
          target.slowTimer = Math.max(target.slowTimer, p.slowDuration);
          target.slowFactor = Math.max(target.slowFactor, p.slowFactor);
        }
        if (p.poisonDps > 0) {
          target.poisonTimer = Math.max(target.poisonTimer, p.poisonDuration);
          target.poisonDps = Math.max(target.poisonDps, p.poisonDps);
        }
        if (p.burnDps > 0) {
          target.burnTimer = Math.max(target.burnTimer, 2.6);
          target.burnDps = Math.max(target.burnDps, p.burnDps);
        }
        if (p.shredArmor) {
          target.shredTimer = Math.max(target.shredTimer, 3.2);
        }
        damageCreep(target, p.damage * mult, {
          isCrit: p.isCrit && mult === 1,
          ignoreArmor: p.ignoreArmor,
          // Splash on anything but the creep the shot was aimed at is magic.
          magic: target !== liveTarget,
          sourceTowerId: p.sourceTowerId,
        });
      };

      let chainAnchor: Creep | null = liveTarget ?? null;

      if (p.splashRadius > 0) {
        for (const c of sim.creeps) {
          if (c.hp <= 0) continue;
          const d = Math.hypot(c.x - impactX, c.y - impactY);
          if (d <= p.splashRadius) {
            if (!chainAnchor) chainAnchor = c;
            applyHit(c, d <= p.splashRadius * 0.45 ? 1 : 0.72);
          }
        }
        const visSplash = Math.min(40, Math.max(18, p.splashRadius * 0.44));
        spawnRing(impactX, impactY, visSplash, p.element === 'red' ? '#F97316' : elColor, 0.16, 0.08);
        spawnBurst(impactX, impactY, elColor, HIT_BURST, 65);
      } else if (liveTarget) {
        applyHit(liveTarget, 1);
        spawnBurst(impactX, impactY, elColor, HIT_BURST, 58);
        if (p.element === 'green') {
          spawnRing(impactX, impactY, 15, '#34D399', 0.15, 0.08);
        }
      }

      if (p.chainCount > 0 && chainAnchor) {
        triggerLightningChain(chainAnchor, p.chainCount, p.damage, {
          sourceTowerId: p.sourceTowerId,
          spreadVenom: p.spreadVenomOnChain,
          slowFactor: p.slowFactor,
          slowDuration: p.slowDuration,
          poisonDps: p.poisonDps,
        });
      }

      sim.projectiles.splice(i, 1);
    } else {
      p.x += (dx / dist) * step;
      p.y += (dy / dist) * step;
      p.distanceTraveled += step;
    }
  }

  // 5. Wave cleared
  if (
    sim.spawnQueueLeft === 0 &&
    sim.creeps.length === 0 &&
    world.lives > 0 &&
    !sim.matchEnded
  ) {
    sim.projectiles.length = 0;
    const clearedWave = world.wave;
    world.gold += waveDef.clearBonus;
    addFloatingText(432, 260, `Wave ${clearedWave} Cleared · +${waveDef.clearBonus}g`, '#34D399');
    events.waveCleared?.(clearedWave, waveDef.clearBonus, !world.endlessMode && clearedWave >= MAX_WAVES);
  }
}
