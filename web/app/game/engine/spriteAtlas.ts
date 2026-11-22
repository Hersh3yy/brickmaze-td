import type { BrickColor, CreepTrait, HeroRole, TowerType } from '../domain/types';
import { activeWorld } from '../worlds';
import { refineGrid } from '../worlds/refine';
import type { AmmoElement, SpriteGrid, WorldDefinition } from '../worlds/types';
import { bakeVoxelSprite, sculptModel, tonesFrom } from '../worlds/voxel';
import type { VoxelBuild, VoxelModel } from '../worlds/voxel';

/** A baked voxel sprite and where its ground point and top sit inside the canvas. */
export interface VoxelSprite {
  canvas: HTMLCanvasElement;
  groundX: number;
  groundY: number;
  /** Height of the model above its ground point, in canvas pixels. */
  height: number;
  /** Muzzle tip relative to the ground point, before rotation (reach, height), if any. */
  muzzle?: [number, number];
}

/** Tower aim directions baked per model; creeps get four walking directions. */
export const VOXEL_TOWER_DIRS = 16;
const OUTLINE_INK: [number, number, number] = [20, 18, 22];

/**
 * Pixel sprite atlas. The sprite grids and palettes come from the active World
 * (game/worlds); this file only bakes them into offscreen canvases, once per World, so
 * drawing a sprite is a single drawImage. When the World changes the caches are dropped
 * and the new World bakes lazily on first use.
 */

type PaletteMap = Record<string, string>;

function bakeSprite(rows: string[], palette: PaletteMap, pixelScale = 2): HTMLCanvasElement {
  const h = rows.length;
  const w = rows[0].length;
  const canvas = document.createElement('canvas');
  canvas.width = w * pixelScale;
  canvas.height = h * pixelScale;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  for (let y = 0; y < h; y++) {
    const row = rows[y];
    for (let x = 0; x < w; x++) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') continue;
      const color = palette[ch];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x * pixelScale, y * pixelScale, pixelScale, pixelScale);
    }
  }
  return canvas;
}

function bakeEmblem(rows: string[], face: string, shadow: string, pixelScale = 2): HTMLCanvasElement {
  const h = rows.length;
  const w = rows[0].length;
  const canvas = document.createElement('canvas');
  canvas.width = (w + 1) * pixelScale;
  canvas.height = (h + 1) * pixelScale;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  for (const [color, offset] of [
    [shadow, 1],
    [face, 0],
  ] as const) {
    ctx.fillStyle = color;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (rows[y][x] === 'x') {
          ctx.fillRect((x + offset) * pixelScale, (y + offset) * pixelScale, pixelScale, pixelScale);
        }
      }
    }
  }
  return canvas;
}
class PixelSpriteAtlas {
  private worldId = '';
  private turretCache = new Map<string, HTMLCanvasElement>();
  private creepCache = new Map<string, [HTMLCanvasElement, HTMLCanvasElement]>();
  private heroCache = new Map<HeroRole, [HTMLCanvasElement, HTMLCanvasElement] | null>();
  private projCache = new Map<string, HTMLCanvasElement>();
  private emblemCache = new Map<BrickColor, HTMLCanvasElement>();
  private voxelModels = new Map<string, VoxelModel>();
  private voxelSprites = new Map<string, VoxelSprite>();

  /** Current World, dropping every cached sprite when it has changed since the last call. */
  private world(): WorldDefinition {
    const world = activeWorld();
    if (world.id !== this.worldId) {
      this.worldId = world.id;
      this.turretCache.clear();
      this.creepCache.clear();
      this.heroCache.clear();
      this.projCache.clear();
      this.emblemCache.clear();
      this.voxelModels.clear();
      this.voxelSprites.clear();
    }
    return world;
  }

  /** Bakes a grid at the World's detail level; both give the same canvas size. */
  private bake(world: WorldDefinition, grid: SpriteGrid, palette: PaletteMap): HTMLCanvasElement {
    return world.sprites.detail === 'scale2x'
      ? bakeSprite(refineGrid(grid), palette, 1)
      : bakeSprite(grid, palette, 2);
  }

  public getEmblem(color: BrickColor): HTMLCanvasElement {
    const world = this.world();
    const existing = this.emblemCache.get(color);
    if (existing) return existing;
    const shades = world.sprites.elements[color];
    const sprite = bakeEmblem(world.sprites.emblems[color], shades.l, shades.d, 2);
    this.emblemCache.set(color, sprite);
    return sprite;
  }

  public getTurret(type: TowerType, element: AmmoElement): HTMLCanvasElement {
    const world = this.world();
    // A 3D World's shop icon is its tower turned a little towards the viewer.
    if (world.sprites.voxels) return this.getVoxelTower(type, element, 1)!.canvas;
    const key = `${type}:${element}`;
    const existing = this.turretCache.get(key);
    if (existing) return existing;
    const shades = world.sprites.elements[element];
    const palette: PaletteMap = {
      ...world.sprites.turretPalette,
      C: shades.c,
      L: shades.l,
      D: shades.d,
    };
    const sprite = this.bake(world, world.sprites.turrets[type], palette);
    this.turretCache.set(key, sprite);
    return sprite;
  }

  public getCreep(trait: CreepTrait, frameIndex: 0 | 1): HTMLCanvasElement {
    const world = this.world();
    let pair = this.creepCache.get(trait);
    if (!pair) {
      const [a, b] = world.sprites.creeps[trait];
      const pal = world.sprites.creepPalettes[trait];
      pair = [this.bake(world, a, pal), this.bake(world, b, pal)];
      this.creepCache.set(trait, pair);
    }
    return pair[frameIndex];
  }

  /** The hero's own sprite, or null when the World has none (then use the trait sprite). */
  public getHero(role: HeroRole, frameIndex: 0 | 1): HTMLCanvasElement | null {
    const world = this.world();
    let pair = this.heroCache.get(role);
    if (pair === undefined) {
      const def = world.sprites.heroes?.[role];
      pair = def
        ? [this.bake(world, def.frames[0], def.palette), this.bake(world, def.frames[1], def.palette)]
        : null;
      this.heroCache.set(role, pair);
    }
    return pair ? pair[frameIndex] : null;
  }

  /** Whether the active World draws towers and creeps from voxel models. */
  public hasVoxels(): boolean {
    return Boolean(this.world().sprites.voxels);
  }

  /** A tower baked facing one of VOXEL_TOWER_DIRS directions (0 = right, clockwise). */
  public getVoxelTower(type: TowerType, element: AmmoElement, dir: number): VoxelSprite | null {
    const set = this.world().sprites.voxels;
    if (!set) return null;
    const d = ((dir % VOXEL_TOWER_DIRS) + VOXEL_TOWER_DIRS) % VOXEL_TOWER_DIRS;
    return this.bakeVoxel(`t:${type}:${element}:${d}`, `t:${type}`, set.towers[type], 0, (d * Math.PI * 2) / VOXEL_TOWER_DIRS, element);
  }

  /** A creep or escort hero baked walking right (0), down (1), left (2) or up (3). */
  public getVoxelCreep(trait: CreepTrait, hero: HeroRole | undefined, dir: number, frame: 0 | 1): VoxelSprite | null {
    const set = this.world().sprites.voxels;
    if (!set) return null;
    const heroBuild = hero ? set.heroes?.[hero] : undefined;
    const name = heroBuild ? `h:${hero}` : `c:${trait}`;
    const build = heroBuild ?? set.creeps[trait];
    return this.bakeVoxel(`${name}:${dir}:${frame}`, `${name}:${frame}`, build, frame, (dir * Math.PI) / 2, 'kinetic');
  }

  private bakeVoxel(
    key: string,
    modelKey: string,
    build: VoxelBuild,
    frame: 0 | 1,
    angle: number,
    element: AmmoElement
  ): VoxelSprite {
    const cached = this.voxelSprites.get(key);
    if (cached) return cached;
    const world = this.world();
    const set = world.sprites.voxels!;
    const detail = set.detail * (build.scale ?? 1);
    let model = this.voxelModels.get(modelKey);
    if (!model) {
      model = sculptModel(build, detail, frame);
      this.voxelModels.set(modelKey, model);
    }
    const [w, d, h] = build.size;
    const reach = Math.max(w, d) * detail;
    const size = Math.ceil(Math.max(reach + 4, h * detail + reach * 0.5 + 6));
    const groundY = Math.floor(size - reach * 0.25 - 3);
    const shades = world.sprites.elements[element];
    const materials = { ...set.materials, C: tonesFrom(shades.l, shades.c, shades.d) };
    const canvas = bakeVoxelSprite(model, angle, materials, {
      size,
      ground: groundY / size,
      outline: OUTLINE_INK,
    });
    const sprite: VoxelSprite = {
      canvas,
      groundX: size / 2,
      groundY,
      height: h * detail,
      muzzle: build.muzzle ? [build.muzzle[0] * detail, build.muzzle[1] * detail] : undefined,
    };
    this.voxelSprites.set(key, sprite);
    return sprite;
  }

  /** Whether turrets are side views that mirror to face a target instead of rotating. */
  public turretsFace(): boolean {
    return this.world().sprites.turretView === 'face';
  }

  /** Whether creep grids face right and should be mirrored when walking left. */
  public creepsFaceSideways(): boolean {
    return this.world().sprites.creepFacing === 'side';
  }

  public getProjectile(element: AmmoElement): HTMLCanvasElement {
    const world = this.world();
    const existing = this.projCache.get(element);
    if (existing) return existing;
    const sprite = this.bake(world, world.sprites.projectiles[element], world.sprites.projectilePalettes[element]);
    this.projCache.set(element, sprite);
    return sprite;
  }
}

export const spriteAtlas = new PixelSpriteAtlas();
