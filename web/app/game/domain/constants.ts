import type {
  BoardThemeId,
  BrickColor,
  Coord,
  DifficultyId,
  MapLayoutId,
  SynergyInfo,
  TowerType,
  WaveDefinition,
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
    hpMult: 1.0,
    speedMult: 1.0,
    armorBonus: 0,
    xpMult: 1.0,
  },
  hard: {
    id: 'hard',
    label: 'Hard',
    tagline: '15 lives · +32% HP · Faster waves · +35% XP',
    startingLives: 15,
    hpMult: 1.32,
    speedMult: 1.08,
    armorBonus: 0.05,
    xpMult: 1.35,
  },
  brutal: {
    id: 'brutal',
    label: 'Brutal',
    tagline: '10 lives · +68% HP · Heavy armor · +75% XP',
    startingLives: 10,
    hpMult: 1.68,
    speedMult: 1.15,
    armorBonus: 0.1,
    xpMult: 1.75,
  },
};

export interface BrickColorMeta {
  id: BrickColor;
  label: string;
  elementName: string;
  glyph: string;
  hex: string;
  lightHex: string;
  darkHex: string;
  bonusShort: string;
  bonusDetail: string;
}

export const BRICK_COLOR_LIST: BrickColor[] = ['yellow', 'red', 'green'];

export const BRICK_COLORS: Record<BrickColor, BrickColorMeta> = {
  yellow: {
    id: 'yellow',
    label: 'Yellow',
    elementName: 'Lightning',
    glyph: '⚡',
    hex: '#F59E0B',
    lightHex: '#FEF08A',
    darkHex: '#B45309',
    bonusShort: 'Lightning · Speed & Chain',
    bonusDetail: '+30% Attack Speed & attacks chain lightning to 2 nearby creeps.',
  },
  red: {
    id: 'red',
    label: 'Red',
    elementName: 'Fire',
    glyph: '🔥',
    hex: '#EF4444',
    lightHex: '#FCA5A5',
    darkHex: '#991B1B',
    bonusShort: 'Fire · Damage & Splash',
    bonusDetail: '+35% Damage & shots detonate in fiery splash damage.',
  },
  green: {
    id: 'green',
    label: 'Green',
    elementName: 'Venom',
    glyph: '☣',
    hex: '#10B981',
    lightHex: '#6EE7B7',
    darkHex: '#047857',
    bonusShort: 'Venom · Slow & DoT',
    bonusDetail: 'Slows targets by 35% & applies stacking corrosive DoT.',
  },
};

export const SYNERGY_CATALOG: Record<string, SynergyInfo> = {
  plasma: {
    id: 'plasma',
    name: 'Plasma',
    colors: ['red', 'yellow'],
    shortEffect: 'Fire Splash + Lightning Chain +20% SPD',
  },
  wildfire: {
    id: 'wildfire',
    name: 'Wildfire',
    colors: ['red', 'green'],
    shortEffect: 'Huge Fire Splash + Armor Shred + Burn',
  },
  static_venom: {
    id: 'static_venom',
    name: 'Static Venom',
    colors: ['yellow', 'green'],
    shortEffect: 'Lightning Chains spread Venom Slow & DoT',
  },
  overcharge: {
    id: 'overcharge',
    name: 'Overcharge',
    colors: ['yellow', 'yellow'],
    shortEffect: 'Same color link: +45% Elemental Power',
  },
};

export interface TowerDefinition {
  type: TowerType;
  name: string;
  shortRole: string;
  description: string;
  cost: number;
  upgradeCosts: [number, number];
  baseDamage: number;
  baseRange: number;
  baseFireRate: number;
  projectileSpeed: number;
  baseSplashRadius: number;
  armorPierce: boolean;
  hotkey: string;
}

export const TOWER_LIST: TowerType[] = ['repeater', 'cannon', 'sniper', 'pulse'];

export const TOWER_DEFS: Record<TowerType, TowerDefinition> = {
  repeater: {
    type: 'repeater',
    name: 'Repeater',
    shortRole: 'Twin Rapid',
    description: 'High fire-rate twin barrels. Rapidly triggers elemental ammo.',
    cost: 45,
    upgradeCosts: [65, 125],
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
    name: 'Cannon',
    shortRole: 'Arcing Blast',
    description: 'Lobs heavy arcing shells with natural area splash.',
    cost: 65,
    upgradeCosts: [90, 165],
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
    name: 'Pulse',
    shortRole: 'Nova Ring',
    description: 'Emits a 360° shockwave hitting every creep inside its ring.',
    cost: 75,
    upgradeCosts: [100, 180],
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
    name: 'Rail Sniper',
    shortRole: 'Armor Pierce',
    description: 'Extreme range railgun that ignores armor with heavy single hits.',
    cost: 85,
    upgradeCosts: [115, 210],
    baseDamage: 62,
    baseRange: 5.4,
    baseFireRate: 0.62,
    projectileSpeed: 999,
    baseSplashRadius: 0,
    armorPierce: true,
    hotkey: '4',
  },
};

export interface MapLayoutDefinition {
  id: MapLayoutId;
  name: string;
  difficulty: string;
  description: string;
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
    name: 'Classic Crossroad',
    difficulty: 'Balanced',
    description: 'Wide 24×16 baseplate built for sweeping multi-pass spirals.',
    start: { x: 1, y: 2 },
    cp1: { x: 21, y: 2 },
    cp2: { x: 2, y: 13 },
    cp3: { x: 21, y: 13 },
    exit: { x: 22, y: 8 },
    presetWalls: [],
  },
  twin_choke: {
    id: 'twin_choke',
    name: 'Twin Choke',
    difficulty: 'Tactical',
    description: 'Central brick pillars create natural killbox chokepoints.',
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
    name: 'Spiral Vault',
    difficulty: 'Master',
    description: 'Outer corners funnel into a central fortress exit.',
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

export interface BoardThemeDefinition {
  id: BoardThemeId;
  name: string;
  unlockLevel: number;
  baseBg: string;
  cellFill: string;
  cellAlt: string;
  studDot: string;
  gridLine: string;
  pathColor: string;
  grayWall: string;
  grayWallLight: string;
  grayWallDark: string;
}

export const BOARD_THEMES: Record<BoardThemeId, BoardThemeDefinition> = {
  toybox_slate: {
    id: 'toybox_slate',
    name: 'Toybox Slate',
    unlockLevel: 1,
    baseBg: '#161B22',
    cellFill: '#1D242E',
    cellAlt: '#1A212B',
    studDot: '#26303E',
    gridLine: '#13181F',
    pathColor: '#F59E0B',
    grayWall: '#64748B',
    grayWallLight: '#94A3B8',
    grayWallDark: '#334155',
  },
  midnight_workshop: {
    id: 'midnight_workshop',
    name: 'Midnight Plate',
    unlockLevel: 2,
    baseBg: '#0E1525',
    cellFill: '#152038',
    cellAlt: '#121C32',
    studDot: '#203052',
    gridLine: '#0B111E',
    pathColor: '#38BDF8',
    grayWall: '#4E627A',
    grayWallLight: '#7D95B3',
    grayWallDark: '#2A394D',
  },
  retro_handheld: {
    id: 'retro_handheld',
    name: 'Retro Olive',
    unlockLevel: 4,
    baseBg: '#1A2218',
    cellFill: '#232F21',
    cellAlt: '#1F2A1D',
    studDot: '#2E3D2B',
    gridLine: '#141A12',
    pathColor: '#A3E635',
    grayWall: '#6E7A68',
    grayWallLight: '#99A892',
    grayWallDark: '#3E473A',
  },
  volcanic_forge: {
    id: 'volcanic_forge',
    name: 'Basalt Forge',
    unlockLevel: 6,
    baseBg: '#1C1615',
    cellFill: '#271E1D',
    cellAlt: '#231B1A',
    studDot: '#382B29',
    gridLine: '#140F0E',
    pathColor: '#FB923C',
    grayWall: '#6B6260',
    grayWallLight: '#998E8B',
    grayWallDark: '#3B3433',
  },
};

// Rebalanced tougher wave curve scaled by selected difficulty
export function getWaveDefinition(
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
    const bossNames = [
      'Iron Golem',
      'Chrome Walker',
      'Titan Assembler',
      'Obsidian Boss',
      'Core Colossus',
      'Dreadnought',
    ];
    const name =
      bossNames[Math.min(bossNames.length - 1, Math.floor(wave / 5) - 1)] ??
      `Apex Boss Mk.${Math.floor(wave / 5)}`;
    return {
      wave,
      name,
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
        name: 'Scout Bots',
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
        name: 'Micro Swarm',
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
        name: 'Iron Beetles',
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
        name: 'Dash Hoppers',
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
        name: 'Bio-Oozers',
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
