import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BASE_STARTING_GOLD,
  BRICKS_PER_TURN,
  BRICK_COLORS,
  BRICK_COLOR_LIST,
  CLEAR_GRAY_BRICK_COST,
  DIFFICULTY_DEFS,
  MAX_WAVES,
  TILE_SIZE,
  TOWER_DEFS,
  TOWER_LIST,
  getProfilePerks,
  getWaveDefinition,
} from '../../domain/constants';
import { soundEngine } from '../../domain/audio';
import { computeMazePath, createInitialGrid, isBrickCell } from '../../domain/pathfinding';
import {
  computeBoardSynergyLinks,
  computeTileModifiers,
  findTurnFusionOptions,
} from '../../domain/synergy';
import {
  BeamEffect,
  BrickColor,
  Coord,
  Creep,
  DifficultyId,
  FloatingText,
  GamePhase,
  GridCell,
  ImpactRing,
  MapLayoutId,
  MatchSummary,
  Particle,
  PlacedTurnEntry,
  PlayerProfile,
  Projectile,
  TargetingMode,
  Tower,
  TowerType,
  TurnFusionOption,
} from '../../domain/types';
import { RenderFrameInput, getElementAccent } from '../../engine/pixelRenderer';
import { BuildControlDock } from '../organisms/BuildControlDock';
import { ContextInspectorRail } from '../organisms/ContextInspectorRail';
import { MatchHudBar } from '../organisms/MatchHudBar';
import { MatchOutcomeModal } from '../organisms/MatchOutcomeModal';
import { MazeCanvasStage } from '../organisms/MazeCanvasStage';
import { TacticalArenaTemplate } from '../templates/TacticalArenaTemplate';

interface ArenaMatchPageProps {
  profile: PlayerProfile;
  mapLayout: MapLayoutId;
  difficulty: DifficultyId;
  onExitToLobby: () => void;
  onRecordMatchEnd: (result: {
    won: boolean;
    difficulty: DifficultyId;
    wavesCleared: number;
    longestPath: number;
    synergiesCount: number;
    creepsDefeated: number;
  }) => Promise<MatchSummary>;
}

function rollFourBricks(): BrickColor[] {
  const hand: BrickColor[] = [];
  for (let i = 0; i < BRICKS_PER_TURN; i++) {
    hand.push(BRICK_COLOR_LIST[Math.floor(Math.random() * BRICK_COLOR_LIST.length)]);
  }
  return hand;
}

function cloneGrid(grid: GridCell[][]): GridCell[][] {
  return grid.map((row) => row.map((cell) => ({ ...cell })));
}

function buildJaggedPoints(
  from: { x: number; y: number },
  to: { x: number; y: number },
  segments = 4
): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [from];
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;

  for (let i = 1; i < segments; i++) {
    const t = i / segments;
    const jitter = (Math.random() - 0.5) * 14;
    pts.push({
      x: from.x + dx * t + nx * jitter,
      y: from.y + dy * t + ny * jitter,
    });
  }
  pts.push(to);
  return pts;
}

let uidCounter = 1;
function nextUid(prefix: string): string {
  uidCounter += 1;
  return `${prefix}_${uidCounter}`;
}

export const ArenaMatchPage: React.FC<ArenaMatchPageProps> = ({
  profile,
  mapLayout,
  difficulty,
  onExitToLobby,
  onRecordMatchEnd,
}) => {
  const perks = useMemo(() => getProfilePerks(profile.level), [profile.level]);
  const diffDef = DIFFICULTY_DEFS[difficulty];

  const [grid, setGrid] = useState<GridCell[][]>(() => createInitialGrid(mapLayout));
  const [phase, setPhase] = useState<GamePhase>('BUILD_PLACE');
  const [wave, setWave] = useState<number>(1);
  const [endlessMode, setEndlessMode] = useState<boolean>(false);
  const [lives, setLives] = useState<number>(diffDef.startingLives);
  const [gold, setGold] = useState<number>(BASE_STARTING_GOLD + perks.bonusStartGold);
  const [rerollsRemaining, setRerollsRemaining] = useState<number>(2 + perks.bonusRerolls);
  const [draftQueue, setDraftQueue] = useState<BrickColor[]>(() => rollFourBricks());
  const [placedTurnCoords, setPlacedTurnCoords] = useState<PlacedTurnEntry[]>([]);
  const [towers, setTowers] = useState<Tower[]>([]);
  const [selectedCoord, setSelectedCoord] = useState<Coord | null>(null);
  const [mobileInspectorOpen, setMobileInspectorOpen] = useState<boolean>(false);
  const [placingTowerType, setPlacingTowerType] = useState<TowerType | null>(null);
  const [relocatingTowerId, setRelocatingTowerId] = useState<string | null>(null);
  const [speed, setSpeed] = useState<1 | 2 | 3>(1);
  const [muted, setMuted] = useState<boolean>(() => soundEngine.isMuted());
  const [hoverCoord, setHoverCoord] = useState<Coord | null>(null);
  const [creepsRemainingUi, setCreepsRemainingUi] = useState<number>(0);
  const [waveTotalCreepsUi, setWaveTotalCreepsUi] = useState<number>(0);
  const [outcomeSummary, setOutcomeSummary] = useState<MatchSummary | null>(null);

  const pathResult = useMemo(() => computeMazePath(grid, mapLayout), [grid, mapLayout]);
  const synergyLinks = useMemo(() => computeBoardSynergyLinks(grid), [grid]);
  const fusionOptions = useMemo(
    () => (phase === 'BUILD_PICK' ? findTurnFusionOptions(grid, placedTurnCoords) : []),
    [grid, phase, placedTurnCoords]
  );

  const hoverPreview = useMemo(() => {
    if (phase !== 'BUILD_PLACE' || !hoverCoord) {
      return {
        valid: true,
        path: null as Coord[] | null,
        statusText: null as string | null,
        tone: 'neutral' as 'neutral' | 'good' | 'info' | 'bad',
      };
    }

    const cell = grid[hoverCoord.y]?.[hoverCoord.x];
    if (!cell) {
      return { valid: false, path: null, statusText: null, tone: 'neutral' as const };
    }

    const occupied = towers.some((t) => t.x === hoverCoord.x && t.y === hoverCoord.y);

    if (cell.kind === 'GRAY_WALL' && !occupied) {
      return {
        valid: true,
        path: null,
        statusText: 'Replant Gray Wall (Free)',
        tone: 'info' as const,
      };
    }

    if (cell.kind !== 'OPEN') {
      return { valid: false, path: null, statusText: null, tone: 'neutral' as const };
    }

    const res = computeMazePath(grid, mapLayout, hoverCoord);
    if (!res.valid) {
      return {
        valid: false,
        path: null,
        statusText: `Blocked: ${res.blockedSegment ?? 'Path'}`,
        tone: 'bad' as const,
      };
    }

    const delta = res.length - pathResult.length;
    return {
      valid: true,
      path: res.path,
      statusText: delta > 0 ? `+${delta} path tiles` : 'Path unchanged',
      tone: delta > 0 ? ('good' as const) : ('neutral' as const),
    };
  }, [phase, hoverCoord, grid, towers, mapLayout, pathResult.length]);

  const simRef = useRef({
    creeps: [] as Creep[],
    projectiles: [] as Projectile[],
    beams: [] as BeamEffect[],
    impactRings: [] as ImpactRing[],
    particles: [] as Particle[],
    floatingTexts: [] as FloatingText[],
    spawnQueueLeft: 0,
    spawnTimer: 0,
    longestPathSeen: pathResult.length,
    totalKills: 0,
    matchEnded: false,
    lastShotAudioAt: 0,
  });

  const stateRef = useRef({
    grid,
    phase,
    wave,
    difficulty,
    endlessMode,
    lives,
    gold,
    towers,
    path: pathResult.path,
    speed,
    synergyCount: synergyLinks.length,
  });

  useEffect(() => {
    stateRef.current = {
      grid,
      phase,
      wave,
      difficulty,
      endlessMode,
      lives,
      gold,
      towers,
      path: pathResult.path,
      speed,
      synergyCount: synergyLinks.length,
    };
    if (pathResult.length > simRef.current.longestPathSeen) {
      simRef.current.longestPathSeen = pathResult.length;
    }
  }, [
    grid,
    phase,
    wave,
    difficulty,
    endlessMode,
    lives,
    gold,
    towers,
    pathResult,
    speed,
    synergyLinks.length,
  ]);

  const frameRef = useRef<RenderFrameInput>({
    grid,
    themeId: profile.selectedTheme,
    phase,
    path: pathResult.path,
    previewPath: null,
    previewValid: true,
    hoverCoord: null,
    nextDraftColor: draftQueue[0] ?? null,
    placedTurnCoords,
    synergyLinks,
    towers,
    selectedCoord,
    relocatingTowerId,
    placingTowerType,
    creeps: simRef.current.creeps,
    projectiles: simRef.current.projectiles,
    beams: simRef.current.beams,
    impactRings: simRef.current.impactRings,
    particles: simRef.current.particles,
    floatingTexts: simRef.current.floatingTexts,
    camera: { zoom: 1, panX: 0, panY: 0 },
    nowSec: 0,
  });

  useEffect(() => {
    const f = frameRef.current;
    f.grid = grid;
    f.themeId = profile.selectedTheme;
    f.phase = phase;
    f.path = pathResult.path;
    f.previewPath = hoverPreview.path;
    f.previewValid = hoverPreview.valid;
    f.hoverCoord = hoverCoord;
    f.nextDraftColor =
      phase === 'BUILD_PLACE' ? draftQueue[placedTurnCoords.length] ?? null : null;
    f.placedTurnCoords = placedTurnCoords;
    f.synergyLinks = synergyLinks;
    f.towers = towers;
    f.selectedCoord = selectedCoord;
    f.relocatingTowerId = relocatingTowerId;
    f.placingTowerType = placingTowerType;
  }, [
    grid,
    profile.selectedTheme,
    phase,
    pathResult.path,
    hoverPreview,
    hoverCoord,
    draftQueue,
    placedTurnCoords,
    synergyLinks,
    towers,
    selectedCoord,
    relocatingTowerId,
    placingTowerType,
  ]);

  const finishMatch = useCallback(
    async (won: boolean, wavesCleared: number) => {
      if (simRef.current.matchEnded) return;
      simRef.current.matchEnded = true;
      setPhase(won ? 'VICTORY' : 'GAME_OVER');
      if (won) soundEngine.playVictory();
      else soundEngine.playDefeat();

      const summary = await onRecordMatchEnd({
        won,
        difficulty: stateRef.current.difficulty,
        wavesCleared,
        longestPath: simRef.current.longestPathSeen,
        synergiesCount: stateRef.current.synergyCount,
        creepsDefeated: simRef.current.totalKills,
      });
      setOutcomeSummary(summary);
    },
    [onRecordMatchEnd]
  );

  // 60 FPS Simulation Loop (4 Weapons × 3 Elemental Brick Ammo Types)
  useEffect(() => {
    let rafId = 0;
    let lastTime = performance.now();
    let uiSyncAccum = 0;

    const spawnBurst = (x: number, y: number, color: string, count = 6, maxSpeed = 85) => {
      for (let i = 0; i < count; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = 24 + Math.random() * maxSpeed;
        simRef.current.particles.push({
          x,
          y,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          size: 3 + Math.floor(Math.random() * 3),
          color,
          ttl: 0.2 + Math.random() * 0.25,
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
      simRef.current.impactRings.push({
        id: nextUid('rg'),
        x,
        y,
        maxRadius,
        color,
        fillAlpha,
        ttl,
        maxTtl: ttl,
      });
    };

    const addFloatingText = (x: number, y: number, text: string, color: string) => {
      simRef.current.floatingTexts.push({
        id: nextUid('ft'),
        x,
        y,
        text,
        color,
        ttl: 0.72,
        maxTtl: 0.72,
      });
    };

    const damageCreep = (
      creep: Creep,
      rawDamage: number,
      opts: { isCrit: boolean; ignoreArmor?: boolean; sourceTowerId: string }
    ) => {
      if (creep.hp <= 0) return;
      const effectiveArmor = opts.ignoreArmor
        ? 0
        : Math.max(0, creep.armor - (creep.shredTimer > 0 ? 0.25 : 0));
      const dealt = Math.max(1, rawDamage * (1 - effectiveArmor));
      creep.hp -= dealt;

      const srcTower = stateRef.current.towers.find((t) => t.id === opts.sourceTowerId);
      if (srcTower) srcTower.totalDamage += dealt;

      if (opts.isCrit) {
        addFloatingText(creep.x, creep.y - 12, `${Math.round(dealt)}!`, '#FDE047');
      }

      if (creep.hp <= 0) {
        simRef.current.totalKills += 1;
        if (srcTower) srcTower.kills += 1;
        stateRef.current.gold += creep.bounty;
        setGold((g) => g + creep.bounty);
        addFloatingText(creep.x, creep.y - 8, `+${creep.bounty}g`, '#FBBF24');
        spawnBurst(
          creep.x,
          creep.y,
          creep.trait === 'boss' ? '#F43F5E' : '#F8FAFC',
          creep.trait === 'boss' ? 18 : 7
        );
      }
    };

    // Triggers Yellow Lightning Chains jumping from an impact target
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
      const sim = simRef.current;
      const hitIds = new Set<string>([originCreep.id]);
      const jaggedChain: { x: number; y: number }[] = [];
      let prevPt = { x: originCreep.x, y: originCreep.y };
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
        const seg = buildJaggedPoints(prevPt, { x: nextTarget.x, y: nextTarget.y }, 4);
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

    const tick = (now: number) => {
      const rawDt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      const st = stateRef.current;
      const dt = rawDt * st.speed;
      const sim = simRef.current;

      for (const t of st.towers) {
        if (t.recoil > 0) t.recoil = Math.max(0, t.recoil - rawDt * 7);
        if (t.muzzleFlash > 0) t.muzzleFlash = Math.max(0, t.muzzleFlash - rawDt);
      }

      for (let i = sim.beams.length - 1; i >= 0; i--) {
        sim.beams[i].ttl -= rawDt;
        if (sim.beams[i].ttl <= 0) sim.beams.splice(i, 1);
      }
      for (let i = sim.impactRings.length - 1; i >= 0; i--) {
        sim.impactRings[i].ttl -= rawDt;
        if (sim.impactRings[i].ttl <= 0) sim.impactRings.splice(i, 1);
      }
      for (let i = sim.particles.length - 1; i >= 0; i--) {
        const p = sim.particles[i];
        p.x += p.vx * rawDt;
        p.y += p.vy * rawDt;
        p.ttl -= rawDt;
        if (p.ttl <= 0) sim.particles.splice(i, 1);
      }
      for (let i = sim.floatingTexts.length - 1; i >= 0; i--) {
        const ft = sim.floatingTexts[i];
        ft.y -= 26 * rawDt;
        ft.ttl -= rawDt;
        if (ft.ttl <= 0) sim.floatingTexts.splice(i, 1);
      }

      if (st.phase === 'COMBAT') {
        const waveDef = getWaveDefinition(st.wave, st.difficulty);

        // 1. Spawn creeps with their own path snapshot so mid-wave gray wall deletion never glitches active creeps
        if (sim.spawnQueueLeft > 0) {
          sim.spawnTimer -= dt;
          if (sim.spawnTimer <= 0 && st.path.length > 0) {
            const startTile = st.path[0];
            sim.creeps.push({
              id: nextUid('cr'),
              wave: st.wave,
              trait: waveDef.trait,
              x: startTile.x * TILE_SIZE + TILE_SIZE / 2,
              y: startTile.y * TILE_SIZE + TILE_SIZE / 2,
              path: st.path.slice(),
              pathIndex: 1,
              hp: waveDef.hp,
              maxHp: waveDef.hp,
              speed: waveDef.speed,
              armor: waveDef.armor,
              bounty: waveDef.bounty,
              slowTimer: 0,
              slowFactor: 0,
              poisonTimer: 0,
              poisonDps: 0,
              burnTimer: 0,
              burnDps: 0,
              shredTimer: 0,
              animTime: Math.random() * 6,
              radius: waveDef.trait === 'boss' ? 13 : 8,
            });
            sim.spawnQueueLeft -= 1;
            sim.spawnTimer = waveDef.spawnInterval;
          }
        }

        // 2. Move creeps & tick Venom DoT / Fire Burn / Regen
        let livesLostThisFrame = 0;
        for (let i = sim.creeps.length - 1; i >= 0; i--) {
          const c = sim.creeps[i];
          if (c.hp <= 0) {
            sim.creeps.splice(i, 1);
            continue;
          }

          c.animTime += dt;

          if (c.trait === 'regen' && c.hp < c.maxHp) {
            c.hp = Math.min(c.maxHp, c.hp + c.maxHp * 0.055 * dt);
          }

          if (c.slowTimer > 0) {
            c.slowTimer -= dt;
            if (c.slowTimer <= 0) c.slowFactor = 0;
          }
          if (c.shredTimer > 0) c.shredTimer -= dt;

          // Green Venom DoT ignores armor!
          if (c.poisonTimer > 0) {
            c.poisonTimer -= dt;
            c.hp -= c.poisonDps * dt;
          }
          // Red Fire Burn
          if (c.burnTimer > 0) {
            c.burnTimer -= dt;
            c.hp -= c.burnDps * dt;
          }

          if (c.hp <= 0) {
            sim.totalKills += 1;
            stateRef.current.gold += c.bounty;
            setGold((g) => g + c.bounty);
            addFloatingText(c.x, c.y - 8, `+${c.bounty}g`, c.poisonTimer > 0 ? '#4ADE80' : '#FB923C');
            spawnBurst(c.x, c.y, c.poisonTimer > 0 ? '#10B981' : '#EF4444', 7);
            sim.creeps.splice(i, 1);
            continue;
          }

          const movePx = c.speed * (1 - c.slowFactor) * TILE_SIZE * dt;
          let remaining = movePx;
          while (remaining > 0 && c.pathIndex < c.path.length) {
            const targetTile = c.path[c.pathIndex];
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
            livesLostThisFrame += c.trait === 'boss' ? 3 : 1;
            sim.creeps.splice(i, 1);
          }
        }

        if (livesLostThisFrame > 0) {
          soundEngine.playLifeLost();
          const nextLives = Math.max(0, stateRef.current.lives - livesLostThisFrame);
          stateRef.current.lives = nextLives;
          setLives(nextLives);
          if (nextLives <= 0) {
            finishMatch(false, Math.max(0, st.wave - 1));
          }
        }

        // 3. Weapons Fire using Loaded Brick Element
        for (const tower of st.towers) {
          tower.cooldown = Math.max(0, tower.cooldown - dt);
          if (tower.cooldown > 0) continue;

          const def = TOWER_DEFS[tower.type];
          const mods = computeTileModifiers(st.grid, tower.x, tower.y);
          const dmgScale = tower.level === 1 ? 1 : tower.level === 2 ? 1.6 : 2.4;
          const rateScale = tower.level === 1 ? 1 : tower.level === 2 ? 1.15 : 1.32;
          const rangeScale = 1 + (tower.level - 1) * 0.1;

          const rangePx = def.baseRange * rangeScale * mods.rangeMult * TILE_SIZE;
          const cx = tower.x * TILE_SIZE + TILE_SIZE / 2;
          const cy = tower.y * TILE_SIZE + TILE_SIZE / 2;

          const elColor = getElementAccent(mods.primaryElement);
          const isCrit = Math.random() < mods.critChance;
          let dmg = def.baseDamage * dmgScale * mods.damageMult;
          if (isCrit) dmg *= 1.75;

          const poisonDps = mods.poisonDpsRatio > 0 ? dmg * mods.poisonDpsRatio : 0;
          const burnDps = mods.burnDpsRatio > 0 ? dmg * mods.burnDpsRatio : 0;

          // PULSE WEAPON: 360° Nova Ring hitting ALL creeps in range!
          if (tower.type === 'pulse') {
            const inRange = sim.creeps.filter(
              (c) => c.hp > 0 && Math.hypot(c.x - cx, c.y - cy) <= rangePx
            );
            if (inRange.length === 0) continue;

            const fireRate = def.baseFireRate * rateScale * mods.fireRateMult;
            tower.cooldown = 1 / Math.max(0.2, fireRate);
            tower.recoil = 0.8;

            if (now - sim.lastShotAudioAt > 85) {
              soundEngine.playShoot(0.8);
              sim.lastShotAudioAt = now;
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

            // If Yellow Lightning is loaded on a Pulse tower, arc out from the first creep!
            if (mods.chainCount > 0 && inRange[0]) {
              triggerLightningChain(inRange[0], mods.chainCount, dmg, {
                sourceTowerId: tower.id,
                spreadVenom: mods.spreadVenomOnChain,
                slowFactor: mods.slowFactor,
                slowDuration: mods.slowDuration,
                poisonDps,
              });
            }
            continue;
          }

          // Directional Weapons (Repeater, Cannon, Rail Sniper)
          let best: Creep | null = null;
          let bestMetric = -Infinity;

          for (const c of sim.creeps) {
            if (c.hp <= 0) continue;
            const d = Math.hypot(c.x - cx, c.y - cy);
            if (d > rangePx) continue;

            let metric = 0;
            if (tower.targeting === 'first') metric = c.pathIndex * 1000 - d * 0.01;
            else if (tower.targeting === 'strongest') metric = c.hp;
            else metric = -d;

            if (metric > bestMetric) {
              bestMetric = metric;
              best = c;
            }
          }

          if (!best) continue;

          tower.angle = Math.atan2(best.y - cy, best.x - cx);
          tower.recoil = 1;
          tower.muzzleFlash = 0.075;

          const fireRate = def.baseFireRate * rateScale * mods.fireRateMult;
          tower.cooldown = 1 / Math.max(0.2, fireRate);

          if (now - sim.lastShotAudioAt > 85) {
            soundEngine.playShoot(
              tower.type === 'cannon' ? 0.62 : tower.type === 'sniper' ? 1.45 : 1.05
            );
            sim.lastShotAudioAt = now;
          }

          const muzzleX = cx + Math.cos(tower.angle) * 13;
          const muzzleY = cy + Math.sin(tower.angle) * 13;

          if (tower.type === 'sniper') {
            // Instant high-impact Rail Beam colored by brick element
            const totalSplash = mods.extraSplashRadius;
            sim.beams.push({
              id: nextUid('sn'),
              points:
                mods.primaryElement === 'yellow'
                  ? buildJaggedPoints({ x: muzzleX, y: muzzleY }, { x: best.x, y: best.y }, 5)
                  : [
                      { x: muzzleX, y: muzzleY },
                      { x: best.x, y: best.y },
                    ],
              color: elColor,
              coreColor: '#FFFFFF',
              ttl: 0.18,
              maxTtl: 0.18,
              width: isCrit ? 4 : 3,
            });

            if (mods.slowFactor > 0) {
              best.slowTimer = Math.max(best.slowTimer, mods.slowDuration);
              best.slowFactor = Math.max(best.slowFactor, mods.slowFactor);
            }
            if (poisonDps > 0) {
              best.poisonTimer = Math.max(best.poisonTimer, 3.4);
              best.poisonDps = Math.max(best.poisonDps, poisonDps);
            }
            if (burnDps > 0) {
              best.burnTimer = Math.max(best.burnTimer, 2.8);
              best.burnDps = Math.max(best.burnDps, burnDps);
            }
            if (mods.armorShred) best.shredTimer = Math.max(best.shredTimer, 3.2);

            damageCreep(best, dmg, {
              isCrit,
              ignoreArmor: true,
              sourceTowerId: tower.id,
            });

            if (totalSplash > 0) {
              const visSplash = Math.min(36, Math.max(16, totalSplash * 0.45));
              spawnRing(best.x, best.y, visSplash, '#EF4444', 0.16, 0.07);
              spawnBurst(best.x, best.y, '#FB923C', 5, 60);
              for (const c of sim.creeps) {
                if (c.hp <= 0 || c.id === best.id) continue;
                if (Math.hypot(c.x - best.x, c.y - best.y) <= totalSplash) {
                  damageCreep(c, dmg * 0.55, { isCrit: false, sourceTowerId: tower.id });
                }
              }
            } else {
              spawnBurst(best.x, best.y, elColor, 6, 80);
            }

            if (mods.chainCount > 0) {
              triggerLightningChain(best, mods.chainCount, dmg, {
                sourceTowerId: tower.id,
                spreadVenom: mods.spreadVenomOnChain,
                slowFactor: mods.slowFactor,
                slowDuration: mods.slowDuration,
                poisonDps,
              });
            }
          } else {
            // Projectile Weapons: Repeater & Cannon
            const totalSplash = def.baseSplashRadius + mods.extraSplashRadius;
            const distTotal = Math.max(12, Math.hypot(best.x - muzzleX, best.y - muzzleY));

            sim.projectiles.push({
              id: nextUid('pr'),
              towerType: tower.type,
              element: mods.primaryElement,
              secondaryElement: mods.secondaryElement,
              x: muzzleX,
              y: muzzleY,
              startX: muzzleX,
              startY: muzzleY,
              targetId: best.id,
              targetX: best.x,
              targetY: best.y,
              angle: tower.angle,
              speed: def.projectileSpeed,
              distanceTotal: distTotal,
              distanceTraveled: 0,
              arcHeight:
                tower.type === 'cannon' ? Math.min(54, Math.max(26, distTotal * 0.28)) : 0,
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

        // 4. Advance Projectiles & Trigger Elemental Impacts
        for (let i = sim.projectiles.length - 1; i >= 0; i--) {
          const p = sim.projectiles[i];
          const liveTarget = sim.creeps.find((c) => c.id === p.targetId && c.hp > 0);
          if (liveTarget && p.towerType !== 'cannon') {
            p.targetX = liveTarget.x;
            p.targetY = liveTarget.y;
          }

          const dx = p.targetX - p.x;
          const dy = p.targetY - p.y;
          const dist = Math.hypot(dx, dy);
          const step = p.speed * dt;

          const progress =
            p.distanceTotal > 0 ? Math.min(1, p.distanceTraveled / p.distanceTotal) : 0;
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
            const elColor = getElementAccent(p.element);

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
              spawnRing(
                impactX,
                impactY,
                visSplash,
                p.element === 'red' ? '#F97316' : elColor,
                0.16,
                0.08
              );
              spawnBurst(impactX, impactY, elColor, 6, 65);
            } else if (liveTarget) {
              applyHit(liveTarget, 1);
              spawnBurst(impactX, impactY, elColor, 4, 58);
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

        uiSyncAccum += rawDt;
        if (uiSyncAccum >= 0.12) {
          uiSyncAccum = 0;
          setCreepsRemainingUi(sim.spawnQueueLeft + sim.creeps.length);
        }

        // 5. Wave Cleared
        if (
          sim.spawnQueueLeft === 0 &&
          sim.creeps.length === 0 &&
          stateRef.current.lives > 0 &&
          !sim.matchEnded
        ) {
          sim.projectiles.length = 0;
          setCreepsRemainingUi(0);

          const clearedWave = st.wave;
          setGold((g) => g + waveDef.clearBonus);
          addFloatingText(432, 260, `Wave ${clearedWave} Cleared · +${waveDef.clearBonus}g`, '#34D399');

          if (!st.endlessMode && clearedWave >= MAX_WAVES) {
            finishMatch(true, clearedWave);
          } else {
            setWave((w) => w + 1);
            setDraftQueue(rollFourBricks());
            setPlacedTurnCoords([]);
            setPlacingTowerType(null);
            setRelocatingTowerId(null);
            setPhase('BUILD_PLACE');
          }
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [finishMatch]);

  // --- User Actions ---

  const handleRerollDraft = useCallback(() => {
    if (phase !== 'BUILD_PLACE' || placedTurnCoords.length > 0 || rerollsRemaining <= 0) return;
    setRerollsRemaining((r) => r - 1);
    setDraftQueue(rollFourBricks());
    soundEngine.playBrickSnap();
  }, [phase, placedTurnCoords.length, rerollsRemaining]);

  const handleUndoLastBrick = useCallback(() => {
    if ((phase !== 'BUILD_PLACE' && phase !== 'BUILD_PICK') || placedTurnCoords.length === 0) return;
    const last = placedTurnCoords[placedTurnCoords.length - 1];
    const nextGrid = cloneGrid(grid);
    nextGrid[last.y][last.x] = { x: last.x, y: last.y, kind: last.previousKind };
    setGrid(nextGrid);
    setPlacedTurnCoords((prev) => prev.slice(0, -1));
    if (phase === 'BUILD_PICK') setPhase('BUILD_PLACE');
    soundEngine.playSell();
  }, [phase, placedTurnCoords, grid]);

  const handlePickTurnBrick = useCallback(
    (keepIndex: number) => {
      if (phase !== 'BUILD_PICK') return;
      const keepEntry = placedTurnCoords[keepIndex];
      if (!keepEntry) return;

      const nextGrid = cloneGrid(grid);
      placedTurnCoords.forEach((entry, idx) => {
        const cell = nextGrid[entry.y][entry.x];
        if (idx === keepIndex) {
          cell.kind = 'ACTIVE_BRICK';
          cell.turnDraftIndex = undefined;
        } else {
          cell.kind = 'GRAY_WALL';
          cell.color = undefined;
          cell.secondaryColor = undefined;
          cell.turnDraftIndex = undefined;
        }
      });

      setGrid(nextGrid);
      setPlacedTurnCoords([]);
      setSelectedCoord({ x: keepEntry.x, y: keepEntry.y });
      setPhase('BUILD_MANAGE');
      soundEngine.playKeepBrick();
    },
    [phase, placedTurnCoords, grid]
  );

  const handleFuseTurnPair = useCallback(
    (option: TurnFusionOption) => {
      if (phase !== 'BUILD_PICK') return;
      const anchorEntry = placedTurnCoords[option.anchorIndex];
      if (!anchorEntry) return;

      const nextGrid = cloneGrid(grid);
      placedTurnCoords.forEach((entry, idx) => {
        const cell = nextGrid[entry.y][entry.x];
        if (idx === option.anchorIndex) {
          cell.kind = 'MASTER_BRICK';
          cell.color = option.colors[0];
          cell.secondaryColor = option.colors[1];
          cell.turnDraftIndex = undefined;
        } else {
          cell.kind = 'GRAY_WALL';
          cell.color = undefined;
          cell.secondaryColor = undefined;
          cell.turnDraftIndex = undefined;
        }
      });

      setGrid(nextGrid);
      setPlacedTurnCoords([]);
      setSelectedCoord({ x: anchorEntry.x, y: anchorEntry.y });
      setPhase('BUILD_MANAGE');
      soundEngine.playFuseMaster();
    },
    [phase, placedTurnCoords, grid]
  );

  const handleClearGrayBrick = useCallback(
    (coord: Coord) => {
      if (phase === 'VICTORY' || phase === 'GAME_OVER' || gold < CLEAR_GRAY_BRICK_COST) return;
      const cell = grid[coord.y]?.[coord.x];
      if (!cell || cell.kind !== 'GRAY_WALL') return;
      if (towers.some((t) => t.x === coord.x && t.y === coord.y)) return;

      const nextGrid = cloneGrid(grid);
      nextGrid[coord.y][coord.x] = { x: coord.x, y: coord.y, kind: 'OPEN' };
      setGrid(nextGrid);
      setGold((g) => g - CLEAR_GRAY_BRICK_COST);
      setSelectedCoord(null);
      setMobileInspectorOpen(false);
      soundEngine.playSell();
    },
    [phase, gold, grid, towers]
  );

  const handleSendWave = useCallback(() => {
    if (phase !== 'BUILD_MANAGE') return;
    const waveDef = getWaveDefinition(wave, difficulty);
    simRef.current.spawnQueueLeft = waveDef.count;
    simRef.current.spawnTimer = 0.2;
    setWaveTotalCreepsUi(waveDef.count);
    setCreepsRemainingUi(waveDef.count);
    setRelocatingTowerId(null);
    setMobileInspectorOpen(false);
    setPhase('COMBAT');
    soundEngine.playWaveStart();
  }, [phase, wave, difficulty]);

  const handleSelectTowerType = useCallback((type: TowerType) => {
    setRelocatingTowerId(null);
    setPlacingTowerType((prev) => (prev === type ? null : type));
  }, []);

  const handleUpgradeTower = useCallback(
    (towerId: string) => {
      const target = towers.find((t) => t.id === towerId);
      if (!target || target.level >= 3) return;
      const cost = TOWER_DEFS[target.type].upgradeCosts[target.level - 1];
      if (gold < cost) return;

      setGold((g) => g - cost);
      setTowers((prev) =>
        prev.map((t) =>
          t.id === towerId
            ? {
                ...t,
                level: (t.level + 1) as 1 | 2 | 3,
                investedGold: t.investedGold + cost,
              }
            : t
        )
      );
      soundEngine.playUpgrade();
    },
    [towers, gold]
  );

  const handleSellTower = useCallback(
    (towerId: string) => {
      const target = towers.find((t) => t.id === towerId);
      if (!target) return;
      const refund = Math.round(target.investedGold * 0.75);
      setGold((g) => g + refund);
      setTowers((prev) => prev.filter((t) => t.id !== towerId));
      if (relocatingTowerId === towerId) setRelocatingTowerId(null);
      soundEngine.playSell();
    },
    [towers, relocatingTowerId]
  );

  const handleChangeTargeting = useCallback((towerId: string, mode: TargetingMode) => {
    setTowers((prev) => prev.map((t) => (t.id === towerId ? { ...t, targeting: mode } : t)));
  }, []);

  const handleStartRelocate = useCallback(
    (towerId: string) => {
      if (phase === 'COMBAT') return;
      setPlacingTowerType(null);
      setRelocatingTowerId(towerId);
      setMobileInspectorOpen(false);
    },
    [phase]
  );

  const handleClickTile = useCallback(
    (coord: Coord) => {
      const cell = grid[coord.y]?.[coord.x];
      if (!cell) return;

      const existingTower = towers.find((t) => t.x === coord.x && t.y === coord.y);

      if (phase === 'BUILD_PLACE') {
        const isReplantGray = cell.kind === 'GRAY_WALL' && !existingTower;
        if (cell.kind === 'OPEN' || isReplantGray) {
          if (cell.kind === 'OPEN') {
            const check = computeMazePath(grid, mapLayout, coord);
            if (!check.valid) {
              soundEngine.playInvalid();
              return;
            }
          }
          const color = draftQueue[placedTurnCoords.length];
          if (!color) return;

          const nextGrid = cloneGrid(grid);
          nextGrid[coord.y][coord.x] = {
            x: coord.x,
            y: coord.y,
            kind: 'TURN_DRAFT',
            color,
            turnDraftIndex: placedTurnCoords.length,
          };
          const nextEntries: PlacedTurnEntry[] = [
            ...placedTurnCoords,
            { x: coord.x, y: coord.y, previousKind: isReplantGray ? 'GRAY_WALL' : 'OPEN' },
          ];
          setGrid(nextGrid);
          setPlacedTurnCoords(nextEntries);
          soundEngine.playBrickSnap();

          if (nextEntries.length >= BRICKS_PER_TURN) {
            setPhase('BUILD_PICK');
          }
          return;
        }
        setSelectedCoord(coord);
        return;
      }

      if (phase === 'BUILD_PICK') {
        if (cell.kind === 'TURN_DRAFT' && cell.turnDraftIndex !== undefined) {
          handlePickTurnBrick(cell.turnDraftIndex);
          return;
        }
        setSelectedCoord(coord);
        return;
      }

      if (relocatingTowerId && phase !== 'COMBAT') {
        if (isBrickCell(cell) && !existingTower) {
          setTowers((prev) =>
            prev.map((t) =>
              t.id === relocatingTowerId ? { ...t, x: coord.x, y: coord.y } : t
            )
          );
          setRelocatingTowerId(null);
          setSelectedCoord(coord);
          soundEngine.playRelocate();
          return;
        }
        if (existingTower && existingTower.id === relocatingTowerId) {
          setRelocatingTowerId(null);
          return;
        }
        soundEngine.playInvalid();
        return;
      }

      if (placingTowerType && (phase === 'BUILD_MANAGE' || phase === 'COMBAT')) {
        if (isBrickCell(cell) && !existingTower) {
          const def = TOWER_DEFS[placingTowerType];
          if (gold < def.cost) {
            soundEngine.playInvalid();
            return;
          }
          const newTower: Tower = {
            id: nextUid('tw'),
            type: placingTowerType,
            level: 1,
            x: coord.x,
            y: coord.y,
            targeting: 'first',
            angle: 0,
            cooldown: 0,
            recoil: 0,
            muzzleFlash: 0,
            totalDamage: 0,
            kills: 0,
            investedGold: def.cost,
          };
          setGold((g) => g - def.cost);
          setTowers((prev) => [...prev, newTower]);
          setSelectedCoord(coord);
          setPlacingTowerType(null);
          soundEngine.playPlaceTower();
          return;
        }
      }

      setSelectedCoord(coord);
      if (existingTower || isBrickCell(cell)) {
        setMobileInspectorOpen(true);
      } else {
        setMobileInspectorOpen(false);
      }
    },
    [
      grid,
      towers,
      phase,
      mapLayout,
      draftQueue,
      placedTurnCoords,
      relocatingTowerId,
      placingTowerType,
      gold,
      handlePickTurnBrick,
    ]
  );

  const handleCancelInteraction = useCallback(() => {
    setPlacingTowerType(null);
    setRelocatingTowerId(null);
  }, []);

  const handleToggleMute = useCallback(() => {
    const next = !soundEngine.isMuted();
    soundEngine.setMuted(next);
    setMuted(next);
  }, []);

  const handleContinueEndless = useCallback(() => {
    simRef.current.matchEnded = false;
    setOutcomeSummary(null);
    setEndlessMode(true);
    setWave((w) => w + 1);
    setDraftQueue(rollFourBricks());
    setPlacedTurnCoords([]);
    setPhase('BUILD_PLACE');
  }, []);

  const handlePlayAgain = useCallback(() => {
    const freshGrid = createInitialGrid(mapLayout);
    const freshPath = computeMazePath(freshGrid, mapLayout);
    simRef.current = {
      creeps: [],
      projectiles: [],
      beams: [],
      impactRings: [],
      particles: [],
      floatingTexts: [],
      spawnQueueLeft: 0,
      spawnTimer: 0,
      longestPathSeen: freshPath.length,
      totalKills: 0,
      matchEnded: false,
      lastShotAudioAt: 0,
    };
    setGrid(freshGrid);
    setPhase('BUILD_PLACE');
    setWave(1);
    setEndlessMode(false);
    setLives(diffDef.startingLives);
    setGold(BASE_STARTING_GOLD + perks.bonusStartGold);
    setRerollsRemaining(2 + perks.bonusRerolls);
    setDraftQueue(rollFourBricks());
    setPlacedTurnCoords([]);
    setTowers([]);
    setSelectedCoord(null);
    setMobileInspectorOpen(false);
    setPlacingTowerType(null);
    setRelocatingTowerId(null);
    setCreepsRemainingUi(0);
    setWaveTotalCreepsUi(0);
    setOutcomeSummary(null);
  }, [mapLayout, diffDef.startingLives, perks.bonusRerolls, perks.bonusStartGold]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'Escape') {
        setPlacingTowerType(null);
        setRelocatingTowerId(null);
        setMobileInspectorOpen(false);
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedCoord) {
        handleClearGrayBrick(selectedCoord);
      } else if (e.code === 'Space' && phase === 'BUILD_MANAGE') {
        e.preventDefault();
        handleSendWave();
      } else if (e.key.toLowerCase() === 'r' && phase === 'BUILD_PLACE') {
        handleRerollDraft();
      } else if (e.key.toLowerCase() === 'm' && phase !== 'COMBAT' && selectedCoord) {
        const t = towers.find((tw) => tw.x === selectedCoord.x && tw.y === selectedCoord.y);
        if (t) handleStartRelocate(t.id);
      } else if (phase === 'BUILD_MANAGE' || phase === 'COMBAT') {
        const idx = Number(e.key) - 1;
        if (idx >= 0 && idx < TOWER_LIST.length) {
          handleSelectTowerType(TOWER_LIST[idx]);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    phase,
    selectedCoord,
    towers,
    handleClearGrayBrick,
    handleSendWave,
    handleRerollDraft,
    handleStartRelocate,
    handleSelectTowerType,
  ]);

  const selectedCell = selectedCoord ? grid[selectedCoord.y]?.[selectedCoord.x] ?? null : null;
  const selectedTower = selectedCoord
    ? towers.find((t) => t.x === selectedCoord.x && t.y === selectedCoord.y) ?? null
    : null;

  const bossPreview = useMemo(() => {
    if (wave % 5 !== 0) return null;
    const def = getWaveDefinition(wave, difficulty);
    return { name: def.name, hp: def.hp, count: def.count };
  }, [wave, difficulty]);

  return (
    <TacticalArenaTemplate
      mobileInspectorOpen={mobileInspectorOpen}
      onCloseMobileInspector={() => setMobileInspectorOpen(false)}
      hud={
        <MatchHudBar
          wave={wave}
          difficulty={difficulty}
          endlessMode={endlessMode}
          lives={lives}
          gold={gold}
          pathLength={pathResult.length}
          phase={phase}
          speed={speed}
          muted={muted}
          onChangeSpeed={setSpeed}
          onToggleMute={handleToggleMute}
          onSendWave={handleSendWave}
          onExitToLobby={onExitToLobby}
        />
      }
      stage={
        <MazeCanvasStage
          frameRef={frameRef}
          phase={phase}
          bricksRemaining={BRICKS_PER_TURN - placedTurnCoords.length}
          relocating={Boolean(relocatingTowerId)}
          hoverStatusText={hoverPreview.statusText}
          hoverStatusTone={hoverPreview.tone}
          onHoverTile={setHoverCoord}
          onClickTile={handleClickTile}
          onRightClick={handleCancelInteraction}
          onOpenMobileInspector={() => setMobileInspectorOpen(true)}
          bossPreview={bossPreview}
        />
      }
      inspector={
        <ContextInspectorRail
          grid={grid}
          wave={wave}
          difficulty={difficulty}
          gold={gold}
          phase={phase}
          selectedCell={selectedCell}
          selectedTower={selectedTower}
          relocatingTowerId={relocatingTowerId}
          onUpgradeTower={handleUpgradeTower}
          onStartRelocate={handleStartRelocate}
          onCancelRelocate={() => setRelocatingTowerId(null)}
          onSellTower={handleSellTower}
          onChangeTargeting={handleChangeTargeting}
          onClearGrayBrick={handleClearGrayBrick}
          onCloseMobile={() => setMobileInspectorOpen(false)}
        />
      }
      dock={
        <BuildControlDock
          phase={phase}
          draftQueue={draftQueue}
          placedTurnCoords={placedTurnCoords}
          rerollsRemaining={rerollsRemaining}
          fusionOptions={fusionOptions}
          gold={gold}
          placingTowerType={placingTowerType}
          creepsRemaining={creepsRemainingUi}
          waveTotalCreeps={waveTotalCreepsUi}
          onRerollDraft={handleRerollDraft}
          onUndoLastBrick={handleUndoLastBrick}
          onPickTurnBrick={handlePickTurnBrick}
          onFuseTurnPair={handleFuseTurnPair}
          onSelectTowerType={handleSelectTowerType}
        />
      }
      modal={
        outcomeSummary ? (
          <MatchOutcomeModal
            summary={outcomeSummary}
            onContinueEndless={outcomeSummary.won ? handleContinueEndless : undefined}
            onPlayAgain={handlePlayAgain}
            onReturnLobby={onExitToLobby}
          />
        ) : undefined
      }
    />
  );
};
