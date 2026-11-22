import { BRICK_COLORS, GRID_COLS, GRID_ROWS, SYNERGY_CATALOG } from './constants';
import type {
  BrickColor,
  Coord,
  GridCell,
  PlacedTurnEntry,
  SynergyInfo,
  SynergyLink,
  TileCombatModifiers,
  TurnFusionOption,
} from './types';

function pairKey(a: BrickColor, b: BrickColor): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

export function matchColorPairSynergy(a: BrickColor, b: BrickColor): SynergyInfo | null {
  if (a === b) return SYNERGY_CATALOG.overcharge;
  const key = pairKey(a, b);
  switch (key) {
    case pairKey('red', 'yellow'):
      return SYNERGY_CATALOG.plasma;
    case pairKey('red', 'green'):
      return SYNERGY_CATALOG.wildfire;
    case pairKey('yellow', 'green'):
      return SYNERGY_CATALOG.static_venom;
    default:
      return null;
  }
}

export function getCellColors(cell: GridCell): BrickColor[] {
  if (cell.kind !== 'ACTIVE_BRICK' && cell.kind !== 'MASTER_BRICK') return [];
  const colors: BrickColor[] = [];
  if (cell.color) colors.push(cell.color);
  if (cell.kind === 'MASTER_BRICK' && cell.secondaryColor) {
    colors.push(cell.secondaryColor);
  }
  return colors;
}

const ORTHO_DIRS: Coord[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];

export function computeBoardSynergyLinks(grid: GridCell[][]): SynergyLink[] {
  const links: SynergyLink[] = [];

  for (let y = 0; y < GRID_ROWS; y++) {
    for (let x = 0; x < GRID_COLS; x++) {
      const cell = grid[y][x];
      const colorsA = getCellColors(cell);
      if (colorsA.length === 0) continue;

      const neighbors: Coord[] = [
        { x: x + 1, y },
        { x, y: y + 1 },
      ];

      for (const n of neighbors) {
        if (n.x >= GRID_COLS || n.y >= GRID_ROWS) continue;
        const other = grid[n.y][n.x];
        const colorsB = getCellColors(other);
        if (colorsB.length === 0) continue;

        const syn = matchColorPairSynergy(colorsA[0], colorsB[0]);
        if (syn) {
          links.push({
            from: { x, y },
            to: n,
            synergyId: syn.id,
            colorA: colorsA[0],
            colorB: colorsB[0],
          });
        }
      }
    }
  }

  return links;
}

export function computeTileModifiers(
  grid: GridCell[][],
  x: number,
  y: number
): TileCombatModifiers {
  const mod: TileCombatModifiers = {
    primaryElement: 'kinetic',
    isDoubleElement: false,
    sameColorNeighbors: 0,
    adjacentLinkCount: 0,
    ammoLabel: 'Kinetic (Standard)',
    damageMult: 1,
    fireRateMult: 1,
    rangeMult: 1,
    critChance: 0.05,
    extraSplashRadius: 0,
    chainCount: 0,
    slowFactor: 0,
    slowDuration: 0,
    poisonDpsRatio: 0,
    burnDpsRatio: 0,
    armorShred: false,
    spreadVenomOnChain: false,
    brickColors: [],
    activeSynergies: [],
  };

  const cell = grid[y]?.[x];
  if (!cell) return mod;

  const ownColors = getCellColors(cell);
  mod.brickColors = ownColors;

  if (ownColors.length === 0) {
    return mod;
  }

  const isDouble =
    cell.kind === 'MASTER_BRICK' &&
    ownColors.length === 2 &&
    ownColors[0] === ownColors[1];

  mod.primaryElement = ownColors[0];
  mod.isDoubleElement = isDouble;

  if (isDouble) {
    mod.ammoLabel = `Double ${BRICK_COLORS[ownColors[0]].elementName} (×2)`;
  } else if (ownColors.length > 1 && ownColors[1] !== ownColors[0]) {
    mod.secondaryElement = ownColors[1];
    mod.ammoLabel = `${BRICK_COLORS[ownColors[0]].elementName} + ${BRICK_COLORS[ownColors[1]].elementName}`;
  } else {
    mod.ammoLabel = `${BRICK_COLORS[ownColors[0]].elementName} Ammo`;
  }

  // Apply base elemental properties (additive slow & DoT so doubles and clusters genuinely scale!)
  const applyElementEffect = (color: BrickColor, scale = 1, isSecondaryStack = false) => {
    switch (color) {
      case 'yellow':
        // Lightning: Speed & Chain
        mod.fireRateMult += 0.3 * scale;
        mod.chainCount += isSecondaryStack
          ? Math.max(1, Math.round(2 * scale))
          : scale >= 1
            ? 2
            : 1;
        break;
      case 'red':
        // Fire: Bonus Damage & Splash + Burn
        mod.damageMult += 0.35 * scale;
        mod.extraSplashRadius += Math.round(46 * scale);
        mod.burnDpsRatio += 0.22 * scale;
        break;
      case 'green':
        // Venom: Slow & Corrosive DoT (stacks up to 68% slow cap!)
        if (isSecondaryStack) {
          mod.slowFactor = Math.min(0.68, mod.slowFactor + 0.18 * scale);
          mod.slowDuration = Math.min(4.8, Math.max(mod.slowDuration, 2.8) + 0.9 * scale);
        } else {
          mod.slowFactor = Math.min(0.68, Math.max(mod.slowFactor, 0.35 * scale));
          mod.slowDuration = Math.max(mod.slowDuration, 2.8);
        }
        mod.poisonDpsRatio += 0.44 * scale;
        break;
    }
  };

  if (isDouble) {
    // Dedicated Double-Element Power Curve (e.g., Double Green = 56% slow + massive DoT)
    const c = ownColors[0];
    applyElementEffect(c, 1, false);
    applyElementEffect(c, 1.15, true);
    mod.damageMult += 0.15;
    mod.critChance += 0.12;
  } else {
    const ownScale = cell.kind === 'MASTER_BRICK' ? 1.18 : 1;
    for (let i = 0; i < ownColors.length; i++) {
      applyElementEffect(ownColors[i], ownScale, i > 0 && ownColors[i] === ownColors[0]);
    }
  }

  const triggeredIds = new Set<string>();

  const registerSynergy = (syn: SynergyInfo, primaryColor?: BrickColor, skipBonus = false) => {
    if (triggeredIds.has(syn.id)) return;
    triggeredIds.add(syn.id);
    mod.activeSynergies.push(syn);
    if (skipBonus) return;

    switch (syn.id) {
      case 'plasma':
        // Red + Yellow: Fire Splash + Lightning Chain + Speed
        mod.fireRateMult += 0.2;
        mod.damageMult += 0.15;
        mod.chainCount = Math.max(mod.chainCount, 2);
        mod.extraSplashRadius = Math.max(mod.extraSplashRadius, 46);
        break;
      case 'wildfire':
        // Red + Green: Huge Fire Splash + Armor Shred + Burn/Venom
        mod.extraSplashRadius += 24;
        mod.armorShred = true;
        mod.burnDpsRatio += 0.25;
        mod.poisonDpsRatio = Math.max(mod.poisonDpsRatio, 0.38);
        mod.slowFactor = Math.max(mod.slowFactor, 0.32);
        mod.slowDuration = Math.max(mod.slowDuration, 2.6);
        break;
      case 'static_venom':
        // Yellow + Green: Chains spread Venom Slow & DoT
        mod.spreadVenomOnChain = true;
        mod.chainCount = Math.max(mod.chainCount, 2);
        mod.slowFactor = Math.max(mod.slowFactor, 0.35);
        mod.slowDuration = Math.max(mod.slowDuration, 2.8);
        mod.poisonDpsRatio = Math.max(mod.poisonDpsRatio, 0.44);
        break;
      case 'overcharge':
        // Same color link amplifies element
        mod.critChance += 0.12;
        if (primaryColor) {
          applyElementEffect(primaryColor, 0.45, true);
        }
        break;
    }
  };

  if (cell.kind === 'MASTER_BRICK' && cell.color && cell.secondaryColor) {
    const internalSyn = matchColorPairSynergy(cell.color, cell.secondaryColor);
    // Double elements already received their dedicated ×2 scaling above; list Overcharge cleanly
    if (internalSyn) registerSynergy(internalSyn, cell.color, isDouble);
  }

  // Adjacent Brick Resonance & Cross-Color Conduit Links
  let sameNeighbors = 0;
  let totalLinks = 0;

  for (const dir of ORTHO_DIRS) {
    const nx = x + dir.x;
    const ny = y + dir.y;
    if (nx < 0 || nx >= GRID_COLS || ny < 0 || ny >= GRID_ROWS) continue;
    const neighbor = grid[ny][nx];
    const neighborColors = getCellColors(neighbor);
    if (neighborColors.length === 0) continue;

    totalLinks += 1;
    const sharesOwnColor = neighborColors.some((nc) => ownColors.includes(nc));
    if (sharesOwnColor) sameNeighbors += 1;

    for (const nc of neighborColors) {
      for (const oc of ownColors) {
        const syn = matchColorPairSynergy(oc, nc);
        if (syn) registerSynergy(syn, oc);
      }
    }
  }

  mod.adjacentLinkCount = totalLinks;
  mod.sameColorNeighbors = sameNeighbors;

  // Scaling cluster bonus when 2+ same-color bricks touch this brick (rewards spatial brick clusters!)
  if (sameNeighbors >= 2) {
    const extraLinks = sameNeighbors - 1;
    applyElementEffect(mod.primaryElement, 0.25 * extraLinks, true);
    mod.damageMult += 0.1 * extraLinks;
  }

  return mod;
}

export function findTurnFusionOptions(
  grid: GridCell[][],
  placedTurnCoords: PlacedTurnEntry[]
): TurnFusionOption[] {
  const options: TurnFusionOption[] = [];
  const seenSignatures = new Set<string>();

  for (let i = 0; i < placedTurnCoords.length; i++) {
    const cellA = grid[placedTurnCoords[i].y]?.[placedTurnCoords[i].x];
    if (!cellA?.color) continue;

    for (let j = i + 1; j < placedTurnCoords.length; j++) {
      const cellB = grid[placedTurnCoords[j].y]?.[placedTurnCoords[j].x];
      if (!cellB?.color) continue;

      const syn = matchColorPairSynergy(cellA.color, cellB.color);
      if (!syn) continue;

      const sig = `${syn.id}:${pairKey(cellA.color, cellB.color)}`;
      if (seenSignatures.has(sig)) continue;
      seenSignatures.add(sig);

      const elA = BRICK_COLORS[cellA.color].elementName;
      const elB = BRICK_COLORS[cellB.color].elementName;
      const isTwin = cellA.color === cellB.color;

      const twinDetail =
        cellA.color === 'green'
          ? '56% Slow + 2× Corrosive DoT'
          : cellA.color === 'red'
            ? '+85% DMG + Huge Fire Splash & Burn'
            : '+75% Speed + 4 Lightning Chains';

      options.push({
        id: sig,
        name: isTwin ? `Double ${elA} (×2)` : `${syn.name} Brick`,
        description: isTwin
          ? `Fuse two ${elA} bricks: ${twinDetail}`
          : `Fuse ${elA} + ${elB}: ${syn.shortEffect}`,
        indices: [i, j],
        colors: [cellA.color, cellB.color],
        anchorIndex: i,
      });
    }
  }

  return options;
}
