import type { BrickColor, CreepTrait, TowerType } from '../domain/types';

/**
 * Lightweight 16x16 Pixel-Art Sprite Atlas (inspired by 0x72 & Kenney top-down pixel packs).
 * Pre-renders crisp shaded pixel sprites with dark outlines onto offscreen canvases at boot
 * for zero-dependency 60 FPS blitting—and cleanly swappable for PNG spritesheets later.
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

const ELEMENT_PALETTES: Record<BrickColor | 'kinetic', { c: string; l: string; d: string }> = {
  kinetic: { c: '#94A3B8', l: '#E2E8F0', d: '#475569' },
  yellow: { c: '#F59E0B', l: '#FEF08A', d: '#B45309' },
  red: { c: '#EF4444', l: '#FCA5A5', d: '#991B1B' },
  green: { c: '#10B981', l: '#A7F3D0', d: '#047857' },
};

// --- 16x16 Weapon Turret Sprites (pointing right -> 0 rad) ---

const TURRET_PATTERNS: Record<TowerType, string[]> = {
  repeater: [
    '................',
    '....oooooo......',
    '...oSSSSSSo.....',
    '..oSSCCCCSSo....',
    '..oSCLLLLCSoooo.',
    '..oSCDDDDCSoMMmo',
    '..oSSCCCCSSoooo.',
    '..oSSCCCCSSo....',
    '..oSSCCCCSSo....',
    '..oSSCCCCSSoooo.',
    '..oSCDDDDCSoMMmo',
    '..oSCLLLLCSoooo.',
    '..oSSCCCCSSo....',
    '...oSSSSSSo.....',
    '....oooooo......',
    '................',
  ],
  cannon: [
    '................',
    '...oooooooo.....',
    '..oSSSSSSSSo....',
    '.oSSCCCCCCSSo...',
    '.oSCLLLLLLCSooo.',
    '.oSCDDDDDDCSoMMo',
    '.oSCLLLLLLCSommo',
    '.oSSCCCCCCSSommo',
    '.oSSCCCCCCSSommo',
    '.oSCLLLLLLCSommo',
    '.oSCDDDDDDCSoMMo',
    '.oSCLLLLLLCSooo.',
    '.oSSCCCCCCSSo...',
    '..oSSSSSSSSo....',
    '...oooooooo.....',
    '................',
  ],
  pulse: [
    '.....oooooo.....',
    '...ooSSSSSSoo...',
    '..oSSCCCCCCSSo..',
    '.oSSCLLLLLLCSSo.',
    '.oSCLooooooLCSO.',
    'oSSCoCCLLCCoCSSo',
    'oSCLoCLLLLCoLCSO',
    'oSCLoCLLLLCoLCSO',
    'oSCLoCLLLLCoLCSO',
    'oSSCoCCDDCCoCSSo',
    '.oSCLooooooLCSO.',
    '.oSSCDDDDDDCSSo.',
    '..oSSCCCCCCSSo..',
    '...ooSSSSSSoo...',
    '.....oooooo.....',
    '................',
  ],
  sniper: [
    '................',
    '................',
    '...ooooooo......',
    '..oSSSSSSSo.....',
    '.oSSCCCCCSSo....',
    '.oSCLLLLCCSooooo',
    '.oSCDDDDCCSoMMMo',
    '.oSCLLLLCCSoLLLo',
    '.oSCLLLLCCSoLLLo',
    '.oSCDDDDCCSoMMMo',
    '.oSCLLLLCCSooooo',
    '.oSSCCCCCSSo....',
    '..oSSSSSSSo.....',
    '...ooooooo......',
    '................',
    '................',
  ],
};

// --- 14x14 Animated Pixel Creep Sprites (2 Walk Frames Each) ---

const CREEP_PATTERNS: Record<CreepTrait, [string[], string[]]> = {
  normal: [
    [
      '....oooooo....',
      '...oLLLLLLo...',
      '..oLBBBBBBBo..',
      '..oBBoEEoBBo..',
      '..oBBoEEoBBo..',
      '..oBBBBBBBBo..',
      '..oBDDDDDDBo..',
      '...oDDDDDDo...',
      '...oo....oo...',
      '..oDDoo..oDo..',
      '..oooo...ooo..',
      '..............',
    ],
    [
      '..............',
      '....oooooo....',
      '...oLLLLLLo...',
      '..oLBBBBBBBo..',
      '..oBBoEEoBBo..',
      '..oBBoEEoBBo..',
      '..oBBBBBBBBo..',
      '..oBDDDDDDBo..',
      '...oDDDDDDo...',
      '...oDo..ooDo..',
      '...ooo..oooo..',
      '..............',
    ],
  ],
  swarm: [
    [
      '..............',
      '....oo..oo....',
      '...oLLooLLo...',
      '..oBBBBBBBBo..',
      '..oBoEooEoBo..',
      '..oBDDDDDDBo..',
      '.oo.oooooo.oo.',
      '.o..........o.',
      '..............',
    ],
    [
      '..............',
      '..............',
      '....oo..oo....',
      '...oLLooLLo...',
      '..oBBBBBBBBo..',
      '..oBoEooEoBo..',
      '..oBDDDDDDBo..',
      '..o.oooooo.o..',
      '..............',
    ],
  ],
  armored: [
    [
      '...oooooooo...',
      '..oLLLLLLLLo..',
      '.oLBBBBBBBBBo.',
      '.oBBoEEEEoBBo.',
      '.oBBDDDDDDBBo.',
      '.oBDDDDDDDDBo.',
      '.oBDDDDDDDDBo.',
      '..oDDDDDDDDo..',
      '..ooo....ooo..',
      '.oDDo....oDDo.',
      '.oooo....oooo.',
      '..............',
    ],
    [
      '..............',
      '...oooooooo...',
      '..oLLLLLLLLo..',
      '.oLBBBBBBBBBo.',
      '.oBBoEEEEoBBo.',
      '.oBBDDDDDDBBo.',
      '.oBDDDDDDDDBo.',
      '.oBDDDDDDDDBo.',
      '..oDDDDDDDDo..',
      '...ooo..ooo...',
      '...oDo..oDo...',
      '..............',
    ],
  ],
  swift: [
    [
      '.....ooooo....',
      '....oLLLLLo...',
      '...oLBBBBBBo..',
      '..oBBBoEEoBBo.',
      '.oLLBBBBBBBBo.',
      '..ooDDDDDDDo..',
      '....oo...oo...',
      '...oDo....oDo.',
      '..............',
    ],
    [
      '..............',
      '.....ooooo....',
      '....oLLLLLo...',
      '...oLBBBBBBo..',
      '..oBBBoEEoBBo.',
      '.oLLBBBBBBBBo.',
      '..ooDDDDDDDo..',
      '....oDo..oDo..',
      '..............',
    ],
  ],
  regen: [
    [
      '....oooooo....',
      '..ooLLLLLLoo..',
      '.oLLBBBBBBLLo.',
      '.oBBoEooEoBBo.',
      '.oBBBBBBBBBBoo',
      '.oBBDDDDDDBBBo',
      '..oDDDDDDDDDo.',
      '..oo..oo..oo..',
      '..............',
    ],
    [
      '..............',
      '....oooooo....',
      '..ooLLLLLLoo..',
      '.oLLBBBBBBLLo.',
      '.oBBoEooEoBBo.',
      '.oBBBBBBBBBBoo',
      '.oBBDDDDDDBBBo',
      '.oo.oooooo.oo.',
      '..............',
    ],
  ],
  boss: [
    [
      '..oo..oo..oo..',
      '..oEEoEEoEEo..',
      '.oooooooooooo.',
      '.oLLLLLLLLLLo.',
      'oLBBBBBBBBBBBo',
      'oBBooEEEEooBBo',
      'oBBooEEEEooBBo',
      'oBBBBBBBBBBBBo',
      'oBBDDDDDDDDBBo',
      'oBDDDDDDDDDDBo',
      '.oDDDDDDDDDDo.',
      '.oooo....oooo.',
      '.oDDo....oDDo.',
      '.oooo....oooo.',
    ],
    [
      '..............',
      '..oo..oo..oo..',
      '..oEEoEEoEEo..',
      '.oooooooooooo.',
      '.oLLLLLLLLLLo.',
      'oLBBBBBBBBBBBo',
      'oBBooEEEEooBBo',
      'oBBooEEEEooBBo',
      'oBBBBBBBBBBBBo',
      'oBBDDDDDDDDBBo',
      'oBDDDDDDDDDDBo',
      '.oDDDDDDDDDDo.',
      '..ooo....ooo..',
      '..oDo....oDo..',
    ],
  ],
};

const CREEP_PALETTES: Record<CreepTrait, PaletteMap> = {
  normal: { o: '#0F172A', L: '#F8FAFC', B: '#CBD5E1', D: '#64748B', E: '#F97316' },
  swarm: { o: '#0F172A', L: '#FEF9C3', B: '#FACC15', D: '#A16207', E: '#0F172A' },
  armored: { o: '#0F172A', L: '#CBD5E1', B: '#64748B', D: '#334155', E: '#38BDF8' },
  swift: { o: '#0F172A', L: '#FED7AA', B: '#FB923C', D: '#C2410C', E: '#FEF08A' },
  regen: { o: '#0F172A', L: '#A7F3D0', B: '#10B981', D: '#065F46', E: '#FEF08A' },
  boss: { o: '#0F172A', L: '#FDA4AF', B: '#E11D48', D: '#881337', E: '#FDE047' },
};

// --- Elemental Projectile Pixel Sprites (pointing right -> 0 rad) ---

const PROJ_PATTERNS: Record<BrickColor | 'kinetic', string[]> = {
  kinetic: [
    '........',
    '..oooo..',
    '.oLLMMo.',
    '.oLWWMo.',
    '.oMMMMo.',
    '..oooo..',
    '........',
    '........',
  ],
  red: [
    '...oo...',
    '..oFFo..',
    '.oFWWFo.',
    'oFFWWWFo',
    'oFFWWWFo',
    '.oFWWFo.',
    '..oFFo..',
    '...oo...',
  ],
  yellow: [
    '....oo..',
    '..ooWLo.',
    '.oLLWLo.',
    'oLWWWLoo',
    '.ooWLLo.',
    '..oLoo..',
    '........',
    '........',
  ],
  green: [
    '..oooo..',
    '.oGGGGoo',
    'oGLWWGGo',
    'oGGWWGGo',
    'oGDDDDGo',
    '.oGGGGoo',
    '..oooo..',
    '........',
  ],
};

const PROJ_PALETTES: Record<BrickColor | 'kinetic', PaletteMap> = {
  kinetic: { o: '#0F172A', W: '#FFFFFF', L: '#E2E8F0', M: '#94A3B8' },
  red: { o: '#7F1D1D', F: '#EF4444', W: '#FEF08A' },
  yellow: { o: '#78350F', L: '#F59E0B', W: '#FFFFFF' },
  green: { o: '#064E3B', G: '#10B981', L: '#A7F3D0', W: '#ECFDF5', D: '#047857' },
};

// --- 7x8 Element Emblems pressed into colored bricks ---
// One shape per element (flame, bolt, drop) so bricks read by shape as well as color,
// which matters for red/green color-blind players. Replaces the old emoji-in-a-box glyph.

const EMBLEM_PATTERNS: Record<BrickColor, string[]> = {
  red: [
    '...x...',
    '...xx..',
    '..xxx..',
    '.xxxxx.',
    '.xx.xxx',
    'xx...xx',
    'xx...xx',
    '.xxxxx.',
  ],
  yellow: [
    '....xx.',
    '...xx..',
    '..xx...',
    '.xxxxx.',
    '...xx..',
    '..xx...',
    '.xx....',
    '.x.....',
  ],
  green: [
    '...x...',
    '...x...',
    '..xxx..',
    '..xxx..',
    '.xxxxx.',
    '.xxxxx.',
    '.xxxxx.',
    '..xxx..',
  ],
};

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
  private turretCache = new Map<string, HTMLCanvasElement>();
  private creepCache = new Map<string, [HTMLCanvasElement, HTMLCanvasElement]>();
  private projCache = new Map<string, HTMLCanvasElement>();
  private emblemCache = new Map<BrickColor, HTMLCanvasElement>();

  public getEmblem(color: BrickColor): HTMLCanvasElement {
    const existing = this.emblemCache.get(color);
    if (existing) return existing;
    const pal = ELEMENT_PALETTES[color];
    const sprite = bakeEmblem(EMBLEM_PATTERNS[color], pal.l, pal.d, 2);
    this.emblemCache.set(color, sprite);
    return sprite;
  }

  public getTurret(type: TowerType, element: BrickColor | 'kinetic'): HTMLCanvasElement {
    const key = `${type}:${element}`;
    const existing = this.turretCache.get(key);
    if (existing) return existing;

    const el = ELEMENT_PALETTES[element];
    const palette: PaletteMap = {
      o: '#0F172A',
      O: '#0F172A',
      S: '#475569',
      M: '#94A3B8',
      m: '#E2E8F0',
      C: el.c,
      L: el.l,
      D: el.d,
    };
    const sprite = bakeSprite(TURRET_PATTERNS[type], palette, 2);
    this.turretCache.set(key, sprite);
    return sprite;
  }

  public getCreep(trait: CreepTrait, frameIndex: 0 | 1): HTMLCanvasElement {
    let pair = this.creepCache.get(trait);
    if (!pair) {
      const patterns = CREEP_PATTERNS[trait];
      const pal = CREEP_PALETTES[trait];
      const scale = trait === 'boss' ? 2 : 2;
      pair = [bakeSprite(patterns[0], pal, scale), bakeSprite(patterns[1], pal, scale)];
      this.creepCache.set(trait, pair);
    }
    return pair[frameIndex];
  }

  public getProjectile(element: BrickColor | 'kinetic'): HTMLCanvasElement {
    const existing = this.projCache.get(element);
    if (existing) return existing;
    const sprite = bakeSprite(PROJ_PATTERNS[element], PROJ_PALETTES[element], 2);
    this.projCache.set(element, sprite);
    return sprite;
  }
}

export const spriteAtlas = new PixelSpriteAtlas();
