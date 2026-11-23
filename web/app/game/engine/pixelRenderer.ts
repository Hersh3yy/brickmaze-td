import {
  BOARD_THEMES,
  BRICK_COLORS,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  ELITE_LEVEL,
  GRID_COLS,
  GRID_ROWS,
  TILE_SIZE,
  TOWER_DEFS,
  TOWER_LEVEL_SCALES,
} from '../domain/constants';
import type {
  BeamEffect,
  BoardThemeId,
  BrickColor,
  CellKind,
  Coord,
  Creep,
  FloatingText,
  GamePhase,
  GridCell,
  ImpactRing,
  Particle,
  PlacedTurnEntry,
  Projectile,
  SynergyLink,
  Tower,
  TowerType,
} from '../domain/types';
import { computeTileModifiers } from '../domain/synergy';
import { activeWorld } from '../worlds';
import type { BoardLook } from '../worlds/types';
import { spriteAtlas, VOXEL_TOWER_DIRS } from './spriteAtlas';

export interface CameraView {
  zoom: number; // 1.0 .. 2.2
  panX: number; // canvas-space offset
  panY: number;
}

export interface RenderFrameInput {
  grid: GridCell[][];
  themeId: BoardThemeId;
  phase: GamePhase;
  path: Coord[];
  previewPath: Coord[] | null;
  previewValid: boolean;
  hoverCoord: Coord | null;
  nextDraftColor: BrickColor | null;
  placedTurnCoords: PlacedTurnEntry[];
  synergyLinks: SynergyLink[];
  towers: Tower[];
  selectedCoord: Coord | null;
  relocatingTowerId: string | null;
  placingTowerType: TowerType | null;
  creeps: Creep[];
  projectiles: Projectile[];
  beams: BeamEffect[];
  impactRings: ImpactRing[];
  particles: Particle[];
  floatingTexts: FloatingText[];
  camera: CameraView;
  nowSec: number;
}

export function getElementAccent(el: BrickColor | 'kinetic'): string {
  if (el === 'kinetic') return '#CBD5E1';
  return BRICK_COLORS[el].hex;
}

// ---------------------------------------------------------------------------
// Frame budget helpers
//
// The floor and bricks only change when a brick, a tower position, the theme or the
// camera changes, yet they used to cost ~5,000 fillRects every frame (about two thirds
// of the frame). They are now painted once into an offscreen canvas and blitted. The
// renderer notices changes itself by hashing the grid, so callers need no signal.
// ---------------------------------------------------------------------------

/**
 * Render quality. `mode` can be set by a settings UI later; in 'auto' the renderer drops
 * to low quality when the measured frame interval stays slow, and climbs back when it
 * stays fast. Low quality draws fewer particles, shorter trails and no venom bubbles.
 */
export const renderQuality: { mode: 'auto' | 'high' | 'low'; low: boolean } = {
  mode: 'auto',
  low: false,
};

const PARTICLE_CAP_HIGH = 160;
const PARTICLE_CAP_LOW = 60;

const KIND_ID: Record<CellKind, number> = {
  OPEN: 0,
  START: 1,
  CP1: 2,
  CP2: 3,
  CP3: 4,
  EXIT: 5,
  GRAY_WALL: 6,
  TURN_DRAFT: 7,
  ACTIVE_BRICK: 8,
  MASTER_BRICK: 9,
};
const COLOR_ID = (c: BrickColor | undefined): number =>
  c === 'yellow' ? 1 : c === 'red' ? 2 : c === 'green' ? 3 : 0;
const THEME_IDS = Object.keys(BOARD_THEMES) as BoardThemeId[];

const mix = (h: number, v: number): number => Math.imul(h ^ (v | 0), 0x01000193) >>> 0;
const hashText = (text: string): number => {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = mix(h, text.charCodeAt(i));
  return h;
};

/** Last horizontal direction each creep walked, so side-view sprites keep facing it on vertical legs. */
const creepFacesLeft = new WeakMap<Creep, boolean>();

const occupied = new Uint8Array(GRID_COLS * GRID_ROWS);

let boardCanvas: HTMLCanvasElement | null = null;
let boardViewHash = -1;
let gridHash = -1;
let fontEpoch = 0;
let fontListenerAttached = false;

const towerElementById = new Map<string, BrickColor | 'kinetic'>();
const waypointCells: { px: number; py: number; label: string; accent: string }[] = [];
const draftCells: GridCell[] = [];

let lastNowSec = 0;
let avgFrameSec = 1 / 60;
let slowStreak = 0;
let fastStreak = 0;
let recoverFrames = 240;

function updateRenderQuality(nowSec: number) {
  const dt = nowSec - lastNowSec;
  lastNowSec = nowSec;
  if (renderQuality.mode !== 'auto') {
    renderQuality.low = renderQuality.mode === 'low';
    return;
  }
  // Ignore stalls (hidden tab, breakpoints): they say nothing about render cost.
  if (dt <= 0 || dt > 0.25) return;
  avgFrameSec += (dt - avgFrameSec) * 0.05;
  if (!renderQuality.low) {
    slowStreak = avgFrameSec > 0.026 ? slowStreak + 1 : 0;
    if (slowStreak > 90) {
      renderQuality.low = true;
      slowStreak = 0;
    }
  } else {
    fastStreak = avgFrameSec < 0.019 ? fastStreak + 1 : 0;
    if (fastStreak > recoverFrames) {
      renderQuality.low = false;
      fastStreak = 0;
      // Back off so a device on the edge does not flip every few seconds.
      recoverFrames = Math.min(recoverFrames * 2, 3600);
    }
  }
}

function hashGrid(frame: RenderFrameInput): number {
  let h = 0x811c9dc5;
  for (let y = 0; y < GRID_ROWS; y++) {
    const row = frame.grid[y];
    for (let x = 0; x < GRID_COLS; x++) {
      const c = row[x];
      h = mix(h, KIND_ID[c.kind] | (COLOR_ID(c.color) << 4) | (COLOR_ID(c.secondaryColor) << 6));
    }
  }
  h = mix(h, frame.towers.length);
  for (const t of frame.towers) h = mix(h, t.y * GRID_COLS + t.x + 1);
  return h;
}

/** Rebuilt only when the grid hash changes: tower elements, waypoint and draft cells. */
function rebuildGridDerived(frame: RenderFrameInput) {
  towerElementById.clear();
  for (const t of frame.towers) {
    towerElementById.set(t.id, computeTileModifiers(frame.grid, t.x, t.y).primaryElement);
  }
  waypointCells.length = 0;
  draftCells.length = 0;
  for (let y = 0; y < GRID_ROWS; y++) {
    for (let x = 0; x < GRID_COLS; x++) {
      const cell = frame.grid[y][x];
      const px = x * TILE_SIZE;
      const py = y * TILE_SIZE;
      switch (cell.kind) {
        case 'START':
          waypointCells.push({ px, py, label: 'IN', accent: '#10B981' });
          break;
        case 'CP1':
          waypointCells.push({ px, py, label: '1', accent: '#F59E0B' });
          break;
        case 'CP2':
          waypointCells.push({ px, py, label: '2', accent: '#F59E0B' });
          break;
        case 'CP3':
          waypointCells.push({ px, py, label: '3', accent: '#F59E0B' });
          break;
        case 'EXIT':
          waypointCells.push({ px, py, label: 'OUT', accent: '#EF4444' });
          break;
        case 'TURN_DRAFT':
          draftCells.push(cell);
          break;
        default:
          break;
      }
    }
  }
}

function towerElement(frame: RenderFrameInput, tower: Tower): BrickColor | 'kinetic' {
  let el = towerElementById.get(tower.id);
  if (el === undefined) {
    el = computeTileModifiers(frame.grid, tower.x, tower.y).primaryElement;
    towerElementById.set(tower.id, el);
  }
  return el;
}

function attachFontListener() {
  if (fontListenerAttached) return;
  fontListenerAttached = true;
  // Brick badges use JetBrains Mono; repaint the cached board once the web font arrives.
  if (typeof document !== 'undefined' && document.fonts?.addEventListener) {
    document.fonts.addEventListener('loadingdone', () => {
      fontEpoch++;
    });
  }
}

/** Floor and bricks, painted under the current camera into the offscreen board canvas. */
function paintBoard(
  target: CanvasRenderingContext2D,
  base: DOMMatrix | undefined,
  frame: RenderFrameInput,
  theme: BoardLook,
  brickStyle: 'studded' | 'block'
) {
  target.setTransform(1, 0, 0, 1, 0, 0);
  target.clearRect(0, 0, target.canvas.width, target.canvas.height);
  if (base) target.setTransform(base);
  target.imageSmoothingEnabled = false;

  target.fillStyle = theme.baseBg;
  target.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  target.translate(frame.camera.panX, frame.camera.panY);
  target.scale(frame.camera.zoom, frame.camera.zoom);

  if (theme.floor === 'planks') paintPlankFloor(target, theme);
  else paintCheckerFloor(target, theme);

  for (let y = 0; y < GRID_ROWS; y++) {
    for (let x = 0; x < GRID_COLS; x++) {
      const cell = frame.grid[y][x];
      const px = x * TILE_SIZE;
      const py = y * TILE_SIZE;
      const hasTower = occupied[y * GRID_COLS + x] === 1;

      switch (cell.kind) {
        case 'GRAY_WALL':
          drawBrickTile(target, px, py, theme.grayWall, theme.grayWallLight, theme.grayWallDark, {
            style: brickStyle,
            grain: brickStyle === 'block',
          });
          break;
        case 'TURN_DRAFT': {
          const color = cell.color ?? 'yellow';
          const meta = BRICK_COLORS[color];
          drawBrickTile(target, px, py, meta.hex, meta.lightHex, meta.darkHex, {
            style: brickStyle,
            isActiveGlow: true,
            emblem: spriteAtlas.getEmblem(color),
          });
          break;
        }
        case 'ACTIVE_BRICK': {
          const color = cell.color ?? 'yellow';
          const meta = BRICK_COLORS[color];
          drawBrickTile(target, px, py, meta.hex, meta.lightHex, meta.darkHex, {
            style: brickStyle,
            isActiveGlow: true,
            emblem: hasTower ? undefined : spriteAtlas.getEmblem(color),
          });
          break;
        }
        case 'MASTER_BRICK': {
          const metaA = BRICK_COLORS[cell.color ?? 'red'];
          const metaB = BRICK_COLORS[cell.secondaryColor ?? cell.color ?? 'yellow'];
          const isDouble = !cell.secondaryColor || cell.secondaryColor === cell.color;
          drawBrickTile(target, px, py, metaA.hex, metaA.lightHex, metaA.darkHex, {
            style: brickStyle,
            secondaryBodyHex: isDouble ? undefined : metaB.hex,
            secondaryLightHex: isDouble ? undefined : metaB.lightHex,
            secondaryDarkHex: isDouble ? undefined : metaB.darkHex,
            isMaster: true,
            isDouble,
            glyph: hasTower ? undefined : isDouble ? '×2' : '★',
            badgeCorner: hasTower && isDouble ? '×2' : undefined,
          });
          break;
        }
        default:
          break;
      }
    }
  }
}

/** Flat checkerboard with hairline joints (no stud dots: they made the empty floor busy). */
function paintCheckerFloor(target: CanvasRenderingContext2D, theme: BoardLook) {
  target.strokeStyle = theme.gridLine;
  target.lineWidth = 1;
  for (let y = 0; y < GRID_ROWS; y++) {
    for (let x = 0; x < GRID_COLS; x++) {
      const px = x * TILE_SIZE;
      const py = y * TILE_SIZE;
      target.fillStyle = (x + y) % 2 === 0 ? theme.cellFill : theme.cellAlt;
      target.fillRect(px, py, TILE_SIZE, TILE_SIZE);
      target.strokeRect(px + 0.5, py + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
    }
  }
}

/**
 * Floorboards: one plank row per tile row, alternating shades, with butt joints every
 * three tiles staggered row to row. Faint cell ticks keep the build grid readable.
 */
function paintPlankFloor(target: CanvasRenderingContext2D, theme: BoardLook) {
  for (let y = 0; y < GRID_ROWS; y++) {
    const py = y * TILE_SIZE;
    target.fillStyle = y % 2 === 0 ? theme.cellFill : theme.cellAlt;
    target.fillRect(0, py, CANVAS_WIDTH, TILE_SIZE);
    target.fillStyle = theme.gridLine;
    target.fillRect(0, py, CANVAS_WIDTH, 2);
    for (let x = y % 3; x < GRID_COLS; x += 3) target.fillRect(x * TILE_SIZE, py, 2, TILE_SIZE);
  }
  target.globalAlpha = 0.35;
  target.fillStyle = theme.gridLine;
  for (let y = 0; y < GRID_ROWS; y++) {
    for (let x = 1; x < GRID_COLS; x++) {
      if ((x - (y % 3)) % 3 === 0) continue;
      target.fillRect(x * TILE_SIZE, y * TILE_SIZE + 2, 1, 4);
      target.fillRect(x * TILE_SIZE, (y + 1) * TILE_SIZE - 4, 1, 4);
    }
  }
  target.globalAlpha = 1;
}

function drawBrickTile(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  bodyHex: string,
  lightHex: string,
  darkHex: string,
  opts?: {
    secondaryBodyHex?: string;
    secondaryLightHex?: string;
    secondaryDarkHex?: string;
    isActiveGlow?: boolean;
    isMaster?: boolean;
    isDouble?: boolean;
    badgeCorner?: string;
    glyph?: string;
    /** Pixel element emblem pressed into the brick; replaces the studs when present. */
    emblem?: HTMLCanvasElement;
    /** 'studded' toy brick (default) or a smooth wooden 'block' with chamfered corners. */
    style?: 'studded' | 'block';
    /** Wood grain lines on a plain block (gray walls in block style). */
    grain?: boolean;
    alpha?: number;
  }
) {
  ctx.save();
  if (opts?.alpha !== undefined) ctx.globalAlpha = opts.alpha;

  const s = TILE_SIZE;
  const pad = 2;
  const x = px + pad;
  const y = py + pad;
  const w = s - pad * 2;
  const h = s - pad * 2;

  const isBlock = opts?.style === 'block';

  ctx.fillStyle = 'rgba(0, 0, 0, 0.48)';
  ctx.fillRect(x + 2, y + 3, w, h);

  ctx.fillStyle = darkHex;
  if (isBlock) {
    // Chamfered silhouette: corners stepped in by two pixels.
    ctx.fillRect(x + 2, y, w - 4, h);
    ctx.fillRect(x, y + 2, w, h - 4);
    ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
  } else {
    ctx.fillRect(x, y, w, h);
  }

  ctx.fillStyle = bodyHex;
  // A block shows a thicker bottom lip, which reads as the front face of a raised block.
  ctx.fillRect(x + 2, y + 2, w - 4, isBlock ? h - 7 : h - 5);

  if (opts?.secondaryBodyHex && opts.secondaryDarkHex && opts.secondaryLightHex) {
    ctx.beginPath();
    ctx.moveTo(x + w - 2, y + 2);
    ctx.lineTo(x + w - 2, y + h - 3);
    ctx.lineTo(x + 2, y + h - 3);
    ctx.closePath();
    ctx.fillStyle = opts.secondaryBodyHex;
    ctx.fill();
  }

  ctx.fillStyle = lightHex;
  ctx.fillRect(x + 2, y + 2, w - 4, 2);
  ctx.fillRect(x + 2, y + 2, 2, isBlock ? h - 7 : h - 5);

  if (isBlock) {
    // Front face of the raised block: the body colour in shadow, with one joint line.
    ctx.fillStyle = bodyHex;
    ctx.globalAlpha = (opts?.alpha ?? 1) * 0.5;
    ctx.fillRect(x + 2, y + h - 5, w - 4, 4);
    ctx.globalAlpha = (opts?.alpha ?? 1) * 0.35;
    ctx.fillStyle = darkHex;
    ctx.fillRect(x + 6, y + h - 3, w - 12, 1);
    ctx.globalAlpha = opts?.alpha ?? 1;
  }

  if (opts?.grain) {
    ctx.fillStyle = darkHex;
    ctx.globalAlpha = (opts.alpha ?? 1) * 0.5;
    ctx.fillRect(x + 6, y + 9, w - 14, 1);
    ctx.fillRect(x + w - 9, y + 10, 3, 1);
    ctx.fillRect(x + 9, y + 17, w - 14, 1);
    ctx.fillRect(x + 6, y + 18, 3, 1);
    ctx.fillRect(x + 13, y + 13, 3, 2);
    ctx.globalAlpha = opts.alpha ?? 1;
  }

  const studOffsets = [
    { ox: 7, oy: 6, isSec: false },
    { ox: 20, oy: 6, isSec: false },
    { ox: 7, oy: 18, isSec: false },
    { ox: 20, oy: 18, isSec: true },
  ];

  if (opts?.emblem) {
    const em = opts.emblem;
    ctx.drawImage(em, px + Math.round((s - em.width) / 2) + 1, py + Math.round((s - em.height) / 2));
  }

  for (const st of opts?.emblem || isBlock ? [] : studOffsets) {
    const sx = px + st.ox;
    const sy = py + st.oy;
    const useSec = st.isSec && opts?.secondaryBodyHex;
    const sBody = useSec ? opts!.secondaryBodyHex! : bodyHex;
    const sLight = useSec ? opts!.secondaryLightHex! : lightHex;
    const sDark = useSec ? opts!.secondaryDarkHex! : darkHex;

    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(sx + 1, sy + 2, 9, 8);
    ctx.fillStyle = sDark;
    ctx.fillRect(sx, sy, 9, 8);
    ctx.fillStyle = sBody;
    ctx.fillRect(sx + 1, sy + 1, 7, 5);
    ctx.fillStyle = sLight;
    ctx.fillRect(sx + 2, sy + 1, 3, 2);
  }

  if (opts?.isDouble) {
    // High-visibility gold double border + corner pips for Double Element bricks
    ctx.strokeStyle = '#FDE047';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
    ctx.fillStyle = '#FEF08A';
    ctx.fillRect(x + 2, y + 2, 4, 4);
    ctx.fillRect(x + w - 6, y + 2, 4, 4);
    ctx.fillRect(x + 2, y + h - 6, 4, 4);
    ctx.fillRect(x + w - 6, y + h - 6, 4, 4);
  } else if (opts?.isMaster) {
    ctx.fillStyle = '#FDE047';
    ctx.fillRect(x + 2, y + 2, 4, 4);
    ctx.fillRect(x + w - 6, y + 2, 4, 4);
    ctx.fillRect(x + 2, y + h - 6, 4, 4);
    ctx.fillRect(x + w - 6, y + h - 6, 4, 4);
  } else if (opts?.isActiveGlow) {
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  }

  if (opts?.glyph) {
    const isWide = opts.glyph.length >= 2;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.86)';
    ctx.fillRect(px + (isWide ? 7 : 11), py + 11, isWide ? 22 : 14, 14);
    if (opts.isDouble) {
      ctx.strokeStyle = '#FDE047';
      ctx.lineWidth = 1;
      ctx.strokeRect(px + 7.5, py + 11.5, 21, 13);
    }
    ctx.fillStyle = opts.isDouble ? '#FEF08A' : '#FFFFFF';
    ctx.font = 'bold 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(opts.glyph, px + 18, py + 18.5);
  }

  // Persistent compact top-right corner badge so ×2 stays readable even when a turret sits on the brick
  if (opts?.badgeCorner) {
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(px + TILE_SIZE - 16, py + 2, 14, 10);
    ctx.fillStyle = '#FDE047';
    ctx.font = 'bold 8px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(opts.badgeCorner, px + TILE_SIZE - 9, py + 7.5);
  }

  ctx.restore();
}

function drawWaypointPad(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  label: string,
  accentHex: string,
  nowSec: number
) {
  const pulse = 0.5 + 0.5 * Math.sin(nowSec * 3.5);
  ctx.save();

  ctx.fillStyle = '#0F172A';
  ctx.fillRect(px + 3, py + 3, TILE_SIZE - 6, TILE_SIZE - 6);

  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 2;
  ctx.strokeRect(px + 4, py + 4, TILE_SIZE - 8, TILE_SIZE - 8);

  ctx.fillStyle = accentHex;
  ctx.globalAlpha = 0.22 + pulse * 0.2;
  ctx.fillRect(px + 6, py + 6, TILE_SIZE - 12, TILE_SIZE - 12);
  ctx.globalAlpha = 1;

  ctx.fillStyle = '#F8FAFC';
  ctx.font = 'bold 10px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, px + TILE_SIZE / 2, py + TILE_SIZE / 2 + 1);

  ctx.restore();
}

function drawPixelTower(
  ctx: CanvasRenderingContext2D,
  tower: Tower,
  element: BrickColor | 'kinetic',
  isSelected: boolean,
  isRelocating: boolean,
  nowSec: number
) {
  const cx = tower.x * TILE_SIZE + TILE_SIZE / 2;
  const cy = tower.y * TILE_SIZE + TILE_SIZE / 2;
  const elite = tower.level === ELITE_LEVEL;
  const light = element === 'kinetic' ? '#FEF08A' : BRICK_COLORS[element].lightHex;

  ctx.save();
  if (isRelocating) {
    ctx.globalAlpha = 0.45 + 0.2 * Math.sin(nowSec * 8);
  }

  if (isSelected) {
    ctx.strokeStyle = '#FDE047';
    ctx.lineWidth = 2;
    ctx.strokeRect(tower.x * TILE_SIZE + 1, tower.y * TILE_SIZE + 1, TILE_SIZE - 2, TILE_SIZE - 2);
  }

  // (No pulsing glow square under the turret any more: the turret's own palette and the
  // brick under it already show the element, and the pulse was noise across the board.)

  const kick = tower.type === 'pulse' ? 0 : Math.round(tower.recoil * 3.5);
  const voxels = spriteAtlas.hasVoxels();
  if (elite) drawEliteRing(ctx, cx, voxels ? cy + 8 : cy, voxels ? 0.42 : 1, light, nowSec);

  if (voxels) {
    // 3D figure baked in 16 aim directions; it stands on the lower part of its tile and
    // may rise above the tile, so towers are drawn top row first (see renderArenaFrame).
    const dir = tower.type === 'pulse' ? 2 : Math.round(tower.angle / (Math.PI / 8));
    const v = spriteAtlas.getVoxelTower(tower.type, element, dir, elite)!;
    const gx = cx - Math.round(Math.cos(tower.angle) * kick);
    const gy = cy + 7 - Math.round(Math.sin(tower.angle) * kick * 0.5);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
    ctx.beginPath();
    ctx.ellipse(cx + 1, cy + 8, 12, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.drawImage(v.canvas, Math.round(gx - v.groundX), Math.round(gy - v.groundY));
    if (tower.muzzleFlash > 0 && v.muzzle) {
      const snapped = (Math.round(tower.angle / (Math.PI / 8)) * Math.PI) / 8;
      const mx = Math.round(gx + Math.cos(snapped) * v.muzzle[0]);
      const my = Math.round(gy + Math.sin(snapped) * v.muzzle[0] * 0.5 - v.muzzle[1]);
      drawMuzzleFlash(ctx, mx, my, light, elite);
    }
    ctx.restore();
    drawLevelPips(ctx, tower);
    return;
  }

  const sprite = spriteAtlas.getTurret(tower.type, element, elite);
  ctx.translate(cx, cy);
  if (spriteAtlas.turretsFace()) {
    // Side-view figure: stands still, mirrors to face targets on the left, and sits two
    // pixels raised so its base rests on the lower part of the tile.
    if (tower.type !== 'pulse' && Math.cos(tower.angle) < 0) ctx.scale(-1, 1);
    ctx.drawImage(sprite, -16 - kick, -18, 32, 32);
  } else {
    // Top-down turret: rotates to aim, with barrel recoil kickback.
    ctx.rotate(tower.type !== 'pulse' ? tower.angle : nowSec * 0.6);
    ctx.drawImage(sprite, -16 - kick, -16, 32, 32);
  }

  // Element-colored muzzle flash spark (a lobbing catapult has no muzzle in side view)
  const flashes = tower.type !== 'pulse' && !(tower.type === 'cannon' && spriteAtlas.turretsFace());
  if (tower.muzzleFlash > 0 && flashes) {
    if (elite) {
      drawMuzzleFlash(ctx, 16 - kick, 0, light, true);
    } else {
      ctx.fillStyle = light;
      ctx.fillRect(13 - kick, -4, 6, 8);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(14 - kick, -2, 4, 4);
    }
  }

  ctx.restore();
  drawLevelPips(ctx, tower);
}

function drawLevelPips(ctx: CanvasRenderingContext2D, tower: Tower) {
  const elite = tower.level === ELITE_LEVEL;
  const pips = elite ? 3 : tower.level;
  for (let lv = 0; lv < pips; lv++) {
    const lx = tower.x * TILE_SIZE + 6 + lv * 8;
    const ly = tower.y * TILE_SIZE + TILE_SIZE - 6;
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(lx - 1, ly - 1, 6, 5);
    ctx.fillStyle = tower.level >= 3 ? '#FDE047' : '#F8FAFC';
    ctx.fillRect(lx, ly, 4, 3);
  }
  if (elite) {
    // Elite badge after the three gold pips: a small gold diamond with a white heart.
    const bx = tower.x * TILE_SIZE + 6 + 3 * 8 + 2;
    const by = tower.y * TILE_SIZE + TILE_SIZE - 5;
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(bx - 2, by - 3, 5, 7);
    ctx.fillRect(bx - 3, by - 2, 7, 5);
    ctx.fillStyle = '#FACC15';
    ctx.fillRect(bx - 1, by - 2, 3, 5);
    ctx.fillRect(bx - 2, by - 1, 5, 3);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(bx, by, 1, 1);
  }
}

/**
 * The rune ring under an Elite tower: an element-coloured ring (squashed to an ellipse in
 * 3D Worlds) with four gold runes slowly circling it. At most two Elites exist, so this
 * small per-frame drawing is affordable even on old phones.
 */
function drawEliteRing(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  squash: number,
  color: string,
  nowSec: number
) {
  // Wider than the tile, so it shows on the floor round the (same-coloured) brick.
  const r = 20;
  const pulse = 0.5 + 0.5 * Math.sin(nowSec * 3);
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * squash, 0, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.globalAlpha = 0.7 + pulse * 0.3;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.globalAlpha = 1;
  for (let i = 0; i < 4; i++) {
    const a = nowSec * 0.8 + (i * Math.PI) / 2;
    const rx = Math.round(x + Math.cos(a) * r);
    const ry = Math.round(y + Math.sin(a) * r * squash);
    ctx.fillStyle = '#1C1917';
    ctx.fillRect(rx - 2, ry - 3, 5, 6);
    ctx.fillRect(rx - 3, ry - 2, 7, 4);
    ctx.fillStyle = '#FACC15';
    ctx.fillRect(rx - 1, ry - 2, 3, 4);
    ctx.fillRect(rx - 2, ry - 1, 5, 2);
  }
  ctx.restore();
}

/** Muzzle flash; an Elite's is bigger, with a four-ray star. */
function drawMuzzleFlash(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, elite: boolean) {
  ctx.fillStyle = color;
  if (elite) {
    ctx.fillRect(x - 5, y - 1, 11, 3);
    ctx.fillRect(x - 1, y - 5, 3, 11);
    ctx.fillRect(x - 3, y - 3, 7, 7);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x - 2, y - 1, 5, 3);
    ctx.fillRect(x - 1, y - 2, 3, 5);
  } else {
    ctx.fillRect(x - 3, y - 3, 6, 6);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x - 1, y - 1, 3, 3);
  }
}

/**
 * Voxel sprites bake on first use (about 2 ms each on a laptop, maybe ten times that on an
 * old phone). Between waves, bake what the next wave will need a few milliseconds per
 * frame: every aim direction of the towers on the board, and every creep in all walking
 * directions, so the wave itself never waits on a bake.
 */
const CREEP_TRAITS: Creep['trait'][] = ['normal', 'swarm', 'armored', 'swift', 'regen', 'boss'];
let voxelWarmKey = -1;
function warmVoxelSprites(frame: RenderFrameInput, key: number, budgetMs = 3) {
  if (key === voxelWarmKey) return;
  const start = performance.now();
  const spent = () => performance.now() - start > budgetMs;
  for (const tower of frame.towers) {
    const element = towerElement(frame, tower);
    for (let d = 0; d < VOXEL_TOWER_DIRS; d++) {
      spriteAtlas.getVoxelTower(tower.type, element, d, tower.level === ELITE_LEVEL);
      if (spent()) return;
    }
  }
  for (const hero of [undefined, 'vanguard', 'warden'] as const) {
    for (const trait of hero ? (['normal'] as const) : CREEP_TRAITS) {
      for (let d = 0; d < 4; d++) {
        spriteAtlas.getVoxelCreep(trait, hero, d, 0);
        spriteAtlas.getVoxelCreep(trait, hero, d, 1);
        if (spent()) return;
      }
    }
  }
  voxelWarmKey = key;
}

/** Last walking direction (0 right, 1 down, 2 left, 3 up) per creep, kept while it pauses. */
const creepDirs = new WeakMap<Creep, number>();

/** Which of four directions a 3D creep faces, from the waypoint it is walking to. */
function creepDir4(creep: Creep): number {
  const target = creep.path[creep.pathIndex];
  if (target) {
    const dx = target.x * TILE_SIZE + TILE_SIZE / 2 - creep.x;
    const dy = target.y * TILE_SIZE + TILE_SIZE / 2 - creep.y;
    if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
      creepDirs.set(creep, Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 0 : 2) : dy > 0 ? 1 : 3);
    }
  }
  return creepDirs.get(creep) ?? 0;
}

/** Side-view creeps face their walking direction; on vertical legs they keep the last one. */
function creepWalksLeft(creep: Creep): boolean {
  const target = creep.path[creep.pathIndex];
  if (target) {
    const dx = target.x * TILE_SIZE + TILE_SIZE / 2 - creep.x;
    if (dx < -0.5) creepFacesLeft.set(creep, true);
    else if (dx > 0.5) creepFacesLeft.set(creep, false);
  }
  return creepFacesLeft.get(creep) ?? false;
}

function drawCreep(ctx: CanvasRenderingContext2D, creep: Creep) {
  const frameIdx: 0 | 1 = Math.floor(creep.animTime * 6) % 2 === 0 ? 0 : 1;
  const voxel = spriteAtlas.hasVoxels()
    ? spriteAtlas.getVoxelCreep(creep.trait, creep.hero, creepDir4(creep), frameIdx)
    : null;
  const sprite = voxel
    ? voxel.canvas
    : (creep.hero && spriteAtlas.getHero(creep.hero, frameIdx)) || spriteAtlas.getCreep(creep.trait, frameIdx);
  const pixelW = creep.trait === 'boss' ? 30 : creep.hero ? 28 : creep.trait === 'swarm' ? 18 : 24;
  // A voxel creep's footprint is about 60% of its canvas; its drawn height is the model's.
  const drawW = voxel ? Math.round(sprite.width * 0.6) : pixelW;
  const drawH = voxel ? Math.round(voxel.height + 3) : Math.round((sprite.height / sprite.width) * drawW);
  const x = Math.round(creep.x);
  const y = Math.round(creep.y);

  const isSlowed = creep.slowTimer > 0;
  const isHeavySlow = isSlowed && creep.slowFactor >= 0.45;
  const isPoisoned = creep.poisonTimer > 0;
  const isBurning = creep.burnTimer > 0;
  const isShredded = creep.shredTimer > 0;

  // Under-feet Venom / Slow sludge ring (renders beneath creep so slowed mobs pop immediately)
  if (isSlowed) {
    const padR = Math.round(drawW * 0.56);
    const padY = Math.round(y + drawH * 0.28);
    ctx.save();
    ctx.fillStyle = isHeavySlow ? 'rgba(16, 185, 129, 0.42)' : 'rgba(16, 185, 129, 0.28)';
    ctx.beginPath();
    ctx.ellipse(x, padY, padR, Math.max(4, Math.round(padR * 0.42)), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = isHeavySlow ? '#6EE7B7' : '#34D399';
    ctx.lineWidth = isHeavySlow ? 2 : 1.5;
    ctx.stroke();
    ctx.restore();
  } else if (voxel) {
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(x, y + 5, Math.round(drawW * 0.45), Math.round(drawW * 0.2), 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Standard soft ground shadow
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(x - Math.floor(drawW * 0.35), y + Math.floor(drawH * 0.3), Math.floor(drawW * 0.7), 4);
  }

  // Blit the creep: a voxel sprite stands on its ground point; a pixel sprite is centred.
  const spriteLeft = Math.round(x - drawW / 2);
  const spriteTop = voxel ? Math.round(y + 5 - drawH) : Math.round(y - drawH / 2);
  if (voxel) {
    ctx.drawImage(sprite, Math.round(x - voxel.groundX), Math.round(y + 5 - voxel.groundY));
  } else if (spriteAtlas.creepsFaceSideways() && creepWalksLeft(creep)) {
    ctx.save();
    ctx.translate(spriteLeft + drawW, spriteTop);
    ctx.scale(-1, 1);
    ctx.drawImage(sprite, 0, 0, drawW, drawH);
    ctx.restore();
  } else {
    ctx.drawImage(sprite, spriteLeft, spriteTop, drawW, drawH);
  }

  // One cue per status: slow = the ground ring above, poison = rising bubbles,
  // burn = flame pip, shred = amber pip. (The green tint, green HP border and ▼ pip that
  // used to repeat "slowed" are gone.)
  if (isPoisoned && !renderQuality.low) {
    const bubbleCount = 2;
    for (let b = 0; b < bubbleCount; b++) {
      const phase = (creep.animTime * 1.9 + b * 0.41) % 1;
      const bx = x - Math.floor(drawW * 0.3) + b * Math.floor(drawW * 0.3);
      const by = Math.round(spriteTop + drawH * 0.45 - phase * (drawH * 0.75));
      ctx.fillStyle = b % 2 === 0 ? '#86EFAC' : '#10B981';
      ctx.fillRect(bx, by, 3, 3);
    }
  }

  // Compact animated flame pips for Fire Burn
  if (isBurning) {
    const fl = Math.floor(creep.animTime * 14) % 2;
    ctx.fillStyle = '#EF4444';
    ctx.fillRect(spriteLeft + 1, spriteTop - 2 - fl, 4, 4);
    ctx.fillStyle = '#FDE047';
    ctx.fillRect(spriteLeft + 2, spriteTop - 1 - fl, 2, 2);
  }

  // HP bar only once the creep is hurt (bosses always show theirs), so a fresh wave
  // walking in is not a row of identical full green bars.
  const barW = Math.max(18, drawW + 2);
  const barX = x - Math.floor(barW / 2);
  const barY = spriteTop - 7;
  const hpRatio = Math.max(0, Math.min(1, creep.hp / creep.maxHp));

  if (hpRatio < 1 || creep.trait === 'boss' || creep.hero) {
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(barX - 1, barY - 1, barW + 2, 5);
    ctx.fillStyle = hpRatio > 0.5 ? '#22C55E' : hpRatio > 0.25 ? '#F59E0B' : '#EF4444';
    ctx.fillRect(barX, barY, Math.round(barW * hpRatio), 3);
  }

  if (isShredded) {
    ctx.fillStyle = '#F59E0B';
    ctx.fillRect(barX - 5, barY, 2, 3);
  }

  // Escort heroes carry a badge beside their HP bar: the vanguard a blue arrow
  // (it speeds the wave up), the warden a green cross (it heals the wave).
  if (creep.hero) {
    const bx = barX + barW + 2;
    const by = barY - 3;
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(bx - 1, by - 1, 9, 9);
    ctx.fillStyle = creep.hero === 'vanguard' ? '#38BDF8' : '#4ADE80';
    ctx.fillRect(bx, by, 7, 7);
    ctx.fillStyle = '#F8FAFC';
    if (creep.hero === 'vanguard') {
      ctx.fillRect(bx + 1, by + 3, 4, 1);
      ctx.fillRect(bx + 3, by + 2, 1, 3);
      ctx.fillRect(bx + 4, by + 3, 2, 1);
    } else {
      ctx.fillRect(bx + 3, by + 1, 1, 5);
      ctx.fillRect(bx + 1, by + 3, 5, 1);
    }
  }
}

function drawStylizedProjectile(ctx: CanvasRenderingContext2D, proj: Projectile) {
  const progress =
    proj.distanceTotal > 0
      ? Math.max(0, Math.min(1, proj.distanceTraveled / proj.distanceTotal))
      : 0;
  const arcZ = proj.arcHeight > 0 ? Math.sin(progress * Math.PI) * proj.arcHeight : 0;
  const elColor = getElementAccent(proj.element);

  // 1. Stepped pixel elemental motion trail (only the newest two dots in low quality)
  const trailStart = renderQuality.low ? Math.max(0, proj.trail.length - 2) : 0;
  for (let i = trailStart; i < proj.trail.length; i++) {
    const pt = proj.trail[i];
    const ratio = (i + 1) / (proj.trail.length + 1);
    ctx.globalAlpha = ratio * 0.65;
    const sz =
      proj.towerType === 'cannon'
        ? Math.max(3, Math.round(7 * ratio))
        : Math.max(2, Math.round(5 * ratio));
    ctx.fillStyle =
      proj.element === 'red' && i % 2 === 0
        ? '#FDE047'
        : proj.element === 'green' && i % 2 === 0
          ? '#6EE7B7'
          : elColor;
    ctx.fillRect(Math.round(pt.x - sz / 2), Math.round(pt.y - pt.z - sz / 2), sz, sz);
  }
  ctx.globalAlpha = 1;

  const drawX = Math.round(proj.x);
  const drawY = Math.round(proj.y - arcZ);

  // Ground shadow for arcing Cannon shells
  if (proj.arcHeight > 0) {
    const shadowScale = 1 - Math.min(0.45, arcZ / 70);
    const sw = Math.max(6, Math.round(14 * shadowScale));
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(Math.round(proj.x - sw / 2), Math.round(proj.y - 2), sw, 4);
  }

  // Blit crisp elemental pixel projectile sprite
  const sprite = spriteAtlas.getProjectile(proj.element);
  const size = proj.towerType === 'cannon' ? 16 : 13;

  ctx.save();
  ctx.translate(drawX, drawY);
  ctx.rotate(proj.towerType === 'cannon' ? proj.spin : proj.angle);
  ctx.drawImage(sprite, -Math.floor(size / 2), -Math.floor(size / 2), size, size);

  // Secondary elemental glint for dual-color Master Bricks
  if (proj.secondaryElement && proj.secondaryElement !== proj.element) {
    ctx.fillStyle = BRICK_COLORS[proj.secondaryElement].lightHex;
    ctx.fillRect(-2, -2, 4, 4);
  }
  ctx.restore();
}

export function renderArenaFrame(ctx: CanvasRenderingContext2D, frame: RenderFrameInput) {
  ctx.imageSmoothingEnabled = false;
  const world = activeWorld();
  const theme = world.boards[frame.themeId];
  updateRenderQuality(frame.nowSec);
  attachFontListener();

  occupied.fill(0);
  for (const t of frame.towers) occupied[t.y * GRID_COLS + t.x] = 1;
  const isOccupied = (x: number, y: number) => occupied[y * GRID_COLS + x] === 1;

  const g = hashGrid(frame);
  if (g !== gridHash) {
    gridHash = g;
    rebuildGridDerived(frame);
  }

  if (frame.phase !== 'COMBAT' && spriteAtlas.hasVoxels()) {
    // Elite towers bake their own model, so promotions re-warm too.
    let warm = mix(g, hashText(activeWorld().id));
    for (const t of frame.towers) if (t.level === ELITE_LEVEL) warm = mix(warm, t.y * GRID_COLS + t.x + 1);
    warmVoxelSprites(frame, warm);
  }

  // 1. Floor + bricks from the cached board layer (repainted only when something changed)
  const cw = ctx.canvas?.width ?? CANVAS_WIDTH;
  const ch = ctx.canvas?.height ?? CANVAS_HEIGHT;
  let v = mix(g, THEME_IDS.indexOf(frame.themeId));
  v = mix(v, hashText(world.id));
  v = mix(v, Math.round(frame.camera.zoom * 1000));
  v = mix(v, Math.round(frame.camera.panX * 100));
  v = mix(v, Math.round(frame.camera.panY * 100));
  v = mix(v, fontEpoch);
  v = mix(v, cw * 4096 + ch);
  if (!boardCanvas || v !== boardViewHash) {
    if (!boardCanvas) boardCanvas = document.createElement('canvas');
    if (boardCanvas.width !== cw) boardCanvas.width = cw;
    if (boardCanvas.height !== ch) boardCanvas.height = ch;
    const bctx = boardCanvas.getContext('2d');
    if (bctx) {
      paintBoard(bctx, ctx.getTransform?.(), frame, theme, world.brickStyle);
      boardViewHash = v;
    }
  }
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(boardCanvas, 0, 0);
  ctx.restore();

  ctx.save();
  // Apply camera zoom & pan transform
  ctx.translate(frame.camera.panX, frame.camera.panY);
  ctx.scale(frame.camera.zoom, frame.camera.zoom);

  // 2. Animated BFS Route
  const drawRoute = (coords: Coord[], color: string, alpha: number, dashOffset: number) => {
    if (coords.length < 2) return;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 6]);
    ctx.lineDashOffset = -dashOffset;
    ctx.beginPath();
    coords.forEach((c, idx) => {
      const rx = c.x * TILE_SIZE + TILE_SIZE / 2;
      const ry = c.y * TILE_SIZE + TILE_SIZE / 2;
      if (idx === 0) ctx.moveTo(rx, ry);
      else ctx.lineTo(rx, ry);
    });
    ctx.stroke();
    ctx.restore();
  };

  if (frame.previewPath && frame.previewValid && frame.phase === 'BUILD_PLACE') {
    drawRoute(frame.path, theme.pathColor, 0.2, frame.nowSec * 18);
    drawRoute(frame.previewPath, '#34D399', 0.78, frame.nowSec * 36);
  } else {
    drawRoute(frame.path, theme.pathColor, frame.phase === 'COMBAT' ? 0.3 : 0.58, frame.nowSec * 22);
  }

  // 3. Animated waypoint pads and draft-pick overlays (the bricks themselves are cached)
  for (const wp of waypointCells) {
    drawWaypointPad(ctx, wp.px, wp.py, wp.label, wp.accent, frame.nowSec);
  }

  if (frame.phase === 'BUILD_PICK' && draftCells.length > 0) {
    // Nothing chosen yet: all four pulse. One chosen: it gets a steady outline and
    // the others dim, since they are the ones that will harden into gray walls.
    const sel = frame.selectedCoord;
    const draftChosen = sel !== null && frame.grid[sel.y]?.[sel.x]?.kind === 'TURN_DRAFT';
    for (const cell of draftCells) {
      const px = cell.x * TILE_SIZE;
      const py = cell.y * TILE_SIZE;
      const isChosen = draftChosen && sel!.x === cell.x && sel!.y === cell.y;
      ctx.save();
      if (isChosen) {
        ctx.strokeStyle = '#F8FAFC';
        ctx.lineWidth = 3;
        ctx.strokeRect(px + 1.5, py + 1.5, TILE_SIZE - 3, TILE_SIZE - 3);
      } else if (draftChosen) {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.5)';
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
      } else {
        ctx.strokeStyle = '#FDE047';
        ctx.globalAlpha = 0.55 + 0.45 * Math.sin(frame.nowSec * 6.5);
        ctx.lineWidth = 3;
        ctx.strokeRect(px + 1.5, py + 1.5, TILE_SIZE - 3, TILE_SIZE - 3);
      }
      ctx.restore();
    }
  }

  // 4. Synergy Circuit Links
  for (const link of frame.synergyLinks) {
    const x1 = link.from.x * TILE_SIZE + TILE_SIZE / 2;
    const y1 = link.from.y * TILE_SIZE + TILE_SIZE / 2;
    const x2 = link.to.x * TILE_SIZE + TILE_SIZE / 2;
    const y2 = link.to.y * TILE_SIZE + TILE_SIZE / 2;
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;

    const pulse = 0.65 + 0.35 * Math.sin(frame.nowSec * 4.5 + x1 * 0.05);
    ctx.save();
    ctx.strokeStyle = '#FDE047';
    ctx.globalAlpha = pulse * 0.78;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    ctx.fillStyle = '#0F172A';
    ctx.fillRect(mx - 4, my - 4, 8, 8);
    ctx.fillStyle = '#FEF08A';
    ctx.fillRect(mx - 2, my - 2, 4, 4);
    ctx.restore();
  }

  // 5. Valid relocation targets
  if (frame.relocatingTowerId && frame.phase !== 'COMBAT') {
    const pulse = 0.45 + 0.35 * Math.sin(frame.nowSec * 6);
    for (let y = 0; y < GRID_ROWS; y++) {
      for (let x = 0; x < GRID_COLS; x++) {
        const cell = frame.grid[y][x];
        const canMount =
          (cell.kind === 'GRAY_WALL' ||
            cell.kind === 'ACTIVE_BRICK' ||
            cell.kind === 'MASTER_BRICK') &&
          !isOccupied(x, y);
        if (canMount) {
          ctx.save();
          ctx.strokeStyle = '#34D399';
          ctx.globalAlpha = pulse;
          ctx.lineWidth = 2;
          ctx.strokeRect(x * TILE_SIZE + 3, y * TILE_SIZE + 3, TILE_SIZE - 6, TILE_SIZE - 6);
          ctx.restore();
        }
      }
    }
  }

  // 6. Selected Tower Range Circle
  const selectedTower = frame.selectedCoord
    ? frame.towers.find(
        (t) => t.x === frame.selectedCoord!.x && t.y === frame.selectedCoord!.y
      )
    : undefined;

  if (selectedTower) {
    const mods = computeTileModifiers(frame.grid, selectedTower.x, selectedTower.y);
    const def = TOWER_DEFS[selectedTower.type];
    const levelRangeMult = TOWER_LEVEL_SCALES[selectedTower.level].range;
    const rangePx = def.baseRange * levelRangeMult * mods.rangeMult * TILE_SIZE;
    const cx = selectedTower.x * TILE_SIZE + TILE_SIZE / 2;
    const cy = selectedTower.y * TILE_SIZE + TILE_SIZE / 2;
    const ringHex = getElementAccent(mods.primaryElement);

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, rangePx, 0, Math.PI * 2);
    ctx.fillStyle = `${ringHex}18`;
    ctx.fill();
    ctx.strokeStyle = `${ringHex}AA`;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 5]);
    ctx.stroke();
    ctx.restore();
  }

  // 7. Hover Preview (Brick Draft / Replant Gray / Weapon Mount)
  if (frame.hoverCoord) {
    const { x, y } = frame.hoverCoord;
    const cell = frame.grid[y]?.[x];
    const px = x * TILE_SIZE;
    const py = y * TILE_SIZE;
    const isUnoccupiedGray = cell?.kind === 'GRAY_WALL' && !isOccupied(x, y);

    if (frame.phase === 'BUILD_PLACE' && frame.nextDraftColor && cell) {
      if ((cell.kind === 'OPEN' || isUnoccupiedGray) && frame.previewValid) {
        const meta = BRICK_COLORS[frame.nextDraftColor];
        drawBrickTile(ctx, px, py, meta.hex, meta.lightHex, meta.darkHex, {
          style: world.brickStyle,
          alpha: 0.78,
          emblem: spriteAtlas.getEmblem(frame.nextDraftColor),
        });
        if (isUnoccupiedGray) {
          ctx.save();
          ctx.strokeStyle = '#38BDF8';
          ctx.lineWidth = 2;
          ctx.strokeRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4);
          ctx.restore();
        }
      } else if (cell.kind === 'OPEN' && !frame.previewValid) {
        ctx.save();
        ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
        ctx.fillRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4);
        ctx.strokeStyle = '#EF4444';
        ctx.lineWidth = 2;
        ctx.strokeRect(px + 3, py + 3, TILE_SIZE - 6, TILE_SIZE - 6);
        ctx.beginPath();
        ctx.moveTo(px + 9, py + 9);
        ctx.lineTo(px + TILE_SIZE - 9, py + TILE_SIZE - 9);
        ctx.moveTo(px + TILE_SIZE - 9, py + 9);
        ctx.lineTo(px + 9, py + TILE_SIZE - 9);
        ctx.stroke();
        ctx.restore();
      }
    } else if (
      (frame.placingTowerType || frame.relocatingTowerId) &&
      cell &&
      (cell.kind === 'GRAY_WALL' ||
        cell.kind === 'ACTIVE_BRICK' ||
        cell.kind === 'MASTER_BRICK') &&
      !isOccupied(x, y)
    ) {
      const tType =
        frame.placingTowerType ??
        frame.towers.find((t) => t.id === frame.relocatingTowerId)?.type;
      if (tType) {
        const mods = computeTileModifiers(frame.grid, x, y);
        const def = TOWER_DEFS[tType];
        const rangePx = def.baseRange * mods.rangeMult * TILE_SIZE;
        const previewColor = getElementAccent(mods.primaryElement);
        ctx.save();
        ctx.beginPath();
        ctx.arc(px + TILE_SIZE / 2, py + TILE_SIZE / 2, rangePx, 0, Math.PI * 2);
        ctx.fillStyle = `${previewColor}1A`;
        ctx.fill();
        ctx.strokeStyle = previewColor;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.lineWidth = 2;
        ctx.strokeRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4);
        ctx.restore();
      }
    }
  }

  // 8. Selected empty brick outline
  if (frame.selectedCoord && !selectedTower) {
    ctx.save();
    ctx.strokeStyle = '#F8FAFC';
    ctx.lineWidth = 2;
    ctx.strokeRect(
      frame.selectedCoord.x * TILE_SIZE + 1,
      frame.selectedCoord.y * TILE_SIZE + 1,
      TILE_SIZE - 2,
      TILE_SIZE - 2
    );
    ctx.restore();
  }

  // 9. Element-Infused Weapon Turrets. 3D figures rise above their tile, so draw the
  // top rows first and let lower towers overlap the ones behind them.
  const towerOrder = spriteAtlas.hasVoxels()
    ? [...frame.towers].sort((a, b) => a.y - b.y || a.x - b.x)
    : frame.towers;
  for (const tower of towerOrder) {
    const isSel =
      frame.selectedCoord?.x === tower.x && frame.selectedCoord?.y === tower.y;
    const isReloc = frame.relocatingTowerId === tower.id;
    drawPixelTower(ctx, tower, towerElement(frame, tower), isSel, isReloc, frame.nowSec);
  }

  // 10. Animated Pixel Creeps
  for (const creep of frame.creeps) {
    drawCreep(ctx, creep);
  }

  // 11. Subtle Expanding Impact & Pulse Rings (crisp & readable without covering the maze)
  for (const ring of frame.impactRings) {
    const t = 1 - Math.max(0, ring.ttl / ring.maxTtl);
    const fade = 1 - t;
    const radius = Math.max(4, ring.maxRadius * (0.28 + 0.72 * t));
    ctx.save();
    if (ring.fillAlpha) {
      ctx.globalAlpha = fade * Math.min(0.09, ring.fillAlpha);
      ctx.fillStyle = ring.color;
      ctx.beginPath();
      ctx.arc(Math.round(ring.x), Math.round(ring.y), Math.round(radius), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = fade * 0.5;
    ctx.strokeStyle = ring.color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(Math.round(ring.x), Math.round(ring.y), Math.round(radius), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // 12. Forked Lightning Chains & Rail Sniper Beams
  for (const beam of frame.beams) {
    const alpha = Math.max(0, beam.ttl / beam.maxTtl);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = beam.color;
    ctx.lineWidth = beam.width + 2;
    ctx.beginPath();
    beam.points.forEach((pt, idx) => {
      if (idx === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    });
    ctx.stroke();

    ctx.strokeStyle = beam.coreColor ?? '#FFFFFF';
    ctx.lineWidth = Math.max(1.5, beam.width - 1);
    ctx.stroke();
    ctx.restore();
  }

  // 13. Elemental Projectiles with Trails & Arcs
  for (const proj of frame.projectiles) {
    drawStylizedProjectile(ctx, proj);
  }

  // 14. Pixel Particles (newest first wins when over the cap; no per-particle save/restore)
  const particleCap = renderQuality.low ? PARTICLE_CAP_LOW : PARTICLE_CAP_HIGH;
  for (let i = Math.max(0, frame.particles.length - particleCap); i < frame.particles.length; i++) {
    const p = frame.particles[i];
    ctx.globalAlpha = Math.max(0, p.ttl / p.maxTtl);
    ctx.fillStyle = p.color;
    ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
  }
  ctx.globalAlpha = 1;

  // 15. Floating numbers (crits, kill bounties, wave banner)
  if (frame.floatingTexts.length > 0) {
    ctx.font = 'bold 11px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    for (const ft of frame.floatingTexts) {
      ctx.globalAlpha = Math.max(0, ft.ttl / ft.maxTtl);
      ctx.fillStyle = '#0F172A';
      ctx.fillText(ft.text, Math.round(ft.x) + 1, Math.round(ft.y) + 1);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, Math.round(ft.x), Math.round(ft.y));
    }
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}
