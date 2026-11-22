<script setup lang="ts">
import { ArrowUpCircle, Eraser, Lock, Move, Skull, Trash2, X } from '@lucide/vue';
import {
  BRICK_COLORS,
  BRICK_COLOR_LIST,
  CLEAR_GRAY_BRICK_COST,
  DIFFICULTY_DEFS,
  SYNERGY_CATALOG,
  TOWER_DEFS,
  WAVE_MODIFIER_INFO,
  getWaveDefinition,
} from '~/game/domain/constants';
import { tileAppliesDebuff } from '~/game/domain/simulation';
import { computeTileModifiers } from '~/game/domain/synergy';
import type {
  BrickColor,
  Coord,
  DifficultyId,
  GamePhase,
  GridCell,
  TargetingMode,
  Tower,
} from '~/game/domain/types';

const props = defineProps<{
  grid: GridCell[][];
  wave: number;
  difficulty: DifficultyId;
  gold: number;
  phase: GamePhase;
  selectedCell: GridCell | null;
  selectedTower: Tower | null;
  relocatingTowerId: string | null;
}>();

const emit = defineEmits<{
  upgradeTower: [towerId: string];
  startRelocate: [towerId: string];
  cancelRelocate: [];
  sellTower: [towerId: string];
  changeTargeting: [towerId: string, mode: TargetingMode];
  clearGrayBrick: [coord: Coord];
  closeMobile: [];
}>();

const ASIDE_CLASS =
  'flex flex-col h-full bg-[#1C2430] lg:border-l border-[#2F3D51] overflow-y-auto p-4';
const CLOSE_BTN_CLASS =
  'lg:hidden p-1.5 -mr-1.5 rounded-md text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer shrink-0';

const AMMO_HINT: Record<BrickColor, string> = {
  yellow: 'Speed + Lightning Chain',
  red: 'Bonus Damage + Fire Splash',
  green: 'Slow + Corrosive DoT',
};

const isCombat = computed(() => props.phase === 'COMBAT');
const currentWaveDef = computed(() => getWaveDefinition(props.wave, props.difficulty));
const diffLabel = computed(() => DIFFICULTY_DEFS[props.difficulty].label);
const synergyCatalog = Object.values(SYNERGY_CATALOG);

// --- Tower selected ---
const towerView = computed(() => {
  const tower = props.selectedTower;
  if (!tower) return null;

  const def = TOWER_DEFS[tower.type];
  const mods = computeTileModifiers(props.grid, tower.x, tower.y);
  const dmgScale = tower.level === 1 ? 1 : tower.level === 2 ? 1.6 : 2.4;
  const rateScale = tower.level === 1 ? 1 : tower.level === 2 ? 1.15 : 1.32;
  const rangeScale = 1 + (tower.level - 1) * 0.1;

  return {
    tower,
    def,
    mods,
    finalDmg: Math.round(def.baseDamage * dmgScale * mods.damageMult),
    finalRate: (def.baseFireRate * rateScale * mods.fireRateMult).toFixed(1),
    finalRange: (def.baseRange * rangeScale * mods.rangeMult).toFixed(1),
    upgradeCost: tower.level < 3 ? def.upgradeCosts[tower.level - 1] ?? null : null,
    sellValue: Math.round(tower.investedGold * 0.75),
    isRelocatingThis: props.relocatingTowerId === tower.id,
    showFresh: tileAppliesDebuff(props.grid, tower.x, tower.y),
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

  let title = 'Gray Maze Wall';
  if (cell.kind === 'MASTER_BRICK') title = `Master: ${mods.ammoLabel}`;
  else if (cell.kind === 'ACTIVE_BRICK' && cell.color) {
    title = `${BRICK_COLORS[cell.color].elementName} Brick`;
  }

  let effectText = '';
  if (cell.color) {
    if (!mods.isDoubleElement) {
      effectText = BRICK_COLORS[cell.color].bonusDetail;
    } else if (cell.color === 'green') {
      effectText = `Double Venom (×2): ${Math.round(mods.slowFactor * 100)}% slow for ${mods.slowDuration.toFixed(1)}s + ${Math.round(mods.poisonDpsRatio * 100)}% corrosive DoT/s (ignores armor).`;
    } else if (cell.color === 'red') {
      effectText = `Double Fire (×2): +${Math.round((mods.damageMult - 1) * 100)}% damage, +${mods.extraSplashRadius}px splash & ${Math.round(mods.burnDpsRatio * 100)}% burn/s.`;
    } else {
      effectText = `Double Lightning (×2): +${Math.round((mods.fireRateMult - 1) * 100)}% attack speed & ${mods.chainCount} lightning chains.`;
    }
  }

  return {
    cell,
    isGray,
    mods,
    title,
    effectText,
    canDeleteGray:
      isGray &&
      props.gold >= CLEAR_GRAY_BRICK_COST &&
      props.phase !== 'VICTORY' &&
      props.phase !== 'GAME_OVER',
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
        <h3 class="text-base font-bold text-slate-100">{{ towerView.def.name }}</h3>
        <div class="flex items-center gap-2">
          <span class="font-mono text-xs text-amber-300">Tier {{ towerView.tower.level }}/3</span>
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
        Gray Brick (Kinetic). Move onto a Yellow, Red, or Green brick between waves to infuse elemental ammo.
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

    <div v-if="towerView.tower.type !== 'pulse'" class="space-y-1.5 pt-2 border-t border-[#2D3A4D]">
      <div class="text-xs text-slate-400">Target</div>
      <TargetPrioritySwitch
        :value="towerView.tower.targeting"
        :show-fresh="towerView.showFresh"
        @change="emit('changeTargeting', towerView.tower.id, $event)"
      />
    </div>

    <div class="space-y-2 pt-2 border-t border-[#2D3A4D]">
      <TactileButton
        v-if="towerView.upgradeCost !== null"
        variant="amber"
        full-width
        :disabled="gold < towerView.upgradeCost"
        @click="emit('upgradeTower', towerView.tower.id)"
      >
        <ArrowUpCircle class="w-4 h-4" />
        <span>Upgrade · {{ towerView.upgradeCost }}g</span>
      </TactileButton>
      <div v-else class="text-xs text-center font-mono text-amber-300 py-1">Max Tier</div>

      <TactileButton v-if="towerView.isRelocatingThis" variant="secondary" full-width @click="emit('cancelRelocate')">
        Cancel Move
      </TactileButton>
      <TactileButton
        v-else
        variant="secondary"
        full-width
        :disabled="isCombat"
        @click="emit('startRelocate', towerView.tower.id)"
      >
        <Lock v-if="isCombat" class="w-3.5 h-3.5" />
        <Move v-else class="w-3.5 h-3.5" />
        <span>{{ isCombat ? 'Move Locked' : 'Move Tower (Free)' }}</span>
      </TactileButton>

      <TactileButton
        variant="ghost"
        size="sm"
        full-width
        class="text-rose-300 hover:text-rose-200 hover:bg-rose-500/10"
        @click="emit('sellTower', towerView.tower.id)"
      >
        <Trash2 class="w-3.5 h-3.5" />
        <span>Sell (+{{ towerView.sellValue }}g)</span>
      </TactileButton>
    </div>

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
            ? 'Neutral Kinetic mount. Replant a colored brick free next turn, or delete anytime (even mid-wave) to open space.'
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

    <div v-if="cellView.isGray" class="pt-2 border-t border-[#2D3A4D] space-y-2">
      <TactileButton
        variant="danger"
        full-width
        :disabled="!cellView.canDeleteGray"
        @click="emit('clearGrayBrick', { x: cellView.cell.x, y: cellView.cell.y })"
      >
        <Eraser class="w-3.5 h-3.5" />
        <span>Delete Gray Wall ({{ CLEAR_GRAY_BRICK_COST }}g)</span>
      </TactileButton>
      <p v-if="isCombat" class="text-[11px] text-slate-400">
        Mid-wave delete opens the tile immediately for upcoming creeps.
      </p>
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
          <span>{{ isBossWave ? `BOSS WAVE · ${diffLabel}` : `Next Wave · ${diffLabel}` }}</span>
        </div>
        <button type="button" aria-label="Close panel" :class="CLOSE_BTN_CLASS" @click="emit('closeMobile')">
          <X class="w-4 h-4" />
        </button>
      </div>
      <div class="text-sm font-bold text-slate-100">
        Wave {{ currentWaveDef.wave }} · {{ currentWaveDef.name }}
      </div>
      <div class="font-mono text-xs text-slate-300 tabular-nums">
        {{ currentWaveDef.count }}x{{ currentWaveDef.modifier === 'escort' ? ' + 2 heroes' : '' }} ·
        {{ currentWaveDef.hp.toLocaleString() }} HP · {{ Math.round(currentWaveDef.armor * 100) }}% Armor
      </div>
      <p v-if="currentWaveDef.modifier" class="text-[11px] text-sky-200 leading-snug pt-0.5">
        <span class="font-semibold text-sky-300">{{ WAVE_MODIFIER_INFO[currentWaveDef.modifier].label }}:</span>
        {{ WAVE_MODIFIER_INFO[currentWaveDef.modifier].detail }}
      </p>
      <p v-if="currentWaveDef.armor > 0" class="text-[11px] text-slate-400 leading-snug">
        Armor only blocks direct hits. Lightning chains, splash, poison and burn go straight through.
      </p>
      <p v-if="isBossWave" class="text-[11px] text-rose-200/90 leading-snug pt-0.5">
        Bosses cost 3 lives if leaked. Fortify with Rail Snipers, Fire bursts, or Venom slow!
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
            <div class="font-semibold text-slate-100">{{ BRICK_COLORS[c].elementName }}</div>
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
