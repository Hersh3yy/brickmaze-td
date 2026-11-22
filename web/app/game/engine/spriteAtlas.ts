import type { BrickColor, CreepTrait, HeroRole, TowerType } from '../domain/types';
import { activeWorld } from '../worlds';
import { refineGrid } from '../worlds/refine';
import type { AmmoElement, SpriteGrid, WorldDefinition } from '../worlds/types';

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
