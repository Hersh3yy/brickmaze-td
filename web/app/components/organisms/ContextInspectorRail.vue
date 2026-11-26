<script setup lang="ts">
import { Skull, X } from '@lucide/vue';
import {
  BRICK_COLOR_LIST,
  DIFFICULTY_DEFS,
  ELITE_AMPLIFY,
  ELITE_LEVEL,
  MAX_ELITE_TOWERS,
  SYNERGY_CATALOG,
  TOWER_DEFS,
  TOWER_LEVEL_SCALES,
  getWaveDefinition,
} from '~/game/domain/constants';
import { towerModifiers } from '~/game/domain/simulation';
import { computeTileModifiers, fusedBrickName } from '~/game/domain/synergy';
import { waveTitle } from '~/game/worlds';
import type {
  BrickColor,
  DifficultyId,
  GamePhase,
  GridCell,
  Tower,
} from '~/game/domain/types';

const props = defineProps<{
  grid: GridCell[][];
  wave: number;
  difficulty: DifficultyId;
  phase: GamePhase;
  selectedCell: GridCell | null;
  selectedTower: Tower | null;
  /** Towers currently at Elite, for the "x of 2" cap. */
  eliteCount: number;
}>();

// Details only: every action lives in the on-board TileActionMenu.
const emit = defineEmits<{
  closeMobile: [];
}>();

const ASIDE_CLASS =
  'flex flex-col h-full bg-[#1C2430] lg:border-l border-[#2F3D51] overflow-y-auto p-4';
const CLOSE_BTN_CLASS =
  'lg:hidden p-1.5 -mr-1.5 rounded-md text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer shrink-0';

const AMMO_HINT: Record<BrickColor, string> = {
  yellow: 'Speed + Chain',
  red: 'Bonus Damage + Splash',
  green: 'Slow + Damage over time',
  purple: 'Range + Pierce, ignores armor',
};

const world = useWorld();
/** This World's name for an element, e.g. "Lightning" or "Spark". */
const el = (c: BrickColor) => world.value.text.elements[c].elementName;

const isCombat = computed(() => props.phase === 'COMBAT');
const currentWaveDef = computed(() => getWaveDefinition(props.wave, props.difficulty));
const diffLabel = computed(() => DIFFICULTY_DEFS[props.difficulty].label);
const synergyCatalog = Object.values(SYNERGY_CATALOG);

// --- Tower selected ---
const towerView = computed(() => {
  const tower = props.selectedTower;
  if (!tower) return null;

  const def = TOWER_DEFS[tower.type];
  const mods = towerModifiers(props.grid, tower);
  const scales = TOWER_LEVEL_SCALES[tower.level];
  const dmgScale = scales.damage;
  const rateScale = scales.fireRate;
  const rangeScale = scales.range;
  const isElite = tower.level === ELITE_LEVEL;
  const nextIsElite = tower.level === ELITE_LEVEL - 1;

  return {
    tower,
    def,
    mods,
    finalDmg: Math.round(def.baseDamage * dmgScale * mods.damageMult),
    finalRate: (def.baseFireRate * rateScale * mods.fireRateMult).toFixed(1),
    finalRange: (def.baseRange * rangeScale * mods.rangeMult).toFixed(1),
    isElite,
    nextIsElite,
    eliteBlocked: nextIsElite && props.eliteCount >= MAX_ELITE_TOWERS,
  };
});

// --- Brick or gray wall selected (no tower on it) ---
const cellView = computed(() => {
  const cell = props.selectedCell;
  if (
    !cell ||
    (cell.kind !== 'GRAY_WALL' && cell.kind !== 'ACTIVE_BRICK' && cell.kind !== 'MASTER_BRICK')
  ) {
    return null;
  }

  const isGray = cell.kind === 'GRAY_WALL';
  const mods = computeTileModifiers(props.grid, cell.x, cell.y);

  let title = world.value.text.wall;
  if (cell.kind === 'MASTER_BRICK' && cell.color) {
    title = fusedBrickName(cell.color, cell.secondaryColor ?? cell.color);
  }
  else if (cell.kind === 'ACTIVE_BRICK' && cell.color) {
    title = `${el(cell.color)} Brick`;
  }

  let effectText = '';
  if (cell.color) {
    if (!mods.isDoubleElement) {
      effectText = world.value.text.elements[cell.color].bonusDetail;
    } else if (cell.color === 'green') {
      effectText = `Double ${el('green')} (×2): ${Math.round(mods.slowFactor * 100)}% slow for ${mods.slowDuration.toFixed(1)}s + ${Math.round(mods.poisonDpsRatio * 100)}% corrosive DoT/s (ignores armor).`;
    } else if (cell.color === 'red') {
      effectText = `Double ${el('red')} (×2): +${Math.round((mods.damageMult - 1) * 100)}% damage, +${mods.extraSplashRadius}px splash & ${Math.round(mods.burnDpsRatio * 100)}% burn/s.`;
    } else {
      effectText = `Double ${el('yellow')} (×2): +${Math.round((mods.fireRateMult - 1) * 100)}% attack speed & ${mods.chainCount} lightning chains.`;
    }
  }

  return {
    cell,
    isGray,
    mods,
    title,
    effectText,
  };
});

const isBossWave = computed(() => currentWaveDef.value.trait === 'boss');
const isPreBoss = computed(() => props.wave % 5 === 4);
</script>

<template>
  <!-- Tower inspector -->
  <aside v-if="towerView" :class="[ASIDE_CLASS, 'space-y-4']">
    <div class="pb-3 border-b border-[#2D3A4D]">
      <div class="flex items-center justify-between gap-2">
        <h3 class="text-base font-bold text-slate-100">{{ world.text.towers[towerView.tower.type].name }}</h3>
        <div class="flex items-center gap-2">
          <span v-if="towerView.isElite" class="font-mono text-xs font-bold text-fuchsia-300">★ Elite</span>
          <span v-else class="font-mono text-xs text-amber-300">Tier {{ towerView.tower.level }}/3</span>
          <button type="button" aria-label="Close panel" :class="CLOSE_BTN_CLASS" @click="emit('closeMobile')">
            <X class="w-4 h-4" />
          </button>
        </div>
      </div>
      <p class="text-xs text-slate-400 mt-0.5">
        Weapon: {{ towerView.def.shortRole }} · Ammo:
        <span class="text-slate-200 font-medium">{{ towerView.mods.ammoLabel }}</span>
      </p>
    </div>

    <!-- Core weapon stats -->
    <div class="grid grid-cols-3 gap-2 text-xs">
      <div>
        <div class="text-slate-400">Damage</div>
        <div class="font-mono font-bold text-slate-100 tabular-nums mt-0.5">{{ towerView.finalDmg }}</div>
      </div>
      <div>
        <div class="text-slate-400">Speed</div>
        <div class="font-mono font-bold text-slate-100 tabular-nums mt-0.5">{{ towerView.finalRate }}/s</div>
      </div>
      <div>
        <div class="text-slate-400">Range</div>
        <div class="font-mono font-bold text-slate-100 tabular-nums mt-0.5">{{ towerView.finalRange }}</div>
      </div>
    </div>

    <!-- Active elemental ammo effects -->
    <div class="pt-2 border-t border-[#2D3A4D] space-y-1.5">
      <div class="flex items-center justify-between text-xs">
        <span class="text-slate-400">Loaded Projectile Type</span>
        <span v-if="towerView.mods.isDoubleElement" class="font-mono font-bold text-amber-300">×2 FUSED</span>
      </div>
      <p v-if="towerView.mods.primaryElement === 'kinetic'" class="text-xs text-slate-400">
        Plain ammo. Move it onto a colour brick between waves to give it an element.
      </p>
      <div v-else class="space-y-1.5">
        <div class="flex flex-wrap gap-2">
          <BrickColorGlyph
            v-if="towerView.mods.isDoubleElement && towerView.mods.brickColors[0]"
            :color="towerView.mods.brickColors[0]"
            :secondary-color="towerView.mods.brickColors[0]"
            size="sm"
            show-label
          />
          <template v-else>
            <BrickColorGlyph
              v-for="(c, idx) in towerView.mods.brickColors"
              :key="`${c}-${idx}`"
              :color="c"
              size="sm"
              show-label
            />
          </template>
        </div>
        <div class="text-xs text-slate-300 space-y-0.5 tabular-nums">
          <div v-if="towerView.mods.chainCount > 0">⚡ Chains to +{{ towerView.mods.chainCount }} targets</div>
          <div v-if="towerView.mods.extraSplashRadius > 0">
            🔥 +{{ towerView.mods.extraSplashRadius }}px splash ·
            {{ Math.round(towerView.mods.burnDpsRatio * 100) }}% burn/s
          </div>
          <div v-if="towerView.mods.slowFactor > 0">
            ☣ {{ Math.round(towerView.mods.slowFactor * 100) }}% slow ({{ towerView.mods.slowDuration.toFixed(1) }}s)
            · {{ Math.round(towerView.mods.poisonDpsRatio * 100) }}% DoT/s
          </div>
          <div v-if="towerView.mods.sameColorNeighbors >= 2" class="text-amber-300">
            Cluster Resonance: {{ towerView.mods.sameColorNeighbors }} matching neighbors
          </div>
        </div>
      </div>
    </div>

    <div v-if="towerView.nextIsElite || towerView.isElite" class="pt-2 border-t border-[#2D3A4D]">
      <p v-if="towerView.nextIsElite" class="text-[11px] leading-snug text-slate-400">
        <span class="text-fuchsia-300 font-semibold">Elite</span> amplifies what this tower already does:
        element bonuses ×{{ ELITE_AMPLIFY.elementPower }}, +{{ ELITE_AMPLIFY.extraChains }} chain jumps if it chains,
        more slow if it slows, +{{ Math.round(ELITE_AMPLIFY.extraCrit * 100) }}% crit.
        <span :class="towerView.eliteBlocked ? 'text-rose-300' : 'text-slate-300'">
          {{ eliteCount }}/{{ MAX_ELITE_TOWERS }} Elites used.
        </span>
      </p>
      <div v-else class="text-xs font-mono text-fuchsia-300">Elite · max tier</div>
    </div>

    <p class="text-[11px] text-slate-500">Upgrade, move, sell and targeting are in the menu on the board.</p>

    <div v-if="towerView.mods.activeSynergies.length > 0" class="pt-2 border-t border-[#2D3A4D]">
      <div class="text-xs text-amber-300 font-medium mb-1">Active Combos</div>
      <SynergyLinkRow v-for="syn in towerView.mods.activeSynergies" :key="syn.id" :synergy="syn" active />
    </div>
  </aside>

  <!-- Brick / gray wall inspector -->
  <aside v-else-if="cellView" :class="[ASIDE_CLASS, 'space-y-4']">
    <div class="pb-3 border-b border-[#2D3A4D]">
      <div class="flex items-center justify-between gap-2">
        <h3 class="text-base font-bold text-slate-100">{{ cellView.title }}</h3>
        <button type="button" aria-label="Close panel" :class="CLOSE_BTN_CLASS" @click="emit('closeMobile')">
          <X class="w-4 h-4" />
        </button>
      </div>
      <p class="text-xs text-slate-400 mt-1">
        {{
          cellView.isGray
            ? 'Plain mount, no element. Replant a colour brick on it for free next turn, or remove it from the board menu (even mid-wave) to open space.'
            : 'Any weapon mounted here fires this brick’s elemental ammo.'
        }}
      </p>
    </div>

    <div v-if="!cellView.isGray && cellView.cell.color" class="space-y-2">
      <BrickColorGlyph
        :color="cellView.cell.color"
        :secondary-color="cellView.cell.secondaryColor"
        size="md"
        show-label
      />
      <p class="text-xs text-slate-300 leading-relaxed">{{ cellView.effectText }}</p>
      <p v-if="cellView.mods.adjacentLinkCount > 0" class="text-[11px] text-amber-300">
        Linked to {{ cellView.mods.adjacentLinkCount }} adjacent
        brick{{ cellView.mods.adjacentLinkCount === 1 ? '' : 's'
        }}{{
          cellView.mods.sameColorNeighbors >= 2
            ? ` (${cellView.mods.sameColorNeighbors} same-color cluster bonus!)`
            : '.'
        }}
      </p>
    </div>

    <div v-if="cellView.mods.activeSynergies.length > 0" class="pt-2 border-t border-[#2D3A4D]">
      <div class="text-xs text-amber-300 font-medium mb-1">Active Combos</div>
      <SynergyLinkRow v-for="syn in cellView.mods.activeSynergies" :key="syn.id" :synergy="syn" active />
    </div>

  </aside>

  <!-- Default: next wave + rules reference -->
  <aside v-else :class="[ASIDE_CLASS, 'space-y-5']">
    <div :class="['space-y-1.5', isBossWave ? 'p-3 rounded-md bg-rose-950/45 border border-rose-500/45' : '']">
      <div class="flex items-center justify-between gap-2">
        <div
          :class="[
            'text-[11px] font-semibold flex items-center gap-1.5',
            isBossWave ? 'text-rose-300' : 'text-slate-400',
          ]"
        >
          <Skull v-if="isBossWave" class="w-3.5 h-3.5 text-rose-400 shrink-0" />
          <span>{{ isBossWave ? `BOSS WAVE · ${diffLabel}` : `${isCombat ? 'This Wave' : 'Next Wave'} · ${diffLabel}` }}</span>
        </div>
        <button type="button" aria-label="Close panel" :class="CLOSE_BTN_CLASS" @click="emit('closeMobile')">
          <X class="w-4 h-4" />
        </button>
      </div>
      <div class="text-sm font-bold text-slate-100">
        Wave {{ currentWaveDef.wave }} · {{ waveTitle(currentWaveDef, world) }}
      </div>
      <div class="font-mono text-xs text-slate-300 tabular-nums">
        {{ currentWaveDef.count }}x{{ currentWaveDef.modifier === 'escort' ? ' + 2 heroes' : '' }} ·
        {{ currentWaveDef.hp.toLocaleString() }} HP · {{ Math.round(currentWaveDef.armor * 100) }}% Armor
      </div>
      <p v-if="currentWaveDef.horde" class="text-[11px] text-amber-200 leading-snug pt-0.5">
        <span class="font-semibold text-amber-300">{{ world.text.horde.label }}:</span>
        {{ world.text.horde.detail }}
      </p>
      <p v-if="currentWaveDef.modifier" class="text-[11px] text-sky-200 leading-snug pt-0.5">
        <span class="font-semibold text-sky-300">{{ world.text.modifiers[currentWaveDef.modifier].label }}:</span>
        {{ world.text.modifiers[currentWaveDef.modifier].detail }}
      </p>
      <p v-if="currentWaveDef.armor > 0" class="text-[11px] text-slate-400 leading-snug">
        Armor only blocks direct hits. {{ el('yellow') }} chains, splash, {{ el('green').toLowerCase() }} and burn go straight through.
      </p>
      <p v-if="isBossWave" class="text-[11px] text-rose-200/90 leading-snug pt-0.5">
        Bosses cost 3 lives if leaked. Fortify with {{ world.text.towers.sniper.name }}s, {{ el('red') }} bursts, or {{ el('green') }} slow!
      </p>
      <p v-if="isPreBoss" class="text-[11px] text-amber-300/90 pt-0.5">
        Heads up: Boss fight arrives on Wave {{ wave + 1 }}.
      </p>
    </div>

    <div class="pt-3 border-t border-[#2D3A4D] space-y-2">
      <div class="text-xs font-semibold text-slate-200">Brick = Ammo Type</div>
      <div class="space-y-2">
        <div v-for="c in BRICK_COLOR_LIST" :key="c" class="flex items-start gap-2 text-xs">
          <BrickColorGlyph :color="c" size="sm" />
          <div class="min-w-0">
            <div class="font-semibold text-slate-100">{{ el(c) }}</div>
            <div class="text-[11px] text-slate-400 leading-snug">{{ AMMO_HINT[c] }}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="pt-3 border-t border-[#2D3A4D] space-y-1">
      <div class="text-xs font-semibold text-slate-200 mb-1">Brick Combos</div>
      <SynergyLinkRow v-for="syn in synergyCatalog" :key="syn.id" :synergy="syn" />
    </div>
  </aside>
</template>
