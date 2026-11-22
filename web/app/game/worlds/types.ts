import type {
  BoardThemeId,
  BrickColor,
  CreepTrait,
  HeroRole,
  MapLayoutId,
  TowerType,
  WaveModifier,
} from '../domain/types';

/**
 * A World is everything a player sees that the rules do not care about: names, flavour
 * text, sprite grids, palettes and board looks. The rules (constants.ts, simulation.ts)
 * only speak in ids — tower types, brick colours, creep traits, synergy ids — so a World
 * can be swapped without touching balance.
 *
 * Sprites are pixel grids: one string per row, one character per art pixel, '.' for
 * transparent. Each character is looked up in the sprite's palette. The atlas bakes them
 * once into offscreen canvases (at 2x), so a World costs nothing per frame.
 */

export type PaletteMap = Record<string, string>;
export type SpriteGrid = string[];
export type AmmoElement = BrickColor | 'kinetic';
export type SynergyId = 'plasma' | 'wildfire' | 'static_venom' | 'overcharge';

export interface ElementShades {
  /** body */
  c: string;
  /** light */
  l: string;
  /** dark */
  d: string;
}

export interface BoardLook {
  name: string;
  /** Floor pattern: a checkerboard of tiles, or rows of planks with staggered joints. */
  floor: 'checker' | 'planks';
  baseBg: string;
  cellFill: string;
  cellAlt: string;
  gridLine: string;
  pathColor: string;
  grayWall: string;
  grayWallLight: string;
  grayWallDark: string;
}

export interface WorldText {
  towers: Record<TowerType, { name: string; description: string }>;
  elements: Record<
    BrickColor,
    {
      /** Short colour word for the brick itself, e.g. "Yellow". */
      label: string;
      /** What the element is called in this World, e.g. "Lightning" or "Spark". */
      elementName: string;
      bonusShort: string;
      bonusDetail: string;
    }
  >;
  synergies: Record<SynergyId, { name: string; shortEffect: string }>;
  maps: Record<MapLayoutId, { name: string; description: string }>;
  /** Wave names for the five regular wave kinds. */
  waves: Record<Exclude<CreepTrait, 'boss'>, string>;
  /** Boss names in order (wave 5, 10, 15 …); the last one repeats. */
  bosses: string[];
  heroes: Record<HeroRole, string>;
  modifiers: Record<WaveModifier, { label: string; detail: string }>;
  /** What a plain gray maze wall is called, e.g. "Gray Maze Wall" or "Wooden Block". */
  wall: string;
  /** The defenders and the attackers as groups, for menus and banners. */
  defenders: string;
  attackers: string;
}

export interface WorldSprites {
  /**
   * 'native': each grid character is a 2x2 block of canvas pixels (the original look).
   * 'scale2x': grids are doubled with the Scale2x pixel-art upscaler and the outer outline
   * thinned to one pixel, giving twice the detail in the same drawn size. Baked once, so
   * it costs nothing per frame.
   */
  detail: 'native' | 'scale2x';
  /** 16x16 turret grids, seen from above, pointing right (0 rad). */
  turrets: Record<TowerType, SpriteGrid>;
  /**
   * Shared turret palette. C/L/D are filled in per element from `elements`, so every
   * turret grid can use them for its element-coloured parts.
   */
  turretPalette: PaletteMap;
  /** Two walk frames per creep trait. */
  creeps: Record<CreepTrait, [SpriteGrid, SpriteGrid]>;
  creepPalettes: Record<CreepTrait, PaletteMap>;
  /** Optional own sprites for escort heroes; without them a hero uses its wave's trait sprite. */
  heroes?: Record<HeroRole, { frames: [SpriteGrid, SpriteGrid]; palette: PaletteMap }>;
  /**
   * 'front': creeps are drawn facing the viewer and never flipped.
   * 'side': creep grids face right and are mirrored when walking left.
   */
  creepFacing: 'front' | 'side';
  projectiles: Record<AmmoElement, SpriteGrid>;
  projectilePalettes: Record<AmmoElement, PaletteMap>;
  /** 7x8 emblems pressed into coloured bricks ('x' = filled), one shape per element. */
  emblems: Record<BrickColor, SpriteGrid>;
  elements: Record<AmmoElement, ElementShades>;
}

export interface WorldDefinition {
  id: string;
  name: string;
  tagline: string;
  /**
   * How bricks are drawn: 'studded' toy bricks with four studs, or 'block' — smooth
   * wooden blocks with chamfered corners and a grain line.
   */
  brickStyle: 'studded' | 'block';
  /** One look per board slot; slots unlock by profile level (see BOARD_THEMES). */
  boards: Record<BoardThemeId, BoardLook>;
  text: WorldText;
  sprites: WorldSprites;
}
