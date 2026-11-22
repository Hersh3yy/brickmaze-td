// Match controller: owns the state of one run, drives the simulation every frame
// and exposes the player actions. This is the Vue counterpart of the React
// ArenaMatchPage; the combat maths itself lives in game/domain/simulation.ts.
//
// Performance note: grid, towers and the sim arrays are deliberately NOT deeply
// reactive (shallowRef / plain objects). The simulation mutates creeps and towers
// 60 times a second, and deep reactivity there would cost a proxy hit per field.
// State changes the UI must see replace the whole array instead.

import {
  BASE_STARTING_GOLD,
  BRICKS_PER_TURN,
  BRICK_COLOR_LIST,
  CLEAR_GRAY_BRICK_COST,
  DIFFICULTY_DEFS,
  TOWER_DEFS,
  TOWER_LIST,
  getProfilePerks,
  getWaveDefinition,
} from '~/game/domain/constants';
import { soundEngine } from '~/game/domain/audio';
import { computeMazePath, createInitialGrid, isBrickCell } from '~/game/domain/pathfinding';
import {
  beginWave,
  createSimState,
  defaultTargetingFor,
  nextUid,
  resetSimState,
  stepSimulation,
} from '~/game/domain/simulation';
import type { SimEvents, SimWorld } from '~/game/domain/simulation';
import { computeBoardSynergyLinks, findFusionOptionsForBrick } from '~/game/domain/synergy';
import type {
  BrickColor,
  Coord,
  DifficultyId,
  GamePhase,
  GridCell,
  MapLayoutId,
  MatchSummary,
  PlacedTurnEntry,
  PlayerProfile,
  TargetingMode,
  Tower,
  TowerType,
  TurnFusionOption,
} from '~/game/domain/types';
import type { RenderFrameInput } from '~/game/engine/pixelRenderer';

export interface ArenaMatchOptions {
  profile: Ref<PlayerProfile>;
  mapLayout: MapLayoutId;
  difficulty: DifficultyId;
  recordMatchEnd: (result: {
    won: boolean;
    difficulty: DifficultyId;
    wavesCleared: number;
    longestPath: number;
    synergiesCount: number;
    creepsDefeated: number;
  }) => Promise<MatchSummary>;
}

export type HoverTone = 'neutral' | 'good' | 'info' | 'bad';

function rollFourBricks(): BrickColor[] {
  const hand: BrickColor[] = [];
  for (let i = 0; i < BRICKS_PER_TURN; i++) {
    hand.push(BRICK_COLOR_LIST[Math.floor(Math.random() * BRICK_COLOR_LIST.length)]!);
  }
  return hand;
}

function cloneGrid(grid: GridCell[][]): GridCell[][] {
  return grid.map((row) => row.map((cell) => ({ ...cell })));
}

export function useArenaMatch(opts: ArenaMatchOptions) {
  const { profile, mapLayout, difficulty } = opts;
  const diffDef = DIFFICULTY_DEFS[difficulty];
  const perks = computed(() => getProfilePerks(profile.value.level));

  const grid = shallowRef<GridCell[][]>(createInitialGrid(mapLayout));
  const phase = ref<GamePhase>('BUILD_PLACE');
  const wave = ref(1);
  const endlessMode = ref(false);
  const lives = ref(diffDef.startingLives);
  const gold = ref(BASE_STARTING_GOLD + perks.value.bonusStartGold);
  const rerollsRemaining = ref(2 + perks.value.bonusRerolls);
  const draftQueue = shallowRef<BrickColor[]>(rollFourBricks());
  const placedTurnCoords = shallowRef<PlacedTurnEntry[]>([]);
  /** In BUILD_PICK: the draft brick the player is looking at (index into placedTurnCoords). */
  const pickIndex = ref<number | null>(null);
  const towers = shallowRef<Tower[]>([]);
  const selectedCoord = shallowRef<Coord | null>(null);
  const mobileInspectorOpen = ref(false);
  const placingTowerType = ref<TowerType | null>(null);
  const relocatingTowerId = ref<string | null>(null);
  const speed = ref<1 | 2 | 3>(1);
  const muted = ref(soundEngine.isMuted());
  const hoverCoord = shallowRef<Coord | null>(null);
  const creepsRemainingUi = ref(0);
  const waveTotalCreepsUi = ref(0);
  const outcomeSummary = shallowRef<MatchSummary | null>(null);

  const pathResult = computed(() => computeMazePath(grid.value, mapLayout));
  const synergyLinks = computed(() => computeBoardSynergyLinks(grid.value));
  /** Fusions that would keep the currently selected draft brick as the Master brick. */
  const fusionOptions = computed(() =>
    phase.value === 'BUILD_PICK' && pickIndex.value !== null
      ? findFusionOptionsForBrick(grid.value, placedTurnCoords.value, pickIndex.value)
      : []
  );

  const hoverPreview = computed<{
    valid: boolean;
    path: Coord[] | null;
    statusText: string | null;
    tone: HoverTone;
  }>(() => {
    const hover = hoverCoord.value;
    if (phase.value !== 'BUILD_PLACE' || !hover) {
      return { valid: true, path: null, statusText: null, tone: 'neutral' };
    }

    const cell = grid.value[hover.y]?.[hover.x];
    if (!cell) return { valid: false, path: null, statusText: null, tone: 'neutral' };

    const occupied = towers.value.some((t) => t.x === hover.x && t.y === hover.y);

    if (cell.kind === 'GRAY_WALL' && !occupied) {
      return { valid: true, path: null, statusText: 'Replant Gray Wall (Free)', tone: 'info' };
    }

    if (cell.kind !== 'OPEN') {
      return { valid: false, path: null, statusText: null, tone: 'neutral' };
    }

    const res = computeMazePath(grid.value, mapLayout, hover);
    if (!res.valid) {
      return {
        valid: false,
        path: null,
        statusText: `Blocked: ${res.blockedSegment ?? 'Path'}`,
        tone: 'bad',
      };
    }

    const delta = res.length - pathResult.value.length;
    return {
      valid: true,
      path: res.path,
      statusText: delta > 0 ? `+${delta} path tiles` : 'Path unchanged',
      tone: delta > 0 ? 'good' : 'neutral',
    };
  });

  const selectedCell = computed(() => {
    const c = selectedCoord.value;
    return c ? grid.value[c.y]?.[c.x] ?? null : null;
  });
  const selectedTower = computed(() => {
    const c = selectedCoord.value;
    return c ? towers.value.find((t) => t.x === c.x && t.y === c.y) ?? null : null;
  });
  const bossPreview = computed(() => {
    if (wave.value % 5 !== 0) return null;
    const def = getWaveDefinition(wave.value, difficulty);
    return { name: def.name, hp: def.hp, count: def.count };
  });

  // --- Simulation + render frame (plain objects, mutated in place every frame) ---

  const sim = createSimState(pathResult.value.length);

  watch(
    pathResult,
    (p) => {
      if (p.length > sim.longestPathSeen) sim.longestPathSeen = p.length;
    },
    { immediate: true }
  );

  const frame: RenderFrameInput = {
    grid: grid.value,
    themeId: profile.value.selectedTheme,
    phase: phase.value,
    path: pathResult.value.path,
    previewPath: null,
    previewValid: true,
    hoverCoord: null,
    nextDraftColor: draftQueue.value[0] ?? null,
    placedTurnCoords: placedTurnCoords.value,
    synergyLinks: synergyLinks.value,
    towers: towers.value,
    selectedCoord: selectedCoord.value,
    relocatingTowerId: relocatingTowerId.value,
    placingTowerType: placingTowerType.value,
    creeps: sim.creeps,
    projectiles: sim.projectiles,
    beams: sim.beams,
    impactRings: sim.impactRings,
    particles: sim.particles,
    floatingTexts: sim.floatingTexts,
    camera: { zoom: 1, panX: 0, panY: 0 },
    nowSec: 0,
  };

  // Copies UI state into the frame the canvas renderer reads. It runs once per batch
  // of state changes (before the next repaint), not once per animation frame.
  watchEffect(() => {
    frame.grid = grid.value;
    frame.themeId = profile.value.selectedTheme;
    frame.phase = phase.value;
    frame.path = pathResult.value.path;
    frame.previewPath = hoverPreview.value.path;
    frame.previewValid = hoverPreview.value.valid;
    frame.hoverCoord = hoverCoord.value;
    frame.nextDraftColor =
      phase.value === 'BUILD_PLACE'
        ? draftQueue.value[placedTurnCoords.value.length] ?? null
        : null;
    frame.placedTurnCoords = placedTurnCoords.value;
    frame.synergyLinks = synergyLinks.value;
    frame.towers = towers.value;
    frame.selectedCoord = selectedCoord.value;
    frame.relocatingTowerId = relocatingTowerId.value;
    frame.placingTowerType = placingTowerType.value;
  });

  async function finishMatch(won: boolean, wavesCleared: number) {
    if (sim.matchEnded) return;
    sim.matchEnded = true;
    phase.value = won ? 'VICTORY' : 'GAME_OVER';
    if (won) soundEngine.playVictory();
    else soundEngine.playDefeat();

    outcomeSummary.value = await opts.recordMatchEnd({
      won,
      difficulty,
      wavesCleared,
      longestPath: sim.longestPathSeen,
      synergiesCount: synergyLinks.value.length,
      creepsDefeated: sim.totalKills,
    });
  }

  const simEvents: SimEvents = {
    shoot: (pitch) => soundEngine.playShoot(pitch),
    lifeLost: () => soundEngine.playLifeLost(),
    defeat: (wavesCleared) => {
      void finishMatch(false, wavesCleared);
    },
    waveCleared: (clearedWave, _clearBonus, final) => {
      creepsRemainingUi.value = 0;
      if (final) {
        void finishMatch(true, clearedWave);
        return;
      }
      wave.value += 1;
      draftQueue.value = rollFourBricks();
      placedTurnCoords.value = [];
      placingTowerType.value = null;
      relocatingTowerId.value = null;
      phase.value = 'BUILD_PLACE';
    },
  };

  // One world object reused across frames, refreshed from the refs before each step.
  const world: SimWorld = {
    grid: grid.value,
    phase: phase.value,
    wave: wave.value,
    difficulty,
    endlessMode: endlessMode.value,
    lives: lives.value,
    gold: gold.value,
    towers: towers.value,
    path: pathResult.value.path,
    speed: speed.value,
  };

  let rafId = 0;
  let lastTime = 0;
  let uiSyncAccum = 0;

  function tick(now: number) {
    const rawDt = Math.min(0.05, Math.max(0, (now - lastTime) / 1000));
    lastTime = now;

    world.grid = grid.value;
    world.phase = phase.value;
    world.wave = wave.value;
    world.endlessMode = endlessMode.value;
    world.lives = lives.value;
    world.gold = gold.value;
    world.towers = towers.value;
    world.path = pathResult.value.path;
    world.speed = speed.value;

    const inCombat = world.phase === 'COMBAT';
    stepSimulation(sim, world, rawDt, now, simEvents);

    if (world.gold !== gold.value) gold.value = world.gold;
    if (world.lives !== lives.value) lives.value = world.lives;

    if (inCombat && phase.value === 'COMBAT') {
      uiSyncAccum += rawDt;
      if (uiSyncAccum >= 0.12) {
        uiSyncAccum = 0;
        creepsRemainingUi.value = sim.spawnQueueLeft + sim.creeps.length;
      }
    }

    rafId = requestAnimationFrame(tick);
  }

  // --- Player actions ---

  function rerollDraft() {
    if (
      phase.value !== 'BUILD_PLACE' ||
      placedTurnCoords.value.length > 0 ||
      rerollsRemaining.value <= 0
    ) {
      return;
    }
    rerollsRemaining.value -= 1;
    draftQueue.value = rollFourBricks();
    soundEngine.playBrickSnap();
  }

  function undoLastBrick() {
    const placed = placedTurnCoords.value;
    if ((phase.value !== 'BUILD_PLACE' && phase.value !== 'BUILD_PICK') || placed.length === 0) {
      return;
    }
    const last = placed[placed.length - 1]!;
    const nextGrid = cloneGrid(grid.value);
    nextGrid[last.y]![last.x] = { x: last.x, y: last.y, kind: last.previousKind };
    grid.value = nextGrid;
    placedTurnCoords.value = placed.slice(0, -1);
    pickIndex.value = null;
    if (phase.value === 'BUILD_PICK') phase.value = 'BUILD_PLACE';
    soundEngine.playSell();
  }

  /** Ends the draft: `keepIndex` stays (optionally fused), the other bricks harden to gray. */
  function resolveDraft(keepIndex: number, fuse?: TurnFusionOption) {
    const placed = placedTurnCoords.value;
    const keepEntry = placed[keepIndex];
    if (!keepEntry) return false;

    const nextGrid = cloneGrid(grid.value);
    placed.forEach((entry, idx) => {
      const cell = nextGrid[entry.y]![entry.x]!;
      cell.turnDraftIndex = undefined;
      if (idx === keepIndex) {
        if (fuse) {
          cell.kind = 'MASTER_BRICK';
          cell.color = fuse.colors[0];
          cell.secondaryColor = fuse.colors[1];
        } else {
          cell.kind = 'ACTIVE_BRICK';
        }
      } else {
        cell.kind = 'GRAY_WALL';
        cell.color = undefined;
        cell.secondaryColor = undefined;
      }
    });

    grid.value = nextGrid;
    placedTurnCoords.value = [];
    pickIndex.value = null;
    selectedCoord.value = { x: keepEntry.x, y: keepEntry.y };
    phase.value = 'BUILD_MANAGE';
    return true;
  }

  /** BUILD_PICK step 1: look at one draft brick. Nothing is decided until keep or fuse. */
  function selectDraftBrick(index: number) {
    if (phase.value !== 'BUILD_PICK') return;
    const entry = placedTurnCoords.value[index];
    if (!entry) return;
    pickIndex.value = index;
    selectedCoord.value = { x: entry.x, y: entry.y };
    soundEngine.playBrickSnap();
  }

  /** BUILD_PICK step 2a: keep the selected brick as a single-colour brick. */
  function keepSelectedBrick() {
    if (phase.value !== 'BUILD_PICK' || pickIndex.value === null) return;
    if (resolveDraft(pickIndex.value)) soundEngine.playKeepBrick();
  }

  /** BUILD_PICK step 2b: fuse a partner into the selected brick, which stays where it is. */
  function fuseTurnPair(option: TurnFusionOption) {
    if (phase.value !== 'BUILD_PICK') return;
    if (resolveDraft(option.anchorIndex, option)) soundEngine.playFuseMaster();
  }

  function clearGrayBrick(coord: Coord) {
    if (
      phase.value === 'VICTORY' ||
      phase.value === 'GAME_OVER' ||
      gold.value < CLEAR_GRAY_BRICK_COST
    ) {
      return;
    }
    const cell = grid.value[coord.y]?.[coord.x];
    if (!cell || cell.kind !== 'GRAY_WALL') return;
    if (towers.value.some((t) => t.x === coord.x && t.y === coord.y)) return;

    const nextGrid = cloneGrid(grid.value);
    nextGrid[coord.y]![coord.x] = { x: coord.x, y: coord.y, kind: 'OPEN' };
    grid.value = nextGrid;
    gold.value -= CLEAR_GRAY_BRICK_COST;
    selectedCoord.value = null;
    mobileInspectorOpen.value = false;
    soundEngine.playSell();
  }

  function sendWave() {
    if (phase.value !== 'BUILD_MANAGE') return;
    const count = beginWave(sim, wave.value, difficulty);
    waveTotalCreepsUi.value = count;
    creepsRemainingUi.value = count;
    relocatingTowerId.value = null;
    mobileInspectorOpen.value = false;
    phase.value = 'COMBAT';
    soundEngine.playWaveStart();
  }

  function selectTowerType(type: TowerType) {
    relocatingTowerId.value = null;
    placingTowerType.value = placingTowerType.value === type ? null : type;
  }

  /** Mounts a new weapon on a brick or gray wall. Returns false when it cannot. */
  function placeTowerAt(coord: Coord, type: TowerType): boolean {
    if (phase.value !== 'BUILD_MANAGE' && phase.value !== 'COMBAT') return false;
    const cell = grid.value[coord.y]?.[coord.x];
    if (!cell || !isBrickCell(cell)) return false;
    if (towers.value.some((t) => t.x === coord.x && t.y === coord.y)) return false;

    const def = TOWER_DEFS[type];
    if (gold.value < def.cost) {
      soundEngine.playInvalid();
      return false;
    }

    const newTower: Tower = {
      id: nextUid('tw'),
      type,
      level: 1,
      x: coord.x,
      y: coord.y,
      targeting: defaultTargetingFor(grid.value, coord.x, coord.y),
      angle: 0,
      cooldown: 0,
      recoil: 0,
      muzzleFlash: 0,
      totalDamage: 0,
      kills: 0,
      investedGold: def.cost,
    };
    gold.value -= def.cost;
    towers.value = [...towers.value, newTower];
    selectedCoord.value = { x: coord.x, y: coord.y };
    placingTowerType.value = null;
    soundEngine.playPlaceTower();
    return true;
  }

  /** Used by the inspector's "mount a weapon" buttons for the selected brick. */
  function placeTowerOnSelected(type: TowerType) {
    const coord = selectedCoord.value;
    if (coord) placeTowerAt(coord, type);
  }

  function upgradeTower(towerId: string) {
    const target = towers.value.find((t) => t.id === towerId);
    if (!target || target.level >= 3) return;
    const cost = TOWER_DEFS[target.type].upgradeCosts[target.level - 1]!;
    if (gold.value < cost) return;

    gold.value -= cost;
    towers.value = towers.value.map((t) =>
      t.id === towerId
        ? { ...t, level: (t.level + 1) as 1 | 2 | 3, investedGold: t.investedGold + cost }
        : t
    );
    soundEngine.playUpgrade();
  }

  function sellTower(towerId: string) {
    const target = towers.value.find((t) => t.id === towerId);
    if (!target) return;
    gold.value += Math.round(target.investedGold * 0.75);
    towers.value = towers.value.filter((t) => t.id !== towerId);
    if (relocatingTowerId.value === towerId) relocatingTowerId.value = null;
    soundEngine.playSell();
  }

  function changeTargeting(towerId: string, mode: TargetingMode) {
    towers.value = towers.value.map((t) => (t.id === towerId ? { ...t, targeting: mode } : t));
  }

  function startRelocate(towerId: string) {
    if (phase.value === 'COMBAT') return;
    placingTowerType.value = null;
    relocatingTowerId.value = towerId;
    mobileInspectorOpen.value = false;
  }

  function cancelRelocate() {
    relocatingTowerId.value = null;
  }

  function clickTile(coord: Coord) {
    const cell = grid.value[coord.y]?.[coord.x];
    if (!cell) return;

    const existingTower = towers.value.find((t) => t.x === coord.x && t.y === coord.y);

    if (phase.value === 'BUILD_PLACE') {
      const isReplantGray = cell.kind === 'GRAY_WALL' && !existingTower;
      if (cell.kind === 'OPEN' || isReplantGray) {
        if (cell.kind === 'OPEN') {
          const check = computeMazePath(grid.value, mapLayout, coord);
          if (!check.valid) {
            soundEngine.playInvalid();
            return;
          }
        }
        const placed = placedTurnCoords.value;
        const color = draftQueue.value[placed.length];
        if (!color) return;

        const nextGrid = cloneGrid(grid.value);
        nextGrid[coord.y]![coord.x] = {
          x: coord.x,
          y: coord.y,
          kind: 'TURN_DRAFT',
          color,
          turnDraftIndex: placed.length,
        };
        const nextEntries: PlacedTurnEntry[] = [
          ...placed,
          { x: coord.x, y: coord.y, previousKind: isReplantGray ? 'GRAY_WALL' : 'OPEN' },
        ];
        grid.value = nextGrid;
        placedTurnCoords.value = nextEntries;
        soundEngine.playBrickSnap();

        if (nextEntries.length >= BRICKS_PER_TURN) phase.value = 'BUILD_PICK';
        return;
      }
      selectedCoord.value = coord;
      return;
    }

    if (phase.value === 'BUILD_PICK') {
      if (cell.kind === 'TURN_DRAFT' && cell.turnDraftIndex !== undefined) {
        selectDraftBrick(cell.turnDraftIndex);
        return;
      }
      selectedCoord.value = coord;
      return;
    }

    if (relocatingTowerId.value && phase.value !== 'COMBAT') {
      const movingId = relocatingTowerId.value;
      if (isBrickCell(cell) && !existingTower) {
        // A tower still on its default targeting picks up the default of its new tile.
        towers.value = towers.value.map((t) => {
          if (t.id !== movingId) return t;
          const wasDefault = t.targeting === defaultTargetingFor(grid.value, t.x, t.y);
          return {
            ...t,
            x: coord.x,
            y: coord.y,
            targeting: wasDefault ? defaultTargetingFor(grid.value, coord.x, coord.y) : t.targeting,
          };
        });
        relocatingTowerId.value = null;
        selectedCoord.value = coord;
        soundEngine.playRelocate();
        return;
      }
      if (existingTower && existingTower.id === movingId) {
        relocatingTowerId.value = null;
        return;
      }
      soundEngine.playInvalid();
      return;
    }

    const placingType = placingTowerType.value;
    if (placingType && !existingTower && isBrickCell(cell)) {
      if (placeTowerAt(coord, placingType)) return;
    }

    selectedCoord.value = coord;
    mobileInspectorOpen.value = Boolean(existingTower || isBrickCell(cell));
  }

  /** Mouse moves fire per pixel; only a change of tile should recompute the path preview. */
  function hoverTile(coord: Coord | null) {
    const prev = hoverCoord.value;
    if (prev === coord) return;
    if (prev && coord && prev.x === coord.x && prev.y === coord.y) return;
    hoverCoord.value = coord;
  }

  function cancelInteraction() {
    placingTowerType.value = null;
    relocatingTowerId.value = null;
  }

  function toggleMute() {
    const next = !soundEngine.isMuted();
    soundEngine.setMuted(next);
    muted.value = next;
  }

  function setSpeed(s: 1 | 2 | 3) {
    speed.value = s;
  }

  function continueEndless() {
    sim.matchEnded = false;
    outcomeSummary.value = null;
    endlessMode.value = true;
    wave.value += 1;
    draftQueue.value = rollFourBricks();
    placedTurnCoords.value = [];
    phase.value = 'BUILD_PLACE';
  }

  function playAgain() {
    const freshGrid = createInitialGrid(mapLayout);
    resetSimState(sim, computeMazePath(freshGrid, mapLayout).length);
    grid.value = freshGrid;
    phase.value = 'BUILD_PLACE';
    wave.value = 1;
    endlessMode.value = false;
    lives.value = diffDef.startingLives;
    gold.value = BASE_STARTING_GOLD + perks.value.bonusStartGold;
    rerollsRemaining.value = 2 + perks.value.bonusRerolls;
    draftQueue.value = rollFourBricks();
    placedTurnCoords.value = [];
    pickIndex.value = null;
    towers.value = [];
    selectedCoord.value = null;
    mobileInspectorOpen.value = false;
    placingTowerType.value = null;
    relocatingTowerId.value = null;
    creepsRemainingUi.value = 0;
    waveTotalCreepsUi.value = 0;
    outcomeSummary.value = null;
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

    const selected = selectedCoord.value;
    if (e.key === 'Escape') {
      placingTowerType.value = null;
      relocatingTowerId.value = null;
      mobileInspectorOpen.value = false;
    } else if ((e.key === 'Delete' || e.key === 'Backspace') && selected) {
      clearGrayBrick(selected);
    } else if (e.code === 'Space' && phase.value === 'BUILD_MANAGE') {
      e.preventDefault();
      sendWave();
    } else if (e.key.toLowerCase() === 'r' && phase.value === 'BUILD_PLACE') {
      rerollDraft();
    } else if (e.key.toLowerCase() === 'm' && phase.value !== 'COMBAT' && selected) {
      const t = towers.value.find((tw) => tw.x === selected.x && tw.y === selected.y);
      if (t) startRelocate(t.id);
    } else if (phase.value === 'BUILD_PICK') {
      const idx = Number(e.key) - 1;
      if (idx >= 0 && idx < BRICKS_PER_TURN) selectDraftBrick(idx);
      else if (e.key === 'Enter') keepSelectedBrick();
    } else if (phase.value === 'BUILD_MANAGE' || phase.value === 'COMBAT') {
      const type = TOWER_LIST[Number(e.key) - 1];
      if (type) selectTowerType(type);
    }
  }

  onMounted(() => {
    lastTime = performance.now();
    rafId = requestAnimationFrame(tick);
    window.addEventListener('keydown', onKeyDown);
  });

  onBeforeUnmount(() => {
    cancelAnimationFrame(rafId);
    window.removeEventListener('keydown', onKeyDown);
  });

  return {
    // state
    grid,
    phase,
    wave,
    endlessMode,
    lives,
    gold,
    rerollsRemaining,
    draftQueue,
    placedTurnCoords,
    pickIndex,
    towers,
    selectedCoord,
    mobileInspectorOpen,
    placingTowerType,
    relocatingTowerId,
    speed,
    muted,
    creepsRemainingUi,
    waveTotalCreepsUi,
    outcomeSummary,
    // derived
    pathResult,
    fusionOptions,
    hoverPreview,
    selectedCell,
    selectedTower,
    bossPreview,
    // renderer input (plain object, never make this reactive)
    frame,
    // actions
    rerollDraft,
    undoLastBrick,
    selectDraftBrick,
    keepSelectedBrick,
    fuseTurnPair,
    clearGrayBrick,
    sendWave,
    selectTowerType,
    placeTowerOnSelected,
    upgradeTower,
    sellTower,
    changeTargeting,
    startRelocate,
    cancelRelocate,
    clickTile,
    hoverTile,
    cancelInteraction,
    toggleMute,
    setSpeed,
    continueEndless,
    playAgain,
  };
}
