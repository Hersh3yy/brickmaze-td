import { lightsOutVoxels } from './lightsOutVoxels';
import type { PaletteMap, SpriteGrid, WorldDefinition, WorldSprites } from './types';
import {
  HERO_LIVES_COST,
  RALLY_MAX_BONUS,
  RALLY_TOUGHNESS_PER_KILL,
  VANGUARD_SPEED_BONUS,
  WARDEN_REGEN_PER_SEC,
  HORDE_COUNT_MULT,
} from '../domain/constants';

/**
 * Lights Out: when the house goes dark the toys wake up (the Night Shift) and hold the
 * floor against the Wainscot Clan, the mice that live in the walls and want the pantry.
 *
 * Originality rules for this World: folk toy archetypes only (green plastic army men, a
 * wind-up key, a drummer, a spoon catapult, a sewing needle), no names or designs from any film or toy line, no
 * studded brand-like bricks (walls are wooden blocks), no red-cross symbol.
 *
 * Style: 1-px outline in one shared night-ink colour, light from the top left, at most four
 * colours per sprite plus outline. Mice use browns, greys, pinks and creams only, so they
 * never share a colour with an element (yellow / red / green) or a projectile.
 */

const INK = '#1A1420';
const PINK = '#E8A0A8';

const mouse = (body: string, light: string, dark: string, extra: PaletteMap = {}): PaletteMap => ({
  o: INK,
  B: body,
  L: light,
  D: dark,
  E: INK,
  P: PINK,
  ...extra,
});

/** Two walk frames that share a body and differ only in the bottom (leg) rows. */
const walk = (body: SpriteGrid, legsA: SpriteGrid, legsB: SpriteGrid): [SpriteGrid, SpriteGrid] => [
  [...body, ...legsA],
  [...body, ...legsB],
];

const sprites: WorldSprites = {
  detail: 'scale2x',
  creepFacing: 'side',
  turretView: 'face',
  voxels: lightsOutVoxels,
  elements: {
    kinetic: { c: '#C9A27E', l: '#EBD3B5', d: '#8A6544' },
    yellow: { c: '#F5B82E', l: '#FDE68A', d: '#B7791F' },
    red: { c: '#E8553E', l: '#FDBA9B', d: '#9B2C1E' },
    green: { c: '#2BB5A0', l: '#9EEBDD', d: '#167366' },
    purple: { c: '#B07CE8', l: '#E5D4FA', d: '#6E3FA8' },
  },
  turretPalette: {
    o: INK,
    G: '#6E8B3D',
    g: '#A3BC62',
    H: '#465C25',
    S: '#56606E',
    M: '#98A3B3',
    m: '#E1E6EE',
    W: '#7A4A24',
    w: '#B5773F',
    K: '#B8860B',
    k: '#F2D06B',
    R: '#D9B48A',
    P: '#F1E7D3',
    N: '#EEF1F5',
    F: '#D64545',
  },
  // Elite in the flat fallback: gold-painted trim and brass (the 3D models add more)
  elite: { palette: { H: '#A57D18', K: '#E5B83A', k: '#FFE793' }, trim: '#FFE793' },
  // Green plastic army men on round bases, seen from the side and facing right; the
  // renderer mirrors them to face targets on the left. The base is element-painted.
  turrets: {
    // Clockwork Corporal: rifleman firing from the hip, brass winding key on his back.
    repeater: [
      '.....oooo.......',
      '....oggGGo......',
      '...ogGGGGGo.....',
      '..oooHHHHooo....',
      '....oGgGGo......',
      '....oGgGHo......',
      '...ooGGGGoo.....',
      '.kooGgGGGGGooooo',
      'kKkoGgGGooHHHHHo',
      '.kooGGGGGoooooo.',
      '...oGGGGGo......',
      '...oGGoGGo......',
      '...oHHooHHo.....',
      '..oooooooooo....',
      '.oggggggggggo...',
      '..oHHHHHHHHo....',
    ],
    // Spoon Gunner: kneeling beside a spoon catapult loaded with a marble.
    cannon: [
      '................',
      '..oooo.....ooo..',
      '.oggGGo...oMmMo.',
      'oGGGGGGo..oMLCo.',
      'ooHHHHoo...oMo..',
      '.oGgGGo...oMo...',
      '.oGgGHo..oMo....',
      'ooGGGGGooMo.....',
      'oGgGGGGGMo......',
      'oGGGGGooMo......',
      'oGGGGGoWWWWWWo..',
      'oGGoGGowwwwwwo..',
      'oHHoHHoooooooo..',
      'ooooooooooooooo.',
      'ogggggggggggggo.',
      '.oHHHHHHHHHHHo..',
    ],
    // Drum Sergeant: drummer with sticks up and a painted drum in front.
    pulse: [
      '.....oooo.......',
      '....oggGGo...o..',
      '...ogGGGGGo.oWo.',
      '..oooHHHHoooWo..',
      '....oGgGGooWo...',
      '....oGgGHoGo....',
      '...ooGGGGGo.....',
      '..oGgGGGGGo.....',
      '..oGGooooooooo..',
      '..oGoPPPPPPPPo..',
      '..oGoCDCDCDCDo..',
      '..oGoCCDCDCDCo..',
      '..oHoDDDDDDDDo..',
      '.oooooooooooooo.',
      'oggggggggggggggo',
      '.oHHHHHHHHHHHHo.',
    ],
    // Needlepoint: lying flat behind a long sewing-needle rifle with a brass bead.
    sniper: [
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '..oooo..........',
      '.ogGGGo....okko.',
      'ooHHHHoooooooooo',
      'oGgGGGHHHHNNNNNm',
      'oGGGGGGGGGoooooo',
      'oHHHooHHHHo.....',
      '.ooo..oooo......',
      '.oooooooooooo...',
      'oggggggggggggo..',
      '.oHHHHHHHHHHo...',
    ],
    // Dart Ranger: hip-firing a dart blaster tilted up at the planes, red suction cup.
    harpoon: [
      '.....oooo.......',
      '....oggGGo......',
      '...ogGGGGGo.....',
      '..oooHHHHooo....',
      '....oGgGGo...oo.',
      '....oGgGHo.ooPFo',
      '...ooGGGGooCCoo.',
      '...oGgGGGoCCo...',
      '...oGgGGGCCo....',
      '...oGGGGCCo.....',
      '...oGGGGGo......',
      '...oGGoGGo......',
      '...oHHooHHo.....',
      '..oooooooooo....',
      '.oggggggggggo...',
      '..oHHHHHHHHo....',
    ],
  },
  creeps: {
    // Scamp: brown house mouse, round pink ear, pointed snout, pink tail. Faces right.
    normal: walk(
      [
        '..............',
        '......oo......',
        '.....oPPo.....',
        '....oPPPPo....',
        '...oooooooo...',
        '..oBBBBBBBBo..',
        '.oBLLBBBBBEBo.',
        '.oBLLBBBBBBBBP',
        '.oBBBBBBBBBoo.',
        'PoDDDDDDDDo...',
      ],
      ['P.oDo..oDo....', '.P.oo..oo.....'],
      ['P..oDooDo.....', '.P..oooo......']
    ),
    // Nibblers: grey mouselings with an oversized ear; the renderer draws them small.
    swarm: walk(
      [
        '..............',
        '.....oooo.....',
        '....oPPPPo....',
        '....oPPPPo....',
        '...ooPPPPoo...',
        '..oBBooooBBo..',
        '.oBLLBBBBBEBo.',
        '.oBLBBBBBBBBBP',
        '.oBBBBBBBBBoo.',
        'PoDDDDDDDDo...',
      ],
      ['P.oDo..oDo....', '.P.oo..oo.....'],
      ['P..oDooDo.....', '.P..oooo......']
    ),
    // Capshield: thimble helmet instead of an ear and a crimped bottle-cap shield in front.
    armored: walk(
      [
        '..............',
        '.....oooo.....',
        '....oMmMmo....',
        '....omMmMo.oo.',
        '...oooooooYYo.',
        '..oBBBBBBoYyYo',
        '.oBLLBBBBoyYyo',
        '.oBLLBBBBoYyYo',
        '.oBBBBBBBoyYyo',
        'PoDDDDDDDoYYo.',
      ],
      ['P.oDo..oDooo..', '.P.oo..oo.....'],
      ['P..oDooDo.....', '.P..oooo......']
    ),
    // Scurrier: lean, ears flat back, long tail and a speed streak behind it.
    swift: walk(
      [
        '..............',
        '..............',
        '..............',
        '.......ooo....',
        '......oPPPo...',
        '.LL..oooooooo.',
        '....oBLLBBBEBo',
        'PPPoBBBBBBBBBP',
        '.LL.oDDDDDDoo.',
        '....oDDDDDo...',
      ],
      ['...oDo...oDo..', '..oo......oo..'],
      ['.....oDooDo...', '.....oo..oo...']
    ),
    // Paper Pilot: a mouse in brass goggles riding a folded paper plane.
    flier: [
      [
        '..............',
        '........oo....',
        '.......oPPo...',
        '......oBBBBoo.',
        '......oBKBEBBo',
        '...P..oBBBBo..',
        'oooooooooooooo',
        'oWWWWWWWWWWWoo',
        '.owwwwwwwwoo..',
        '..ooooooo.....',
      ],
      [
        '..............',
        '........oo....',
        '.......oPPo...',
        '......oBBBBoo.',
        '......oBKBEBBo',
        '..P...oBBBBo..',
        '.ooooooooooooo',
        '.oWWWWWWWWWWWo',
        '..owwwwwwwoo..',
        '...oooooo.....',
      ],
    ],
    // Sugarlump: a fat mouse with a white sugar cube strapped to its back.
    regen: walk(
      [
        '..ooooo.......',
        '..oWWWwo.oo...',
        '..oWWWwooPPo..',
        '..owwwwoPPPPo.',
        '.ooooooooooo..',
        'oBBBBBBBBBBBo.',
        'oBLLBBBBBBBEBo',
        'oBLLBBBBBBBBBP',
        'oBBBBBBBBBBoo.',
        'PoDDDDDDDDDo..',
      ],
      ['P.oDo...oDo...', '.P.oo...oo....'],
      ['P..oDo.oDo....', '.P..oo.oo.....']
    ),
    // Old Gnawbone and friends: a big grey rat with a bottle-cap crown and a nicked ear.
    boss: walk(
      [
        '.......YoYoY..',
        '.......YYYYY..',
        '......ooooooo.',
        '.....oPPoPPPo.',
        '.....oPPPPPPo.',
        '..ooooooooooo.',
        '.oBBBBBBBBBBo.',
        'oBLLBBBBBBBEBo',
        'oBLLBBBBBBBBBP',
        'oBBBBBBBBBBBoo',
        'oBBBBBBBBBBo..',
        'PoDDDDDDDDDo..',
      ],
      ['PPoDDo..oDDo..', '.Poooo..oooo..'],
      ['PPooDDooDDo...', '.P.oooooooo...']
    ),
  },
  creepPalettes: {
    normal: mouse('#8B6447', '#B48A68', '#5C3F2B'),
    swarm: mouse('#8E8A86', '#BDB8B2', '#5E5A57'),
    armored: mouse('#7A6250', '#A28A76', '#4E3D31', {
      M: '#A9B1BC',
      m: '#E3E7EC',
      Y: '#C9A43A',
      y: '#8C6F1E',
    }),
    swift: mouse('#A07A55', '#C9A57F', '#6A4E34', { L: '#EBDCC8' }),
    flier: mouse('#B8915E', '#DDBE93', '#86653D', { W: '#FBFAF6', w: '#D9D3C7', K: '#D9B23F' }),
    regen: mouse('#9C7B62', '#C4A58C', '#664D3B', { W: '#FBFAF6', w: '#D9D3C7' }),
    boss: mouse('#6F6B70', '#9C97A0', '#45424A', { Y: '#D9B23F' }),
  },
  heroes: {
    // Toothpick Herald: carries a red pennant on a toothpick high above its head.
    vanguard: {
      frames: walk(
        [
          '...ooooo......',
          '...oRRRRo.....',
          '...oRRo.......',
          '...oWo.oo.....',
          '...oWooPPo....',
          '...oWoPPPPo...',
          '..ooWoooooo...',
          '.oBBWBBBBBBo..',
          'oBLLWBBBBBEBo.',
          'oBLLBBBBBBBBBP',
          'PoBBBBBBBBBoo.',
          'PoDDDDDDDDo...',
        ],
        ['.PoDo...oDo...', '..oo....oo....'],
        ['.P.oDo.oDo....', '...oo..oo.....']
      ),
      palette: mouse('#8B6447', '#B48A68', '#5C3F2B', { R: '#D64545', W: '#E8D3A8' }),
    },
    // Mendwife: an old mouse in a violet shawl dragging a roll of sticking plaster.
    warden: {
      frames: walk(
        [
          '..............',
          '......oo......',
          '.....oPPo.....',
          '....oPPPPo....',
          '...oooooooo...',
          '..oVVVVVBBBo..',
          '.oVvVVVVBBEBo.',
          '.oVVVVVVBBBBBP',
          'TTooBBBBBBBoo.',
          'TtoDDDDDDDo...',
        ],
        ['TT.oDo..oDo...', '...oo...oo....'],
        ['TT..oDooDo....', '....oooo......']
      ),
      palette: mouse('#A89A8C', '#CFC3B6', '#6E6358', {
        V: '#7C5CA8',
        v: '#A88BD0',
        T: '#E6C9A0',
        t: '#B8956B',
      }),
    },
  },
  projectiles: {
    // cork
    kinetic: [
      '........',
      '..oooo..',
      '.oRRRro.',
      '.oRRRro.',
      '.oRRRro.',
      '..oooo..',
      '........',
      '........',
    ],
    // ember
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
    // spark
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
    // a pinch of glitter: a four-point sparkle with loose specks
    purple: [
      '...o....',
      '..oWo...',
      '.ooLoo.l',
      'oLWWWLo.',
      '.ooLoo..',
      '..oWo.l.',
      '...o....',
      '........',
    ],
    // slime glob with a drip
    green: [
      '..oooo..',
      '.oGLLGo.',
      'oGLWGGGo',
      'oGGGGGGo',
      '.oGGGGo.',
      '..oGoo..',
      '..oGo...',
      '...o....',
    ],
  },
  projectilePalettes: {
    kinetic: { o: INK, R: '#D9B48A', r: '#9C7650' },
    red: { o: '#7A2214', F: '#E8553E', W: '#FDE68A' },
    yellow: { o: '#7A4E0E', L: '#F5B82E', W: '#FFFFFF' },
    green: { o: '#0E4A42', G: '#2BB5A0', L: '#9EEBDD', W: '#F0FDFA' },
    purple: { o: '#3E1E66', L: '#B07CE8', l: '#E5D4FA', W: '#FFFFFF' },
  },
  emblems: {
    // match flame
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
    // battery
    yellow: [
      '..xxx..',
      'xxxxxxx',
      'x.....x',
      'x..x..x',
      'x.xxx.x',
      'x..x..x',
      'x.....x',
      'xxxxxxx',
    ],
    // slime drip
    green: [
      '.xxxxx.',
      'xxxxxxx',
      'xxxxxxx',
      'x.xxx.x',
      '..x.x..',
      '..x.x..',
      '..x....',
      '.......',
    ],
    // glitter sparkle with a speck
    purple: [
      '...x..x',
      '...x...',
      '..xxx..',
      'xxxxxxx',
      '..xxx..',
      '...x...',
      'x..x...',
      '.......',
    ],
  },
};

export const lightsOut: WorldDefinition = {
  id: 'lights_out',
  name: 'Lights Out',
  tagline: 'When the house goes dark, the toys wake up and hold the floor against the mice in the walls.',
  brickStyle: 'block',
  boards: {
    toybox_slate: {
      name: 'Kitchen at Night',
      floor: 'checker',
      baseBg: '#12151F',
      cellFill: '#1E2433',
      cellAlt: '#252C3D',
      gridLine: '#151A26',
      pathColor: '#FBBF24',
      grayWall: '#9A6B43',
      grayWallLight: '#C99A6B',
      grayWallDark: '#5E3B22',
    },
    midnight_workshop: {
      name: 'Hallway Boards',
      floor: 'planks',
      baseBg: '#18120E',
      cellFill: '#2B2019',
      cellAlt: '#31251D',
      gridLine: '#1A130E',
      pathColor: '#7DD3FC',
      grayWall: '#B89470',
      grayWallLight: '#DEC09C',
      grayWallDark: '#6E5236',
    },
    retro_handheld: {
      name: 'Attic Dust',
      floor: 'planks',
      baseBg: '#1A1816',
      cellFill: '#25221F',
      cellAlt: '#2A2623',
      gridLine: '#161412',
      pathColor: '#FDE68A',
      grayWall: '#A58A5F',
      grayWallLight: '#CDB488',
      grayWallDark: '#64512F',
    },
    volcanic_forge: {
      name: 'Fireside Rug',
      floor: 'checker',
      baseBg: '#1C1011',
      cellFill: '#2C1819',
      cellAlt: '#331C1D',
      gridLine: '#1E1011',
      pathColor: '#FDBA74',
      grayWall: '#7A5235',
      grayWallLight: '#A87A55',
      grayWallDark: '#45301F',
    },
  },
  text: {
    wall: 'Wooden Block',
    defenders: 'The Night Shift',
    attackers: 'The Wainscot Clan',
    towers: {
      repeater: {
        name: 'Clockwork Corporal',
        description: 'A wind-up plastic rifleman. Fires fast and spreads element ammo.',
      },
      cannon: {
        name: 'Spoon Gunner',
        description: 'Lobs marbles from a spoon catapult. Every marble splashes the mice around it.',
      },
      pulse: {
        name: 'Drum Sergeant',
        description: 'A plastic drummer. Every beat sends out a ring that hits every mouse inside it.',
      },
      sniper: {
        name: 'Needlepoint',
        description: 'Lies flat behind a sewing-needle rifle with the longest reach. Goes straight through shields.',
      },
      harpoon: {
        name: 'Dart Ranger',
        description: 'Shoots suction-cup darts on a string that pin a mouse in place. Double damage to paper planes, half to mice on the floor.',
      },
    },
    elements: {
      yellow: {
        label: 'Yellow',
        elementName: 'Spark',
        bonusShort: 'Spark · Speed & Jump',
        bonusDetail: '+30% attack speed, and sparks jump to 2 nearby mice.',
      },
      red: {
        label: 'Red',
        elementName: 'Matchhead',
        bonusShort: 'Matchhead · Damage & Splash',
        bonusDetail: '+35% damage, and shots burst into a fiery splash.',
      },
      green: {
        label: 'Green',
        elementName: 'Slime',
        bonusShort: 'Slime · Slow & Sting',
        bonusDetail: 'Sticky slime slows mice by 35% and stings more with every coat.',
      },
      purple: {
        label: 'Purple',
        elementName: 'Glitter',
        bonusShort: 'Glitter · Reach & Pierce',
        bonusDetail: '+22% reach, +12% crit, shots pass through to the next mouse, and glitter goes straight through shields.',
      },
    },
    synergies: {
      plasma: { name: 'Short Circuit', shortEffect: 'Fire splash + jumping sparks, +20% speed' },
      wildfire: { name: 'Grease Fire', shortEffect: 'Huge fire splash + shield shred + burn' },
      static_venom: { name: 'Fizzing Slime', shortEffect: 'Jumping sparks spread slime slow and sting' },
      overcharge: { name: 'Fresh Batteries', shortEffect: 'Same colour link: +45% element power' },
      prism: { name: 'Sparkle Arc', shortEffect: 'Sparks jump further + sharper crits' },
      hexfire: { name: 'Glitter Bomb', shortEffect: 'Bigger fiery splash + harder crits' },
      witchbrew: { name: 'Glitter Slime', shortEffect: 'Stickier, longer slime' },
    },
    maps: {
      crossroad: { name: 'The Kitchen', description: 'Open tiles from the mouse hole to the pantry door.' },
      twin_choke: { name: 'The Hallway', description: 'Two table legs make natural choke points.' },
      spiral_vault: { name: 'The Attic', description: 'The corners funnel the mice towards the trapdoor.' },
    },
    waves: {
      normal: 'Scamps',
      swarm: 'Nibblers',
      armored: 'Capshields',
      swift: 'Scurriers',
      regen: 'Sugarlumps',
      flier: 'Paper Pilots',
    },
    bosses: ['Old Gnawbone', 'Grand Whisker', 'Baron Rindsworth', 'Matron Mildew', 'The Cellar Tyrant', 'Gnasher Rex'],
    heroes: { vanguard: 'Toothpick Herald', warden: 'Mendwife' },
    modifiers: {
      rally: {
        label: 'Grudge',
        detail: `Every fallen mouse makes the rest ${Math.round(RALLY_TOUGHNESS_PER_KILL * 100)}% angrier and tougher, up to +${Math.round(RALLY_MAX_BONUS * 100)}%. Take them out together.`,
      },
      escort: {
        label: 'Escort',
        detail: `A Toothpick Herald leads (+${Math.round(VANGUARD_SPEED_BONUS * 100)}% wave speed while it lives) and a Mendwife trails (heals the wave ${WARDEN_REGEN_PER_SEC * 100}%/s while she lives; poisoned mice get no heal). Each costs ${HERO_LIVES_COST} lives if it reaches the pantry.`,
      },
    },
    horde: {
      label: 'Stampede',
      detail: `Right before the big one, ${HORDE_COUNT_MULT}× as many mice pour out of the walls. Crumbs for everyone.`,
    },
  },
  sprites,
};
