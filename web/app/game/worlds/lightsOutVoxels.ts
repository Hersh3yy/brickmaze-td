import type { VoxelSet } from './types';
import type { MaterialMap, VoxelBuild, VoxelSculptor } from './voxel';

/**
 * Lights Out in 3D: green plastic army men on round bases and the mice of the Wainscot
 * Clan, sculpted from simple solids. Every model faces +x; the baker turns it.
 * Material 'C' is the element colour, filled in per ammo type by the atlas.
 */

const MATERIALS: MaterialMap = {
  // plastic army men
  G: ['#C2DB7E', '#8FAE4C', '#5E7A30', '#41561F'],
  H: ['#8AA64C', '#647F34', '#43581F', '#2E3D14'],
  B: ['#A9C468', '#78963F', '#506A28', '#384B1B'],
  // brass, needle steel, drum skin, wood
  K: ['#FFF0A8', '#E2B93A', '#A57D18', '#6E520C'],
  N: ['#FFFFFF', '#D9DEE6', '#9AA3B0', '#6B7380'],
  P: ['#FFF8EA', '#EFE3CC', '#C9B898', '#9C8C6E'],
  W: ['#D49A62', '#A8703F', '#7A4A24', '#55331A'],
  // mice
  M: ['#C4A285', '#9A7152', '#6B4A33', '#4A3222'],
  m: ['#E6D2BE', '#C29C7A', '#8E6A4D', '#634A35'],
  S: ['#C8C4BF', '#9E9993', '#6E6A66', '#4C4946'],
  s: ['#E9E6E2', '#C6C1BB', '#99948E', '#6D6964'],
  A: ['#A99078', '#7D6450', '#56432F', '#3A2C1F'],
  Q: ['#DDBE93', '#B8915E', '#86653D', '#5E4528'],
  q: ['#F2E2CC', '#D9BE9C', '#A88D6C', '#7A6450'],
  D: ['#A6A2AA', '#7A767F', '#524F57', '#38363C'],
  d: ['#CFCBD3', '#A9A4AF', '#7C7882', '#57545C'],
  U: ['#CDBFB2', '#A89A8C', '#776A5E', '#544A41'],
  R: ['#FBC4CA', '#E8909C', '#B8646F', '#86434C'],
  E: ['#24161C', '#24161C', '#24161C', '#24161C'],
  // props
  T: ['#F4F6F9', '#C9CFD8', '#939BA7', '#666D78'],
  Y: ['#FFE793', '#E5B83A', '#A98418', '#73580E'],
  X: ['#FFFFFF', '#F3F0EA', '#D6D0C4', '#ADA698'],
  Z: ['#F2DDBC', '#E0C49A', '#B8966A', '#8A6E4A'],
  V: ['#B79BE0', '#8C6BC0', '#634494', '#45306A'],
  F: ['#F28080', '#D64545', '#9C2C2C', '#6B1D1D'],
  // paper plane: folded sheet, its crease, and the blue ruled lines of school paper
  J: ['#FFFFFF', '#F1EEE6', '#CFC9BC', '#A39D91'],
  j: ['#E8E3D8', '#D2CCBF', '#ABA597', '#827C70'],
  L: ['#A9CBF2', '#7BA7DE', '#5A82B8', '#3F5E8A'],
  C: ['#FFFFFF', '#CCCCCC', '#999999', '#666666'],
};

// ---------------------------------------------------------------------------
// Army men (16 x 16 x 21 design units, ground at z = 0)
// ---------------------------------------------------------------------------

function base(s: VoxelSculptor) {
  s.cyl(8, 8, 0, 0.8, 5.6, 'B');
  s.cyl(8, 8, 0, 1.2, 5, 'B');
}

/** Helmeted head centred at (x, 8), chin at height z. */
function head(s: VoxelSculptor, x: number, z: number) {
  s.ell(x + 0.2, 8, z + 1.7, 1.6, 1.5, 1.7, 'G');
  s.ell(x, 8, z + 3.3, 2.5, 2.6, 1.6, 'G');
  s.cyl(x, 8, z + 2.5, z + 2.6, 3.1, 'H');
}

/** Standing legs, torso and belt; returns the shoulder height. */
function standingBody(s: VoxelSculptor, x: number): number {
  s.rod(x, 6.2, 2, x, 6.4, 7.5, 1.25, 'G');
  s.rod(x, 9.8, 2, x + 0.3, 9.6, 7.5, 1.25, 'G');
  s.ell(x + 0.8, 6.2, 2.2, 1.8, 1.1, 0.8, 'H');
  s.ell(x + 1.1, 9.8, 2.2, 1.8, 1.1, 0.8, 'H');
  s.ell(x + 0.1, 8, 10.6, 2.2, 3.4, 3.3, 'G');
  s.box(x - 1.9, 4.8, 8, x + 1.9, 11, 8.4, 'H');
  return 12.4;
}

// Elite veterans: the same figures on a gold-painted plinth, with a gold helmet band,
// an element-coloured crest, a medal and a better weapon.

function plinth(s: VoxelSculptor) {
  s.cyl(8, 8, 0, 0.1, 6.4, 'Y');
}

/** Gold helmet band and element crest for the head made by head(s, x, z). */
function veteranHelmet(s: VoxelSculptor, x: number, z: number) {
  s.cyl(x, 8, z + 2.5, z + 2.6, 3.2, 'Y');
  s.ell(x - 0.2, 8, z + 5, 2.4, 0.7, 1, 'C');
}

/** A gold medal and a red ribbon on the chest of standingBody(s, x). */
function medals(s: VoxelSculptor, x: number) {
  s.ell(x + 2, 6.6, 11.6, 0.5, 0.55, 0.55, 'Y');
  s.ell(x + 2, 6.6, 12.5, 0.45, 0.5, 0.35, 'F');
}

const rifleman: VoxelBuild = {
  size: [16, 16, 21],
  muzzle: [7.6, 11.2],
  sculpt(s) {
    base(s);
    const sh = standingBody(s, 7.5);
    head(s, 7.7, 13);
    s.rod(7.8, 4.6, sh, 10.2, 5.6, 10.4, 0.95, 'G');
    s.rod(7.8, 11.4, sh, 10.4, 9.4, 10.8, 0.95, 'G');
    s.rod(5.8, 8, 10.4, 15.5, 8, 11.2, 0.7, 'H');
    s.rod(5.2, 8, 9.8, 7.2, 8, 10.4, 1, 'H');
    s.rod(12.6, 8, 11.2, 12.8, 8, 12.4, 0.45, 'H');
    // Brass winding key on the back, tinted ammo band on the barrel
    s.rod(3.4, 8, 10.8, 4.8, 8, 11, 0.6, 'K');
    s.ell(2.4, 8, 11.6, 0.6, 1.7, 1.1, 'K');
    s.rod(13.6, 8, 11.1, 14.4, 8, 11.2, 0.8, 'C');
  },
  elite(s) {
    plinth(s);
    veteranHelmet(s, 7.7, 13);
    medals(s, 7.5);
    // Scope on top, bayonet under the barrel, a wider ammo band
    s.rod(9, 8, 12.1, 11.6, 8, 12.3, 0.5, 'N');
    s.rod(12.5, 8, 10, 15.9, 8, 10.3, 0.3, 'N');
    s.rod(13.2, 8, 11.1, 14.8, 8, 11.2, 0.9, 'C');
  },
};

const spoonGunner: VoxelBuild = {
  size: [16, 16, 21],
  sculpt(s) {
    base(s);
    // Spoon catapult: plank, pivot, steel spoon with an element-coloured marble
    s.box(7, 6, 1.2, 13, 9.4, 2, 'W');
    s.box(9, 7, 2, 10, 8.4, 3.5, 'W');
    s.rod(9.5, 8, 3.6, 14, 8, 9, 0.55, 'N');
    s.ell(14.3, 8, 9.4, 1.5, 1.5, 0.8, 'N');
    s.ell(14.3, 8, 10.4, 1.15, 1.15, 1.15, 'C');
    // Kneeling soldier behind it
    s.rod(4.5, 6.3, 4.6, 7, 6.3, 4.2, 1.2, 'G');
    s.rod(7, 6.3, 4.2, 7.1, 6.3, 1.6, 1.1, 'G');
    s.ell(7.8, 6.3, 1.6, 1.6, 1, 0.7, 'H');
    s.rod(4.5, 9.7, 4.6, 4.8, 9.7, 2.2, 1.2, 'G');
    s.rod(4.8, 9.7, 2, 2.4, 9.7, 1.8, 1.1, 'G');
    s.ell(4.6, 8, 7.4, 2.1, 3.2, 3, 'G');
    s.box(2.7, 5, 5.2, 6.5, 11, 5.6, 'H');
    head(s, 4.9, 9.6);
    s.rod(5, 5, 9, 8.6, 6.6, 4.2, 0.9, 'G');
    s.rod(5, 11, 9, 8.6, 9.4, 4.4, 0.9, 'G');
  },
  elite(s) {
    plinth(s);
    veteranHelmet(s, 4.9, 9.6);
    s.ell(6.6, 6.6, 7.8, 0.45, 0.5, 0.5, 'Y');
    // Gold spoon, a bigger marble, and two spare marbles by the plank
    s.rod(9.5, 8, 3.6, 14, 8, 9, 0.6, 'Y');
    s.ell(14.3, 8, 9.4, 1.6, 1.6, 0.8, 'Y');
    s.ell(14.3, 8, 10.7, 1.45, 1.45, 1.45, 'C');
    s.ell(11.4, 11.6, 3, 0.9, 0.9, 0.9, 'C');
    s.ell(12.8, 12.2, 3, 0.9, 0.9, 0.9, 'C');
  },
};

const drummer: VoxelBuild = {
  size: [16, 16, 21],
  sculpt(s) {
    base(s);
    const sh = standingBody(s, 6.2);
    head(s, 6.4, 13);
    // Drum on a strap: element-painted shell, brass hoops, cream skin
    s.cyl(10.4, 8, 5.4, 8.8, 2.8, 'C');
    s.cyl(10.4, 8, 5.2, 5.7, 3, 'K');
    s.cyl(10.4, 8, 8.8, 9.3, 3, 'K');
    s.cyl(10.4, 8, 9.3, 9.6, 2.5, 'P');
    s.rod(6.6, 5.4, 12.6, 9, 9.8, 6, 0.4, 'H');
    // Arms and raised sticks
    s.rod(6.4, 4.6, sh, 8.4, 5.6, 11, 0.9, 'G');
    s.rod(6.4, 11.4, sh, 8.4, 10.4, 11, 0.9, 'G');
    s.rod(8.4, 5.8, 11, 10.8, 7, 13.6, 0.4, 'W');
    s.rod(8.4, 10.2, 11, 10.8, 9, 13.6, 0.4, 'W');
  },
  elite(s) {
    plinth(s);
    veteranHelmet(s, 6.4, 13);
    medals(s, 6.2);
    // Gold hoops with studs round the shell, gold-tipped sticks
    s.cyl(10.4, 8, 5.2, 5.7, 3.1, 'Y');
    s.cyl(10.4, 8, 8.8, 9.3, 3.1, 'Y');
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      s.ell(10.4 + Math.cos(a) * 2.85, 8 + Math.sin(a) * 2.85, 7.5, 0.4, 0.4, 0.45, 'Y');
    }
    s.ell(10.8, 7, 13.6, 0.6, 0.6, 0.6, 'Y');
    s.ell(10.8, 9, 13.6, 0.6, 0.6, 0.6, 'Y');
  },
};

const proneSniper: VoxelBuild = {
  size: [16, 16, 21],
  muzzle: [8, 4.9],
  sculpt(s) {
    base(s);
    s.ell(6, 8, 3.4, 3.6, 2.4, 1.7, 'G');
    s.rod(3.5, 6.8, 2.6, 1, 6.2, 2.2, 1.1, 'G');
    s.rod(3.5, 9.2, 2.6, 1, 9.8, 2.2, 1.1, 'G');
    s.ell(0.9, 6.2, 2.2, 0.9, 1.1, 1.1, 'H');
    s.ell(0.9, 9.8, 2.2, 0.9, 1.1, 1.1, 'H');
    s.ell(10, 8, 4.6, 1.5, 1.4, 1.5, 'G');
    s.ell(9.8, 8, 5.9, 2.2, 2.3, 1.3, 'G');
    s.cyl(9.8, 8, 5.1, 5.2, 2.7, 'H');
    s.rod(8.5, 5.6, 3.6, 11.5, 7.2, 3.8, 0.85, 'G');
    s.rod(8.5, 10.4, 3.6, 11.5, 8.8, 3.8, 0.85, 'G');
    s.rod(9.6, 8, 4.4, 12.4, 8, 4.6, 0.8, 'W');
    s.rod(12.4, 8, 4.6, 16, 8, 4.9, 0.38, 'N');
    s.ell(12.8, 8, 5.7, 0.7, 0.7, 0.7, 'K');
    s.ell(12.1, 8, 4.7, 0.6, 0.9, 0.6, 'C');
  },
  elite(s) {
    plinth(s);
    // Gold helmet band and crest on the prone head, a long gold scope, a steel bipod
    s.cyl(9.8, 8, 5.1, 5.2, 2.8, 'Y');
    s.ell(9.6, 8, 7.4, 2, 0.6, 0.8, 'C');
    s.rod(11.4, 8, 5.9, 14.4, 8, 6, 0.55, 'Y');
    s.rod(14.6, 8, 4.8, 15.2, 6.6, 2.2, 0.3, 'N');
    s.rod(14.6, 8, 4.8, 15.2, 9.4, 2.2, 0.3, 'N');
  },
};

/** Height of the dart blaster's tube centre at x (it rises towards the muzzle). */
const tubeZ = (x: number) => 9.4 + (x - 5) * 0.38;

const dartRanger: VoxelBuild = {
  size: [16, 16, 21],
  muzzle: [7.2, 13.5],
  sculpt(s) {
    base(s);
    const sh = standingBody(s, 6.6);
    head(s, 6.8, 13);
    // Dart blaster fired from the hip, tilted up at the planes: element-painted tube,
    // dark muzzle ring, a dart with a red suction cup, the string coiled on the hip.
    s.rod(5, 8, tubeZ(5), 13.4, 8, tubeZ(13.4), 1.25, 'C');
    s.rod(12.6, 8, tubeZ(12.6), 13.6, 8, tubeZ(13.6), 1.5, 'H');
    s.rod(13.6, 8, tubeZ(13.6), 15, 8, tubeZ(15), 0.35, 'P');
    s.ell(15.3, 8, tubeZ(15.3), 0.5, 1, 1, 'F');
    s.rod(6.6, 4.6, sh, 9.6, 7, tubeZ(9.6) - 0.9, 0.9, 'G');
    s.rod(6.6, 11.4, sh, 7.6, 9.2, tubeZ(7.6) - 0.9, 0.9, 'G');
    s.cyl(6.3, 11.6, 6.8, 7.6, 1.3, 'P');
    s.cyl(6.3, 11.6, 6.8, 7.6, 0.6, 'H');
  },
  elite(s) {
    plinth(s);
    veteranHelmet(s, 6.8, 13);
    medals(s, 6.6);
    // Gold bands and a sight on the tube, a quiver of spare darts on the back
    for (const x of [7.6, 11]) s.rod(x, 8, tubeZ(x), x + 0.6, 8, tubeZ(x + 0.6), 1.5, 'Y');
    s.rod(9, 8, tubeZ(9) + 1.4, 10.6, 8, tubeZ(10.6) + 1.4, 0.45, 'Y');
    s.cyl(3.6, 9.8, 7, 11.4, 0.9, 'W');
    s.ell(3.6, 9.4, 12.8, 0.55, 0.55, 0.55, 'F');
    s.ell(3.6, 10.3, 13, 0.55, 0.55, 0.55, 'F');
  },
};

// ---------------------------------------------------------------------------
// Mice (facing +x, ground at z = 0)
// ---------------------------------------------------------------------------

interface MouseLook {
  fur: string;
  light: string;
  /** Body width and height multiplier. */
  fat?: number;
  /** Body length multiplier. */
  long?: number;
  earR?: number;
  earsBack?: boolean;
  ears?: boolean;
  /** Ear radius on the right side (y > 6), for a nicked ear. */
  rightEarR?: number;
}

function mouseBody(s: VoxelSculptor, frame: 0 | 1, o: MouseLook) {
  const fat = o.fat ?? 1;
  const long = o.long ?? 1;
  const zc = 3.6 * fat;
  s.ell(8.5, 6, zc, 5.6 * long, 3.4 * fat, 3.1 * fat, o.fur);
  s.ell(9, 6, zc - 1.4 * fat, 4.4 * long, 2.6 * fat, 1.6 * fat, o.light);
  const hx = 8.5 + 5.9 * long;
  s.ell(hx, 6, zc + 0.2, 3, 2.3, 2.4, o.fur);
  s.ell(hx + 2.5, 6, zc - 0.2, 1.5, 1.2, 1.2, o.fur);
  s.ell(hx + 3.9, 6, zc - 0.3, 0.6, 0.6, 0.6, 'R');
  s.ell(hx + 1.2, 4.5, zc + 1, 0.5, 0.5, 0.6, 'E');
  s.ell(hx + 1.2, 7.5, zc + 1, 0.5, 0.5, 0.6, 'E');
  if (o.ears !== false) {
    const ex = o.earsBack ? hx - 2.4 : hx - 1.6;
    const ez = o.earsBack ? zc + 2 : zc + 2.8;
    const left = o.earR ?? 1.7;
    const right = o.rightEarR ?? left;
    s.cyl(ex, 3.6, ez, ez + 0.8, left, 'R');
    s.cyl(ex, 8.4, ez, ez + 0.8, right, 'R');
    s.cyl(ex - 0.2, 3.6, ez, ez + 0.8, left * 0.5, o.fur);
    s.cyl(ex - 0.2, 8.4, ez, ez + 0.8, right * 0.5, o.fur);
  }
  // Tail curls behind and sways between walk frames
  const tailStart = 8.5 - 5.4 * long;
  for (let i = 0; i < 10; i++) {
    const t = i / 9;
    s.ell(tailStart - t * 3, 6 + Math.sin(t * 3.4 + frame * 0.9) * 2.2, 1.6 + t * 0.6, 0.5, 0.5, 0.5, 'R');
  }
  // Feet: front and back pairs swap between frames
  const step = frame === 0 ? 0.9 : -0.9;
  const front = 8.5 + 2.6 * long;
  const back = 8.5 - 3 * long;
  for (const [x, y] of [
    [front + step, 4.2],
    [front - step, 7.8],
    [back - step, 4],
    [back + step, 8],
  ] as const) {
    s.ell(x, y, 0.6, 0.9, 0.6, 0.6, o.light);
  }
}

const mouseBuild = (
  o: MouseLook,
  scale: number,
  size: [number, number, number] = [22, 12, 10],
  extra?: (s: VoxelSculptor) => void
): VoxelBuild => ({
  size,
  scale,
  sculpt(s, frame) {
    mouseBody(s, frame, o);
    extra?.(s);
  },
});

const scamp = mouseBuild({ fur: 'M', light: 'm' }, 0.9);
const nibbler = mouseBuild({ fur: 'S', light: 's', earR: 2.2, long: 0.85 }, 0.72);
const capshield = mouseBuild({ fur: 'A', light: 'm', ears: false }, 0.92, [22, 12, 11], (s) => {
  // Thimble helmet and a bottle-cap shield held in front of the face
  s.cyl(14.4, 6, 5.6, 7.8, 2.3, 'T');
  s.cyl(14.4, 6, 7.8, 8.3, 1.9, 'T');
  s.ell(19.4, 6, 3.6, 0.7, 3, 3, 'Y');
  s.ell(19.9, 6, 3.6, 0.3, 2.2, 2.2, 'K');
});
const scurrier = mouseBuild({ fur: 'Q', light: 'q', fat: 0.85, long: 1.15, earsBack: true }, 0.9);
const sugarlump = mouseBuild({ fur: 'M', light: 'm', fat: 1.2 }, 0.92, [22, 12, 12], (s) => {
  s.box(5.4, 4, 7, 9.4, 8, 10.6, 'X');
});
const gnawbone = mouseBuild({ fur: 'D', light: 'd', fat: 1.25, long: 1.05, rightEarR: 1.1 }, 1.1, [24, 12, 13], (s) => {
  // Bottle-cap crown with points
  s.cyl(14.4, 6, 7.8, 8.8, 2.1, 'Y');
  for (const [x, y] of [
    [14.4, 4],
    [16.2, 6],
    [14.4, 8],
    [12.6, 6],
  ] as const) {
    s.ell(x, y, 9.6, 0.5, 0.5, 0.8, 'Y');
  }
});
const herald = mouseBuild({ fur: 'M', light: 'm' }, 1, [22, 12, 15], (s) => {
  // Toothpick pole with a red pennant
  s.rod(8.6, 6, 5, 8.6, 6, 14.4, 0.35, 'Z');
  s.box(8.9, 5.7, 11.4, 12.6, 6.3, 14.2, 'F');
});
const mendwife = mouseBuild({ fur: 'U', light: 'm' }, 1, [22, 12, 10], (s) => {
  // Violet shawl over the back and a roll of sticking plaster dragged behind
  s.ell(8.6, 6, 5.2, 4.4, 3.7, 2, 'V');
  s.rod(1.6, 3.6, 1.6, 1.6, 8.4, 1.6, 1.4, 'Z');
});

/**
 * Paper Pilot: a mouse in brass goggles on a folded paper plane. The wings are fanned
 * from the nose to the trailing edge; their tips flex between frames.
 */
const paperPilot: VoxelBuild = {
  size: [22, 14, 10],
  scale: 1,
  sculpt(s, frame) {
    const flex = frame === 0 ? 0.7 : -0.1;
    const nose: [number, number, number] = [20.6, 7, 2.6];
    for (let w = -6.2; w <= 6.21; w += 0.45) {
      s.rod(...nose, 3, 7 + w, 2.6 + (flex * Math.abs(w)) / 6.2, 0.45, 'J');
    }
    // Ruled lines across the wings and the crease of the keel underneath
    for (const side of [-1, 1]) {
      s.rod(15, 7 + side * 1.6, 2.95, 5, 7 + side * 5.1, 2.95 + flex * 0.8, 0.3, 'L');
    }
    s.rod(5, 7, 1.4, 19.6, 7, 2.3, 0.7, 'j');
    // The pilot: body, head, snout, goggles, ears, a red scarf streaming back, tail
    s.ell(10.4, 7, 4.8, 3.2, 2.4, 2.2, 'Q');
    s.ell(10.8, 7, 3.9, 2.4, 1.8, 1.2, 'q');
    s.ell(13.6, 7, 6.2, 2.1, 2, 1.9, 'Q');
    s.ell(15.6, 7, 5.9, 1.1, 1, 0.9, 'Q');
    s.ell(16.7, 7, 5.9, 0.45, 0.45, 0.45, 'R');
    s.rod(14, 5.1, 7.1, 14, 8.9, 7.1, 0.45, 'K');
    s.ell(14.9, 6.1, 7, 0.6, 0.65, 0.65, 'N');
    s.ell(14.9, 7.9, 7, 0.6, 0.65, 0.65, 'N');
    s.cyl(12.6, 4.8, 7.6, 8.1, 1.3, 'R');
    s.cyl(12.6, 9.2, 7.6, 8.1, 1.3, 'R');
    s.rod(12.2, 7, 5.4, 7.8, 7 + (frame === 0 ? 0.9 : -0.9), 6.2, 0.55, 'F');
    s.rod(8.4, 7, 3.6, 5.6, 7 + (frame === 0 ? -1 : 1), 3.2, 0.35, 'R');
  },
};

export const lightsOutVoxels: VoxelSet = {
  detail: 1.6,
  materials: MATERIALS,
  eliteScale: 1.1,
  towers: {
    repeater: rifleman,
    cannon: spoonGunner,
    pulse: drummer,
    sniper: proneSniper,
    harpoon: dartRanger,
  },
  creeps: {
    normal: scamp,
    swarm: nibbler,
    armored: capshield,
    swift: scurrier,
    regen: sugarlump,
    boss: gnawbone,
    flier: paperPilot,
  },
  heroes: {
    vanguard: herald,
    warden: mendwife,
  },
};
