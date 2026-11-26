// 'purple' is Arcane: range, crits, piercing shots and magic damage (ignores armor).
export type BrickColor = 'yellow' | 'red' | 'green' | 'purple';

export type CellKind =
  | 'OPEN'
  | 'START'
  | 'CP1'
  | 'CP2'
  | 'CP3'
  | 'EXIT'
  | 'GRAY_WALL'
  | 'TURN_DRAFT'
  | 'ACTIVE_BRICK'
  | 'MASTER_BRICK';

// 'harpoon': long-range anti-air bolt that pins its target (double damage to fliers).
export type TowerType = 'repeater' | 'cannon' | 'sniper' | 'pulse' | 'harpoon';

// 'fresh' = like 'first', but prefers creeps that do not already carry this tower's
// slow / poison / burn, so effect towers spread their debuffs instead of stacking them.
/** 1-3 are the normal tiers; 4 is Elite (expensive, at most MAX_ELITE_TOWERS at once). */
export type TowerLevel = 1 | 2 | 3 | 4;

export type TargetingMode = 'first' | 'strongest' | 'closest' | 'fresh';

export type GamePhase =
  | 'BUILD_PLACE'
  | 'BUILD_PICK'
  | 'BUILD_MANAGE'
  | 'COMBAT'
  | 'VICTORY'
  | 'GAME_OVER';

export type MapLayoutId = 'crossroad' | 'twin_choke' | 'spiral_vault';

export type DifficultyId = 'standard' | 'hard' | 'brutal';

export type BoardThemeId =
  | 'toybox_slate'
  | 'midnight_workshop'
  | 'retro_handheld'
  | 'volcanic_forge';

export interface Coord {
  x: number;
  y: number;
}

export interface PlacedTurnEntry {
  x: number;
  y: number;
  previousKind: 'OPEN' | 'GRAY_WALL';
}

export interface GridCell {
  x: number;
  y: number;
  kind: CellKind;
  color?: BrickColor;
  secondaryColor?: BrickColor;
  turnDraftIndex?: number;
}

export interface Tower {
  id: string;
  type: TowerType;
  level: TowerLevel;
  x: number;
  y: number;
  targeting: TargetingMode;
  angle: number;
  cooldown: number;
  recoil: number;
  muzzleFlash: number;
  totalDamage: number;
  kills: number;
  investedGold: number;
}

// 'flier' ignores the maze: it flies straight from checkpoint to checkpoint, and cannons
// (lobbed shells) cannot hit it.
export type CreepTrait = 'normal' | 'swarm' | 'swift' | 'armored' | 'regen' | 'boss' | 'flier';

/** A hero escorting its wave: the vanguard leads and speeds the wave up, the warden trails and heals it. */
export type HeroRole = 'vanguard' | 'warden';

/**
 * A wave-wide special on top of the creep trait.
 * - rally: every kill makes the rest of the wave tougher.
 * - escort: a vanguard hero spawns first and a warden hero last.
 */
export type WaveModifier = 'rally' | 'escort';

export interface Creep {
  id: string;
  wave: number;
  trait: CreepTrait;
  x: number;
  y: number;
  path: Coord[];
  pathIndex: number;
  hp: number;
  maxHp: number;
  speed: number;
  armor: number;
  bounty: number;
  slowTimer: number;
  slowFactor: number;
  poisonTimer: number;
  poisonDps: number;
  burnTimer: number;
  burnDps: number;
  shredTimer: number;
  animTime: number;
  radius: number;
  /** Set on the two hero creeps of an escort wave. */
  hero?: HeroRole;
  /** Seconds left pinned in place by a Harpoon. */
  pinTimer?: number;
  /**
   * Sideways nudge (px) that keeps creeps from drawing on top of each other. Only where a
   * creep is drawn and aimed at uses it; its place on the path (and range checks) do not,
   * so crowding never changes who is in front or how long the maze is.
   */
  ox?: number;
  oy?: number;
}

export interface Projectile {
  id: string;
  towerType: TowerType;
  element: BrickColor | 'kinetic';
  secondaryElement?: BrickColor;
  x: number;
  y: number;
  startX: number;
  startY: number;
  targetId: string;
  targetX: number;
  targetY: number;
  angle: number;
  speed: number;
  distanceTotal: number;
  distanceTraveled: number;
  arcHeight: number;
  spin: number;
  trail: { x: number; y: number; z: number }[];
  damage: number;
  splashRadius: number;
  chainCount: number;
  slowFactor: number;
  slowDuration: number;
  poisonDps: number;
  poisonDuration: number;
  burnDps: number;
  shredArmor: boolean;
  spreadVenomOnChain: boolean;
  isCrit: boolean;
  ignoreArmor: boolean;
  /** Arcane ammo: all of this shot's damage is magic (ignores armor). */
  magic?: boolean;
  /** Arcane ammo: how many extra creeps near the target the shot passes through. */
  pierceCount?: number;
  sourceTowerId: string;
}

export interface BeamEffect {
  id: string;
  points: { x: number; y: number }[];
  color: string;
  coreColor?: string;
  ttl: number;
  maxTtl: number;
  width: number;
}

export interface ImpactRing {
  id: string;
  x: number;
  y: number;
  maxRadius: number;
  color: string;
  fillAlpha?: number;
  ttl: number;
  maxTtl: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  ttl: number;
  maxTtl: number;
}

export interface FloatingText {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  ttl: number;
  maxTtl: number;
  /** Banner text (wave cleared) drawn larger than the numbers over creeps. */
  big?: boolean;
}

/** A colour-pair synergy. Its name and effect text live in the World (game/worlds). */
export interface SynergyInfo {
  id: 'plasma' | 'wildfire' | 'static_venom' | 'overcharge' | 'prism' | 'hexfire' | 'witchbrew';
  colors: [BrickColor, BrickColor];
}

export interface SynergyLink {
  from: Coord;
  to: Coord;
  synergyId: string;
  colorA: BrickColor;
  colorB: BrickColor;
}

export interface TileCombatModifiers {
  primaryElement: BrickColor | 'kinetic';
  secondaryElement?: BrickColor;
  isDoubleElement: boolean;
  sameColorNeighbors: number;
  adjacentLinkCount: number;
  ammoLabel: string;
  damageMult: number;
  fireRateMult: number;
  rangeMult: number;
  critChance: number;
  extraSplashRadius: number;
  chainCount: number;
  slowFactor: number;
  slowDuration: number;
  poisonDpsRatio: number;
  burnDpsRatio: number;
  armorShred: boolean;
  spreadVenomOnChain: boolean;
  /** Arcane: extra creeps each hit passes through. */
  pierceCount: number;
  /** Arcane: every hit is magic damage and ignores armor. */
  magicDamage: boolean;
  brickColors: BrickColor[];
  activeSynergies: SynergyInfo[];
}

export interface TurnFusionOption {
  id: string;
  name: string;
  description: string;
  indices: [number, number];
  colors: [BrickColor, BrickColor];
  anchorIndex: number;
}

/** One wave's rules. Its display name comes from the World: see waveTitle() in game/worlds. */
export interface WaveDefinition {
  wave: number;
  trait: CreepTrait;
  count: number;
  hp: number;
  speed: number;
  armor: number;
  bounty: number;
  spawnInterval: number;
  clearBonus: number;
  modifier?: WaveModifier;
  /** The wave before a boss: double the creeps. Can carry a modifier on top. */
  horde?: boolean;
}

export interface PlayerStats {
  gamesPlayed: number;
  gamesWon: number;
  highestWave: number;
  longestMazePath: number;
  synergiesTriggered: number;
  totalCreepsDefeated: number;
}

export interface PlayerProfile {
  profileId: string;
  displayName: string;
  xp: number;
  level: number;
  selectedTheme: BoardThemeId;
  unlockedThemes: BoardThemeId[];
  stats: PlayerStats;
  updatedAt: string;
}

export interface MatchSummary {
  won: boolean;
  difficulty: DifficultyId;
  wavesCleared: number;
  longestPath: number;
  synergiesCount: number;
  creepsDefeated: number;
  xpEarned: number;
  leveledUp: boolean;
  newLevel: number;
}
