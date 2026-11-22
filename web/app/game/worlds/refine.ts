import type { SpriteGrid } from './types';

/**
 * Doubles a pixel grid with Scale2x (EPX), which rounds off diagonal steps without
 * inventing new colours, then thins the outer outline back to one pixel so edges look
 * finer instead of chunkier. Internal lines (a helmet rim, a drum hoop) are left as they are.
 */
export function refineGrid(grid: SpriteGrid, outline = 'o'): SpriteGrid {
  const h = grid.length;
  const w = grid[0]?.length ?? 0;
  const src = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? '.' : grid[y]![x]!);

  const big: string[][] = Array.from({ length: h * 2 }, () => new Array<string>(w * 2));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = src(x, y);
      const a = src(x, y - 1);
      const b = src(x + 1, y);
      const c = src(x - 1, y);
      const d = src(x, y + 1);
      big[2 * y]![2 * x] = c === a && c !== d && a !== b ? a : p;
      big[2 * y]![2 * x + 1] = a === b && a !== c && b !== d ? b : p;
      big[2 * y + 1]![2 * x] = d === c && d !== b && c !== a ? c : p;
      big[2 * y + 1]![2 * x + 1] = b === d && b !== a && d !== c ? d : p;
    }
  }

  const H = h * 2;
  const W = w * 2;
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= W || y >= H ? '.' : big[y]![x]!);
  const out = big.map((row) => row.slice());
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (big[y]![x] !== outline) continue;
      // Keep the pixel that touches the outside; recolour the one just inside it.
      let touchesOutside = false;
      let nearOutside = false;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          if (at(x + dx, y + dy) !== '.') continue;
          if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) touchesOutside = true;
          else if (Math.abs(dx) + Math.abs(dy) <= 2) nearOutside = true;
        }
      }
      if (touchesOutside || !nearOutside) continue;
      const counts = new Map<string, number>();
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const) {
        const c = at(x + dx, y + dy);
        if (c !== '.' && c !== outline) counts.set(c, (counts.get(c) ?? 0) + 1);
      }
      let best: string | undefined;
      let bestN = 0;
      for (const [c, n] of counts) {
        if (n > bestN) {
          best = c;
          bestN = n;
        }
      }
      if (best) out[y]![x] = best;
    }
  }
  return out.map((row) => row.join(''));
}
