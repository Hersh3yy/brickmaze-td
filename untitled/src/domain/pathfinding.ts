import { GRID_COLS, GRID_ROWS, MAP_LAYOUTS } from './constants';
import { Coord, GridCell, MapLayoutId } from './types';

export interface PathResult {
  valid: boolean;
  path: Coord[];
  length: number;
  blockedSegment?: string;
}

export function isCellWalkable(cell: GridCell): boolean {
  return (
    cell.kind === 'OPEN' ||
    cell.kind === 'START' ||
    cell.kind === 'CP1' ||
    cell.kind === 'CP2' ||
    cell.kind === 'CP3' ||
    cell.kind === 'EXIT'
  );
}

export function isBrickCell(cell: GridCell): boolean {
  return (
    cell.kind === 'GRAY_WALL' ||
    cell.kind === 'ACTIVE_BRICK' ||
    cell.kind === 'MASTER_BRICK'
  );
}

export function createInitialGrid(layoutId: MapLayoutId): GridCell[][] {
  const layout = MAP_LAYOUTS[layoutId];
  const grid: GridCell[][] = [];

  for (let y = 0; y < GRID_ROWS; y++) {
    const row: GridCell[] = [];
    for (let x = 0; x < GRID_COLS; x++) {
      row.push({ x, y, kind: 'OPEN' });
    }
    grid.push(row);
  }

  grid[layout.start.y][layout.start.x].kind = 'START';
  grid[layout.cp1.y][layout.cp1.x].kind = 'CP1';
  grid[layout.cp2.y][layout.cp2.x].kind = 'CP2';
  grid[layout.cp3.y][layout.cp3.x].kind = 'CP3';
  grid[layout.exit.y][layout.exit.x].kind = 'EXIT';

  for (const wall of layout.presetWalls) {
    if (grid[wall.y]?.[wall.x]?.kind === 'OPEN') {
      grid[wall.y][wall.x].kind = 'GRAY_WALL';
    }
  }

  return grid;
}

const DIRS: Coord[] = [
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
  { x: 0, y: -1 },
];

function bfsSegment(
  grid: GridCell[][],
  from: Coord,
  to: Coord,
  blockedCoord?: Coord
): Coord[] | null {
  const visited = new Uint8Array(GRID_COLS * GRID_ROWS);
  const parent = new Int16Array(GRID_COLS * GRID_ROWS).fill(-1);
  const queue = new Int16Array(GRID_COLS * GRID_ROWS);

  const startIdx = from.y * GRID_COLS + from.x;
  const targetIdx = to.y * GRID_COLS + to.x;

  let head = 0;
  let tail = 0;
  queue[tail++] = startIdx;
  visited[startIdx] = 1;

  while (head < tail) {
    const curr = queue[head++];
    if (curr === targetIdx) {
      const path: Coord[] = [];
      let p = curr;
      while (p !== -1) {
        const px = p % GRID_COLS;
        const py = Math.floor(p / GRID_COLS);
        path.push({ x: px, y: py });
        p = parent[p];
      }
      path.reverse();
      return path;
    }

    const cx = curr % GRID_COLS;
    const cy = Math.floor(curr / GRID_COLS);

    for (let i = 0; i < 4; i++) {
      const nx = cx + DIRS[i].x;
      const ny = cy + DIRS[i].y;
      if (nx < 0 || nx >= GRID_COLS || ny < 0 || ny >= GRID_ROWS) continue;
      if (blockedCoord && nx === blockedCoord.x && ny === blockedCoord.y) continue;

      const nIdx = ny * GRID_COLS + nx;
      if (visited[nIdx]) continue;
      if (!isCellWalkable(grid[ny][nx])) continue;

      visited[nIdx] = 1;
      parent[nIdx] = curr;
      queue[tail++] = nIdx;
    }
  }

  return null;
}

export function computeMazePath(
  grid: GridCell[][],
  layoutId: MapLayoutId,
  blockedCoord?: Coord
): PathResult {
  const layout = MAP_LAYOUTS[layoutId];
  const waypoints: { label: string; coord: Coord }[] = [
    { label: 'Start', coord: layout.start },
    { label: 'CP 1', coord: layout.cp1 },
    { label: 'CP 2', coord: layout.cp2 },
    { label: 'CP 3', coord: layout.cp3 },
    { label: 'Exit', coord: layout.exit },
  ];

  const fullPath: Coord[] = [];

  for (let i = 0; i < waypoints.length - 1; i++) {
    const seg = bfsSegment(grid, waypoints[i].coord, waypoints[i + 1].coord, blockedCoord);
    if (!seg) {
      return {
        valid: false,
        path: [],
        length: 0,
        blockedSegment: `${waypoints[i].label} → ${waypoints[i + 1].label}`,
      };
    }
    if (i === 0) {
      fullPath.push(...seg);
    } else {
      fullPath.push(...seg.slice(1));
    }
  }

  return {
    valid: true,
    path: fullPath,
    length: Math.max(0, fullPath.length - 1),
  };
}
