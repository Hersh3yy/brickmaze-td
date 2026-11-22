/**
 * A tiny voxel sculptor and baker for World sprites.
 *
 * Models are described in "design units" with simple solids (box, cylinder, ellipsoid,
 * rod). `detail` scales them into a voxel grid, so one description can be baked coarser
 * for old phones or finer for big screens. Baking turns a model into a lit, outlined
 * pixel sprite seen from a 3/4 view at any angle; the renderer then only blits it.
 *
 * Axes: x points the way the model faces (0 rad), y is its left-to-right width, z is up.
 */

/** Four tones per material: top face, side facing the light, side across, side away. */
export type MaterialTones = [string, string, string, string];
export type MaterialMap = Record<string, MaterialTones>;

export interface VoxelSculptor {
  box(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, mat: string): void;
  cyl(cx: number, cy: number, z0: number, z1: number, r: number, mat: string): void;
  ell(cx: number, cy: number, cz: number, rx: number, ry: number, rz: number, mat: string): void;
  rod(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, r: number, mat: string): void;
}

export interface VoxelBuild {
  /** Footprint and height in design units. */
  size: [w: number, d: number, h: number];
  /** Multiplies the set's detail for this model, e.g. 0.6 for a small swarm mouse. */
  scale?: number;
  /** Muzzle tip for a firing flash: reach from the centre and height, in design units. */
  muzzle?: [reach: number, height: number];
  /** Sculpts the model; `frame` is the walk frame (0 or 1) for animated models. */
  sculpt: (s: VoxelSculptor, frame: 0 | 1) => void;
}

/** One visible voxel face set, precomputed once per model so each angle bakes fast. */
interface SurfaceVoxel {
  x: number;
  y: number;
  z: number;
  nx: number;
  ny: number;
  top: boolean;
  mat: string;
}

export interface VoxelModel {
  w: number;
  d: number;
  h: number;
  surface: SurfaceVoxel[];
}

export function sculptModel(build: VoxelBuild, detail: number, frame: 0 | 1 = 0): VoxelModel {
  const W = Math.ceil(build.size[0] * detail);
  const D = Math.ceil(build.size[1] * detail);
  const H = Math.ceil(build.size[2] * detail);
  const cells: (string | null)[] = new Array(W * D * H).fill(null);

  // Fill every cell whose centre (in design units) passes the test, within a bounding box.
  const fill = (
    bx0: number,
    by0: number,
    bz0: number,
    bx1: number,
    by1: number,
    bz1: number,
    inside: (x: number, y: number, z: number) => boolean,
    mat: string
  ) => {
    const x0 = Math.max(0, Math.floor(bx0 * detail));
    const y0 = Math.max(0, Math.floor(by0 * detail));
    const z0 = Math.max(0, Math.floor(bz0 * detail));
    const x1 = Math.min(W - 1, Math.ceil(bx1 * detail));
    const y1 = Math.min(D - 1, Math.ceil(by1 * detail));
    const z1 = Math.min(H - 1, Math.ceil(bz1 * detail));
    for (let z = z0; z <= z1; z++) {
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          if (inside((x + 0.5) / detail, (y + 0.5) / detail, (z + 0.5) / detail)) {
            cells[(z * D + y) * W + x] = mat;
          }
        }
      }
    }
  };

  const sculptor: VoxelSculptor = {
    box(x0, y0, z0, x1, y1, z1, mat) {
      fill(x0, y0, z0, x1 + 1, y1 + 1, z1 + 1, (x, y, z) => x >= x0 && x <= x1 + 1 && y >= y0 && y <= y1 + 1 && z >= z0 && z <= z1 + 1, mat);
    },
    cyl(cx, cy, z0, z1, r, mat) {
      fill(cx - r, cy - r, z0, cx + r, cy + r, z1 + 1, (x, y, z) => z >= z0 && z <= z1 + 1 && (x - cx) ** 2 + (y - cy) ** 2 <= r * r, mat);
    },
    ell(cx, cy, cz, rx, ry, rz, mat) {
      fill(cx - rx, cy - ry, cz - rz, cx + rx, cy + ry, cz + rz, (x, y, z) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 + ((z - cz) / rz) ** 2 <= 1, mat);
    },
    rod(x0, y0, z0, x1, y1, z1, r, mat) {
      const dx = x1 - x0;
      const dy = y1 - y0;
      const dz = z1 - z0;
      const len2 = dx * dx + dy * dy + dz * dz || 1;
      fill(
        Math.min(x0, x1) - r,
        Math.min(y0, y1) - r,
        Math.min(z0, z1) - r,
        Math.max(x0, x1) + r,
        Math.max(y0, y1) + r,
        Math.max(z0, z1) + r,
        (x, y, z) => {
          const t = Math.max(0, Math.min(1, ((x - x0) * dx + (y - y0) * dy + (z - z0) * dz) / len2));
          const px = x0 + t * dx - x;
          const py = y0 + t * dy - y;
          const pz = z0 + t * dz - z;
          return px * px + py * py + pz * pz <= r * r;
        },
        mat
      );
    },
  };
  build.sculpt(sculptor, frame);

  const at = (x: number, y: number, z: number) =>
    x < 0 || y < 0 || z < 0 || x >= W || y >= D || z >= H ? null : cells[(z * D + y) * W + x];
  const surface: SurfaceVoxel[] = [];
  for (let z = 0; z < H; z++) {
    for (let y = 0; y < D; y++) {
      for (let x = 0; x < W; x++) {
        const mat = cells[(z * D + y) * W + x];
        if (!mat) continue;
        const top = !at(x, y, z + 1);
        const nx = (at(x + 1, y, z) ? 0 : 1) - (at(x - 1, y, z) ? 0 : 1);
        const ny = (at(x, y + 1, z) ? 0 : 1) - (at(x, y - 1, z) ? 0 : 1);
        if (!top && !nx && !ny && at(x + 1, y, z) && at(x - 1, y, z) && at(x, y + 1, z) && at(x, y - 1, z)) continue;
        surface.push({ x: x + 0.5 - W / 2, y: y + 0.5 - D / 2, z, nx, ny, top, mat });
      }
    }
  }
  return { w: W, d: D, h: H, surface };
}

/** Light comes from the upper left of the screen, a little towards the viewer. */
const LIGHT_X = -0.6;
const LIGHT_Y = 0.8;
/** Depth is squashed to this share of its length: a 3/4 view looking down at the floor. */
const DEPTH_SQUASH = 0.5;

export interface BakeOptions {
  /** Square canvas size in pixels. */
  size: number;
  /** Where the model's ground point sits, as a share of the canvas height. */
  ground: number;
  /** Outline colour drawn around the silhouette. */
  outline: [number, number, number];
}

/**
 * Bakes a model seen from the 3/4 view, rotated to face `angle` (0 = right, π/2 = down
 * the screen), into a canvas: painter's order back to front, four-tone lighting, small
 * gaps patched, and a one-pixel outline.
 */
export function bakeVoxelSprite(
  model: VoxelModel,
  angle: number,
  materials: MaterialMap,
  opts: BakeOptions
): HTMLCanvasElement {
  const { size } = opts;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const ox = size / 2;
  const oy = size * opts.ground;
  const points: { depth: number; z: number; px: number; py: number; color: string }[] = [];
  for (const v of model.surface) {
    const tones = materials[v.mat];
    if (!tones) continue;
    const rx = v.x * c - v.y * s;
    const ry = v.x * s + v.y * c;
    const snx = v.nx * c - v.ny * s;
    const sny = v.nx * s + v.ny * c;
    const len = Math.hypot(snx, sny) || 1;
    const lit = (snx * LIGHT_X + sny * LIGHT_Y) / len;
    let tone: number;
    if (v.top) tone = (v.nx || v.ny) && lit < -0.3 ? 1 : 0;
    else tone = lit > 0.35 ? 1 : lit > -0.35 ? 2 : 3;
    points.push({
      depth: ry,
      z: v.z,
      px: Math.floor(ox + rx),
      py: Math.floor(oy + ry * DEPTH_SQUASH - v.z),
      color: tones[tone]!,
    });
  }
  points.sort((a, b) => a.depth - b.depth || a.z - b.z);
  for (const p of points) {
    ctx.fillStyle = p.color;
    ctx.fillRect(p.px, p.py, 1, 1);
  }

  // Patch pinholes left by rotation, then outline the silhouette.
  const img = ctx.getImageData(0, 0, size, size);
  const a = img.data;
  const out = new Uint8ClampedArray(a);
  const [or, og, ob] = opts.outline;
  const alphaAt = (x: number, y: number) => (x < 0 || y < 0 || x >= size || y >= size ? 0 : a[(y * size + x) * 4 + 3]!);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      if (a[i + 3]) continue;
      const nbs = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ].filter(([dx, dy]) => alphaAt(x + dx!, y + dy!));
      if (nbs.length >= 3) {
        const j = ((y + nbs[0]![1]!) * size + x + nbs[0]![0]!) * 4;
        out[i] = a[j]!;
        out[i + 1] = a[j + 1]!;
        out[i + 2] = a[j + 2]!;
        out[i + 3] = 255;
      } else if (nbs.length) {
        out[i] = or;
        out[i + 1] = og;
        out[i + 2] = ob;
        out[i + 3] = 255;
      }
    }
  }
  ctx.putImageData(new ImageData(out, size, size), 0, 0);
  return canvas;
}

/** Four tones from a body colour pair: light top, body lit side, dark side, darker still. */
export function tonesFrom(light: string, body: string, dark: string): MaterialTones {
  return [light, body, dark, shade(dark, 0.7)];
}

function shade(hex: string, factor: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * factor);
  const g = Math.round(((n >> 8) & 255) * factor);
  const b = Math.round((n & 255) * factor);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
