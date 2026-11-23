import type {
  BoardThemeId,
  BrickColor,
  Coord,
  DifficultyId,
  MapLayoutId,
  SynergyInfo,
  TowerLevel,
  TowerType,
  WaveDefinition,
  WaveModifier,
} from './types';

export const GRID_COLS = 24;
export const GRID_ROWS = 16;
export const TILE_SIZE = 36;
export const CANVAS_WIDTH = GRID_COLS * TILE_SIZE; // 864
export const CANVAS_HEIGHT = GRID_ROWS * TILE_SIZE; // 576

export const MAX_WAVES = 30;
export const STARTING_LIVES = 20;
export const BASE_STARTING_GOLD = 105;
export const BRICKS_PER_TURN = 4;
export const CLEAR_GRAY_BRICK_COST = 10;

export interface DifficultyDefinition {
  id: DifficultyId;
  label: string;
  tagline: string;
  startingLives: number;
  hpMult: number;
  speedMult: number;
  armorBonus: number;
  xpMult: number;
}

export const DIFFICULTY_LIST: DifficultyId[] = ['standard', 'hard', 'brutal'];

export const DIFFICULTY_DEFS: Record<DifficultyId, DifficultyDefinition> = {
  standard: {
    id: 'standard',
    label: 'Standard',
    tagline: '20 lives · Balanced 30-wave pace',
    startingLives: 20,
    // Tuned with `npm run balance` (Nov 2026): the strong bot wins about 70% on
    // Standard, 35-40% on Hard and well under 10% on Brutal, across all three maps.
    hpMult: 1.5,
    speedMult: 1.0,
    armorBonus: 0,
    xpMult: 1.0,
  },
  hard: {
    id: 'hard',
    label: 'Hard',
    tagline: '15 lives · +10% HP · Faster waves · +35% XP',
    startingLives: 15,
    hpMult: 1.65,
    speedMult: 1.08,
    armorBonus: 0.05,
    xpMult: 1.35,
  },
  brutal: {
    id: 'brutal',
    label: 'Brutal',
    tagline: '10 lives · +20% HP · Heavy armor · +75% XP',
    startingLives: 10,
    hpMult: 1.8,
    speedMult: 1.15,
    armorBonus: 0.1,
    xpMult: 1.75,
  },
};

/** Rules colour of each element. Names, emblems and rule text live in the World (game/worlds). */
export interface BrickColorMeta {
  id: BrickColor;
  hex: string;
  lightHex: string;
  darkHex: string;
}

export const BRICK_COLOR_LIST: BrickColor[] = ['yellow', 'red', 'green'];

export const BRICK_COLORS: Record<BrickColor, BrickColorMeta> = {
  yellow: {
    id: 'yellow',
    hex: '#F59E0B',
    lightHex: '#FEF08A',
    darkHex: '#B45309',
  },
  red: {
    id: 'red',
    hex: '#EF4444',
    lightHex: '#FCA5A5',
    darkHex: '#991B1B',
  },
  green: {
    id: 'green',
    hex: '#10B981',
    lightHex: '#6EE7B7',
    darkHex: '#047857',
  },
};

export const SYNERGY_CATALOG: Record<SynergyInfo['id'], SynergyInfo> = {
  plasma: {
    id: 'plasma',
    colors: ['red', 'yellow'],
  },
  wildfire: {
    id: 'wildfire',
    colors: ['red', 'green'],
  },
  static_venom: {
    id: 'static_venom',
    colors: ['yellow', 'green'],
  },
  overcharge: {
    id: 'overcharge',
    colors: ['yellow', 'yellow'],
  },
};

/** Tower rules. Names and descriptions live in the World (game/worlds). */
export interface TowerDefinition {
  type: TowerType;
  shortRole: string;
  cost: number;
  /** Cost to reach tier 2, tier 3 and Elite (tier 4). */
  upgradeCosts: [number, number, number];
  baseDamage: number;
  baseRange: number;
  baseFireRate: number;
  projectileSpeed: number;
  baseSplashRadius: number;
  armorPierce: boolean;
  hotkey: string;
}

/** Shop, tile menu and number keys all follow this order: TOWER_LIST[i] has hotkey i + 1. */
export const TOWER_LIST: TowerType[] = ['repeater', 'cannon', 'pulse', 'sniper'];

export const TOWER_DEFS: Record<TowerType, TowerDefinition> = {
  repeater: {
    type: 'repeater',
    shortRole: 'Twin Rapid',
    cost: 45,
    upgradeCosts: [65, 125, 750],
    baseDamage: 14,
    baseRange: 3.2,
    baseFireRate: 2.35,
    projectileSpeed: 640,
    baseSplashRadius: 0,
    armorPierce: false,
    hotkey: '1',
  },
  cannon: {
    type: 'cannon',
    shortRole: 'Arcing Blast',
    cost: 65,
    upgradeCosts: [90, 165, 1000],
    baseDamage: 38,
    baseRange: 4.1,
    baseFireRate: 0.72,
    projectileSpeed: 310,
    baseSplashRadius: 60,
    armorPierce: false,
    hotkey: '2',
  },
  pulse: {
    type: 'pulse',
    shortRole: 'Nova Ring',
    cost: 75,
    upgradeCosts: [100, 180, 1080],
    baseDamage: 24,
    baseRange: 2.35,
    baseFireRate: 0.95,
    projectileSpeed: 999,
    baseSplashRadius: 0,
    armorPierce: false,
    hotkey: '3',
  },
  sniper: {
    type: 'sniper',
    shortRole: 'Armor Pierce',
    cost: 85,
    upgradeCosts: [115, 210, 1260],
    baseDamage: 62,
    baseRange: 5.4,
    baseFireRate: 0.62,
    projectileSpeed: 999,
    baseSplashRadius: 0,
    armorPierce: true,
    hotkey: '4',
  },
};

/** Map geometry. Map names and descriptions live in the World (game/worlds). */
export interface MapLayoutDefinition {
  id: MapLayoutId;
  difficulty: string;
  start: Coord;
  cp1: Coord;
  cp2: Coord;
  cp3: Coord;
  exit: Coord;
  presetWalls: Coord[];
}

export const MAP_LAYOUTS: Record<MapLayoutId, MapLayoutDefinition> = {
  crossroad: {
    id: 'crossroad',
    difficulty: 'Balanced',
    start: { x: 1, y: 2 },
    cp1: { x: 21, y: 2 },
    cp2: { x: 2, y: 13 },
    cp3: { x: 21, y: 13 },
    exit: { x: 22, y: 8 },
    presetWalls: [],
  },
  twin_choke: {
    id: 'twin_choke',
    difficulty: 'Tactical',
    start: { x: 0, y: 7 },
    cp1: { x: 11, y: 1 },
    cp2: { x: 11, y: 14 },
    cp3: { x: 18, y: 7 },
    exit: { x: 23, y: 7 },
    presetWalls: [
      { x: 7, y: 6 },
      { x: 7, y: 7 },
      { x: 7, y: 8 },
      { x: 15, y: 6 },
      { x: 15, y: 7 },
      { x: 15, y: 8 },
    ],
  },
  spiral_vault: {
    id: 'spiral_vault',
    difficulty: 'Master',
    start: { x: 1, y: 1 },
    cp1: { x: 22, y: 1 },
    cp2: { x: 22, y: 14 },
    cp3: { x: 1, y: 14 },
    exit: { x: 12, y: 8 },
    presetWalls: [
      { x: 11, y: 6 },
      { x: 12, y: 6 },
      { x: 13, y: 6 },
    ],
  },
};

/**
 * Board slots, unlocked by profile level. What a slot looks like (name, floor, colours)
 * comes from the active World's `boards`.
 */
export interface BoardThemeDefinition {
  id: BoardThemeId;
  unlockLevel: number;
}

export const BOARD_THEMES: Record<BoardThemeId, BoardThemeDefinition> = {
  toybox_slate: { id: 'toybox_slate', unlockLevel: 1 },
  midnight_workshop: { id: 'midnight_workshop', unlockLevel: 2 },
  retro_handheld: { id: 'retro_handheld', unlockLevel: 4 },
  volcanic_forge: { id: 'volcanic_forge', unlockLevel: 6 },
};

// --- Tower tiers -----------------------------------------------------------
export const MAX_TOWER_LEVEL: TowerLevel = 4;
export const ELITE_LEVEL: TowerLevel = 4;
/** Elite towers are a late-game gold sink: expensive, and only this many at once. */
export const MAX_ELITE_TOWERS = 2;

/** Base stat multipliers per tier. Elite also amplifies its brick's element (ELITE_AMPLIFY). */
export const TOWER_LEVEL_SCALES: Record<TowerLevel, { damage: number; fireRate: number; range: number }> = {
  1: { damage: 1, fireRate: 1, range: 1 },
  2: { damage: 1.6, fireRate: 1.15, range: 1.1 },
  3: { damage: 2.4, fireRate: 1.32, range: 1.2 },
  4: { damage: 3.2, fireRate: 1.45, range: 1.3 },
};

/**
 * What Elite does to the tower's existing abilities: the bonuses its brick gives are
 * stronger, it gains extra lightning jumps if it already chains, and crits more.
 * It never adds an ability the tower did not have.
 */
export const ELITE_AMPLIFY = {
  /** Multiplies the elemental part of damage, fire rate, splash, burn and poison. */
  elementPower: 1.5,
  /** Extra chain jumps, only if the tower already chains. */
  extraChains: 2,
  /** Added to slow, only if the tower already slows (capped at 75%). */
  extraSlow: 0.1,
  extraCrit: 0.1,
};

// --- Wave specials -------------------------------------------------------
/**
 * Rally waves: each kill makes every remaining creep of the wave this much tougher.
 * The bonus adds up (it does not compound) and stops at RALLY_MAX_BONUS, so big
 * swarm waves are not punished far harder than small ones.
 */
export const RALLY_TOUGHNESS_PER_KILL = 0.02;
export const RALLY_MAX_BONUS = 0.4;
/** Escort heroes: health and bounty multiplier versus a normal creep of the wave. */
export const HERO_HP_MULT = 2.5;
export const HERO_BOUNTY_MULT = 3;
/** Lives lost when a hero reaches the exit (normal 1, boss 3). */
export const HERO_LIVES_COST = 2;
/** While the vanguard lives, the rest of its wave moves this much faster. */
export const VANGUARD_SPEED_BONUS = 0.15;
/** While the warden lives, the rest of its wave heals this share of max HP per second. */
export const WARDEN_REGEN_PER_SEC = 0.015;

/**
 * Which special a wave carries. Boss waves (every 5th) have none; otherwise every
 * 3rd wave is a rally wave, and from wave 4 the waves in between get an escort,
 * except armored waves: they are the tankiest type already, so heroes never stack on them.
 */
export function getWaveModifier(wave: number): WaveModifier | undefined {
  if (wave % 5 === 0) return undefined;
  if (wave % 3 === 0) return 'rally';
  const isArmoredWave = (wave - 1) % 5 === 2;
  if (wave >= 4 && wave % 3 === 1 && !isArmoredWave) return 'escort';
  return undefined;
}

export function getWaveDefinition(
  wave: number,
  difficulty: DifficultyId = 'standard'
): WaveDefinition {
  const base = baseWaveDefinition(wave, difficulty);
  const modifier = getWaveModifier(wave);
  return modifier ? { ...base, modifier } : base;
}

// Rebalanced tougher wave curve scaled by selected difficulty
function baseWaveDefinition(
  wave: number,
  difficulty: DifficultyId = 'standard'
): WaveDefinition {
  const diff = DIFFICULTY_DEFS[difficulty];
  const isBoss = wave % 5 === 0;
  const patternIndex = (wave - 1) % 5;

  const baseHp = Math.round(78 * Math.pow(1.265, wave - 1) * diff.hpMult);
  const baseBounty = Math.max(4, Math.round(5 + wave * 0.65));
  const clearBonus = Math.round(24 + wave * 4.5);

  const scaleSpeed = (spd: number) => Number((spd * diff.speedMult).toFixed(2));
  const scaleArmor = (arm: number) => Math.min(0.65, arm + diff.armorBonus);

  if (isBoss) {
    return {
      wave,
      trait: 'boss',
      count: wave >= 25 ? 2 : 1,
      hp: Math.round(baseHp * 13.5),
      speed: scaleSpeed(1.25 + Math.min(0.45, wave * 0.012)),
      armor: scaleArmor(Math.min(0.48, 0.18 + wave * 0.008)),
      bounty: Math.round(baseBounty * 8),
      spawnInterval: 2.2,
      clearBonus: clearBonus + 30,
    };
  }

  switch (patternIndex) {
    case 0:
      return {
        wave,
        trait: 'normal',
        count: 12 + Math.min(16, Math.floor(wave * 0.55)),
        hp: baseHp,
        speed: scaleSpeed(1.9 + Math.min(0.65, wave * 0.016)),
        armor: scaleArmor(wave >= 6 ? 0.08 : 0),
        bounty: baseBounty,
        spawnInterval: 0.65,
        clearBonus,
      };
    case 1:
      return {
        wave,
        trait: 'swarm',
        count: 20 + Math.min(18, Math.floor(wave * 0.7)),
        hp: Math.round(baseHp * 0.68),
        speed: scaleSpeed(2.15 + Math.min(0.65, wave * 0.016)),
        armor: scaleArmor(0),
        bounty: Math.max(3, Math.round(baseBounty * 0.6)),
        spawnInterval: 0.38,
        clearBonus,
      };
    case 2:
      return {
        wave,
        trait: 'armored',
        count: 10 + Math.min(12, Math.floor(wave * 0.45)),
        hp: Math.round(baseHp * 1.55),
        speed: scaleSpeed(1.5 + Math.min(0.45, wave * 0.012)),
        armor: scaleArmor(Math.min(0.55, 0.28 + wave * 0.008)),
        bounty: Math.round(baseBounty * 1.2),
        spawnInterval: 0.85,
        clearBonus,
      };
    case 3:
      return {
        wave,
        trait: 'swift',
        count: 14 + Math.min(14, Math.floor(wave * 0.5)),
        hp: Math.round(baseHp * 0.92),
        speed: scaleSpeed(2.65 + Math.min(0.75, wave * 0.018)),
        armor: scaleArmor(0.08),
        bounty: baseBounty,
        spawnInterval: 0.52,
        clearBonus,
      };
    default:
      return {
        wave,
        trait: 'regen',
        count: 11 + Math.min(13, Math.floor(wave * 0.45)),
        hp: Math.round(baseHp * 1.38),
        speed: scaleSpeed(1.75 + Math.min(0.5, wave * 0.014)),
        armor: scaleArmor(0.12),
        bounty: Math.round(baseBounty * 1.15),
        spawnInterval: 0.74,
        clearBonus,
      };
  }
}

export function getXpForNextLevel(level: number): number {
  return Math.round(150 * Math.pow(1.28, level - 1));
}

export function getProfilePerks(level: number): {
  bonusRerolls: number;
  bonusStartGold: number;
  perkSummary: string[];
} {
  const bonusRerolls = level >= 3 ? (level >= 8 ? 2 : 1) : 0;
  const bonusStartGold = level >= 5 ? (level >= 10 ? 20 : 10) : 0;
  const perkSummary: string[] = [];
  if (bonusRerolls > 0) perkSummary.push(`+${bonusRerolls} Reroll${bonusRerolls > 1 ? 's' : ''}`);
  if (bonusStartGold > 0) perkSummary.push(`+${bonusStartGold}g Start`);
  if (perkSummary.length === 0) perkSummary.push('Rank 3 unlocks +1 Reroll');
  return { bonusRerolls, bonusStartGold, perkSummary };
}
