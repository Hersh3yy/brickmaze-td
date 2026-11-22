import {
  BOARD_THEMES,
  BRICK_COLORS,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  GRID_COLS,
  GRID_ROWS,
  TILE_SIZE,
  TOWER_DEFS,
} from '../domain/constants';
import type {
  BeamEffect,
  BoardThemeId,
  BrickColor,
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
import { spriteAtlas } from './spriteAtlas';

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

  ctx.fillStyle = 'rgba(0, 0, 0, 0.48)';
  ctx.fillRect(x + 2, y + 3, w, h);

  ctx.fillStyle = darkHex;
  ctx.fillRect(x, y, w, h);

  ctx.fillStyle = bodyHex;
  ctx.fillRect(x + 2, y + 2, w - 4, h - 5);

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
  ctx.fillRect(x + 2, y + 2, 2, h - 5);

  const studOffsets = [
    { ox: 7, oy: 6, isSec: false },
    { ox: 20, oy: 6, isSec: false },
    { ox: 7, oy: 18, isSec: false },
    { ox: 20, oy: 18, isSec: true },
  ];

  for (const st of studOffsets) {
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
  const sprite = spriteAtlas.getTurret(tower.type, element);

  ctx.save();
  if (isRelocating) {
    ctx.globalAlpha = 0.45 + 0.2 * Math.sin(nowSec * 8);
  }

  if (isSelected) {
    ctx.strokeStyle = '#FDE047';
    ctx.lineWidth = 2;
    ctx.strokeRect(tower.x * TILE_SIZE + 1, tower.y * TILE_SIZE + 1, TILE_SIZE - 2, TILE_SIZE - 2);
  }

  // Elementally tinted glow under turret mount when on a colored brick
  if (element !== 'kinetic') {
    ctx.fillStyle = BRICK_COLORS[element].hex;
    ctx.globalAlpha = (isRelocating ? 0.25 : 0.35) + 0.12 * Math.sin(nowSec * 5);
    ctx.fillRect(cx - 12, cy - 12, 24, 24);
    ctx.globalAlpha = isRelocating ? 0.55 : 1;
  }

  // Draw rotating 16x16 pixel sprite with barrel recoil kickback
  ctx.translate(cx, cy);
  if (tower.type !== 'pulse') {
    ctx.rotate(tower.angle);
  } else {
    ctx.rotate(nowSec * 0.6);
  }

  const kick = tower.type === 'pulse' ? 0 : Math.round(tower.recoil * 3.5);
  ctx.drawImage(sprite, -16 - kick, -16, 32, 32);

  // Element-colored muzzle flash spark
  if (tower.muzzleFlash > 0 && tower.type !== 'pulse') {
    ctx.fillStyle = element === 'kinetic' ? '#FEF08A' : BRICK_COLORS[element].lightHex;
    ctx.fillRect(13 - kick, -4, 6, 8);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(14 - kick, -2, 4, 4);
  }

  ctx.restore();

  // Level pips
  for (let lv = 0; lv < tower.level; lv++) {
    const lx = tower.x * TILE_SIZE + 6 + lv * 8;
    const ly = tower.y * TILE_SIZE + TILE_SIZE - 6;
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(lx - 1, ly - 1, 6, 5);
    ctx.fillStyle = tower.level === 3 ? '#FDE047' : '#F8FAFC';
    ctx.fillRect(lx, ly, 4, 3);
  }
}

function drawCreep(ctx: CanvasRenderingContext2D, creep: Creep) {
  const frameIdx: 0 | 1 = Math.floor(creep.animTime * 6) % 2 === 0 ? 0 : 1;
  const sprite = spriteAtlas.getCreep(creep.trait, frameIdx);
  const drawW = creep.trait === 'boss' ? 30 : creep.trait === 'swarm' ? 18 : 24;
  const drawH = Math.round((sprite.height / sprite.width) * drawW);
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
  } else {
    // Standard soft ground shadow
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(x - Math.floor(drawW * 0.35), y + Math.floor(drawH * 0.3), Math.floor(drawW * 0.7), 4);
  }

  // Blit crisp pixel-art animated creep sprite
  const spriteLeft = Math.round(x - drawW / 2);
  const spriteTop = Math.round(y - drawH / 2);
  ctx.drawImage(sprite, spriteLeft, spriteTop, drawW, drawH);

  // Subtle translucent toxic tint + animated rising venom bubbles for slowed/poisoned mobs
  if (isSlowed || isPoisoned) {
    ctx.save();
    ctx.fillStyle = isHeavySlow ? 'rgba(52, 211, 153, 0.28)' : 'rgba(16, 185, 129, 0.2)';
    ctx.fillRect(spriteLeft + 2, spriteTop + 2, drawW - 4, drawH - 4);
    ctx.restore();

    const bubbleCount = isHeavySlow ? 3 : 2;
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

  // Crisp HP bar (bordered emerald when slowed so debuff status reads even zoomed out)
  const barW = Math.max(18, drawW + 2);
  const barX = x - Math.floor(barW / 2);
  const barY = spriteTop - 7;
  const hpRatio = Math.max(0, Math.min(1, creep.hp / creep.maxHp));

  ctx.fillStyle = isSlowed ? '#064E3B' : '#0F172A';
  ctx.fillRect(barX - 1, barY - 1, barW + 2, 5);
  if (isSlowed) {
    ctx.strokeStyle = isHeavySlow ? '#6EE7B7' : '#34D399';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX - 1.5, barY - 1.5, barW + 3, 6);
  }
  ctx.fillStyle = hpRatio > 0.5 ? '#22C55E' : hpRatio > 0.25 ? '#F59E0B' : '#EF4444';
  ctx.fillRect(barX, barY, Math.round(barW * hpRatio), 3);

  // Compact debuff pips right beside the HP bar (▼ = slowed, ! = armor shredded)
  if (isSlowed) {
    const cx = barX + barW + 4;
    const cy = barY;
    ctx.fillStyle = isHeavySlow ? '#A7F3D0' : '#34D399';
    ctx.fillRect(cx - 2, cy, 5, 1);
    ctx.fillRect(cx - 1, cy + 1, 3, 1);
    ctx.fillRect(cx, cy + 2, 1, 2);
  }
  if (isShredded) {
    ctx.fillStyle = '#F59E0B';
    ctx.fillRect(barX - 5, barY, 2, 3);
  }
}

function drawStylizedProjectile(ctx: CanvasRenderingContext2D, proj: Projectile) {
  const progress =
    proj.distanceTotal > 0
      ? Math.max(0, Math.min(1, proj.distanceTraveled / proj.distanceTotal))
      : 0;
  const arcZ = proj.arcHeight > 0 ? Math.sin(progress * Math.PI) * proj.arcHeight : 0;
  const elColor = getElementAccent(proj.element);

  // 1. Stepped pixel elemental motion trail
  for (let i = 0; i < proj.trail.length; i++) {
    const pt = proj.trail[i];
    const ratio = (i + 1) / (proj.trail.length + 1);
    ctx.save();
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
    ctx.restore();
  }

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
  const theme = BOARD_THEMES[frame.themeId];

  // Clear entire viewport
  ctx.fillStyle = theme.baseBg;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  ctx.save();
  // Apply camera zoom & pan transform
  ctx.translate(frame.camera.panX, frame.camera.panY);
  ctx.scale(frame.camera.zoom, frame.camera.zoom);

  // 1. Dimpled plastic baseplate grid
  for (let y = 0; y < GRID_ROWS; y++) {
    for (let x = 0; x < GRID_COLS; x++) {
      const px = x * TILE_SIZE;
      const py = y * TILE_SIZE;
      ctx.fillStyle = (x + y) % 2 === 0 ? theme.cellFill : theme.cellAlt;
      ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

      ctx.fillStyle = theme.studDot;
      ctx.fillRect(px + 9, py + 9, 3, 3);
      ctx.fillRect(px + 24, py + 9, 3, 3);
      ctx.fillRect(px + 9, py + 24, 3, 3);
      ctx.fillRect(px + 24, py + 24, 3, 3);

      ctx.strokeStyle = theme.gridLine;
      ctx.lineWidth = 1;
      ctx.strokeRect(px + 0.5, py + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
    }
  }

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

  // 3. Bricks & Waypoints
  const towerSet = new Set(frame.towers.map((t) => `${t.x},${t.y}`));

  for (let y = 0; y < GRID_ROWS; y++) {
    for (let x = 0; x < GRID_COLS; x++) {
      const cell = frame.grid[y][x];
      const px = x * TILE_SIZE;
      const py = y * TILE_SIZE;
      const hasTower = towerSet.has(`${x},${y}`);

      switch (cell.kind) {
        case 'START':
          drawWaypointPad(ctx, px, py, 'IN', '#10B981', frame.nowSec);
          break;
        case 'CP1':
          drawWaypointPad(ctx, px, py, '1', '#F59E0B', frame.nowSec);
          break;
        case 'CP2':
          drawWaypointPad(ctx, px, py, '2', '#F59E0B', frame.nowSec);
          break;
        case 'CP3':
          drawWaypointPad(ctx, px, py, '3', '#F59E0B', frame.nowSec);
          break;
        case 'EXIT':
          drawWaypointPad(ctx, px, py, 'OUT', '#EF4444', frame.nowSec);
          break;
        case 'GRAY_WALL':
          drawBrickTile(ctx, px, py, theme.grayWall, theme.grayWallLight, theme.grayWallDark);
          break;
        case 'TURN_DRAFT': {
          const meta = BRICK_COLORS[cell.color ?? 'yellow'];
          drawBrickTile(ctx, px, py, meta.hex, meta.lightHex, meta.darkHex, {
            isActiveGlow: true,
            glyph: meta.glyph,
          });
          if (frame.phase === 'BUILD_PICK') {
            const pulse = 0.55 + 0.45 * Math.sin(frame.nowSec * 6.5);
            ctx.save();
            ctx.strokeStyle = '#FDE047';
            ctx.globalAlpha = pulse;
            ctx.lineWidth = 3;
            ctx.strokeRect(px + 1.5, py + 1.5, TILE_SIZE - 3, TILE_SIZE - 3);
            ctx.restore();
          }
          break;
        }
        case 'ACTIVE_BRICK': {
          const meta = BRICK_COLORS[cell.color ?? 'yellow'];
          drawBrickTile(ctx, px, py, meta.hex, meta.lightHex, meta.darkHex, {
            isActiveGlow: true,
            glyph: hasTower ? undefined : meta.glyph,
          });
          break;
        }
        case 'MASTER_BRICK': {
          const metaA = BRICK_COLORS[cell.color ?? 'red'];
          const metaB = BRICK_COLORS[cell.secondaryColor ?? cell.color ?? 'yellow'];
          const isDouble = !cell.secondaryColor || cell.secondaryColor === cell.color;
          drawBrickTile(ctx, px, py, metaA.hex, metaA.lightHex, metaA.darkHex, {
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
          !towerSet.has(`${x},${y}`);
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
    const levelRangeMult = 1 + (selectedTower.level - 1) * 0.1;
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
    const isUnoccupiedGray = cell?.kind === 'GRAY_WALL' && !towerSet.has(`${x},${y}`);

    if (frame.phase === 'BUILD_PLACE' && frame.nextDraftColor && cell) {
      if ((cell.kind === 'OPEN' || isUnoccupiedGray) && frame.previewValid) {
        const meta = BRICK_COLORS[frame.nextDraftColor];
        drawBrickTile(ctx, px, py, meta.hex, meta.lightHex, meta.darkHex, {
          alpha: 0.78,
          glyph: meta.glyph,
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
      !towerSet.has(`${x},${y}`)
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

  // 9. Element-Infused Weapon Turrets
  for (const tower of frame.towers) {
    const isSel =
      frame.selectedCoord?.x === tower.x && frame.selectedCoord?.y === tower.y;
    const isReloc = frame.relocatingTowerId === tower.id;
    const mods = computeTileModifiers(frame.grid, tower.x, tower.y);
    drawPixelTower(ctx, tower, mods.primaryElement, isSel, isReloc, frame.nowSec);
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

  // 14. Pixel Particles
  for (const p of frame.particles) {
    const alpha = Math.max(0, p.ttl / p.maxTtl);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    ctx.restore();
  }

  // 15. Floating Numbers
  for (const ft of frame.floatingTexts) {
    const alpha = Math.max(0, ft.ttl / ft.maxTtl);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = 'bold 11px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#0F172A';
    ctx.fillText(ft.text, Math.round(ft.x) + 1, Math.round(ft.y) + 1);
    ctx.fillStyle = ft.color;
    ctx.fillText(ft.text, Math.round(ft.x), Math.round(ft.y));
    ctx.restore();
  }

  ctx.restore();
}
