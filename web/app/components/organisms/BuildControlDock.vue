<script setup lang="ts">
import { RefreshCw, Sparkles, Undo2 } from '@lucide/vue';
import { TOWER_LIST } from '~/game/domain/constants';
import type {
  BrickColor,
  GamePhase,
  PlacedTurnEntry,
  TowerType,
  TurnFusionOption,
} from '~/game/domain/types';

const props = defineProps<{
  phase: GamePhase;
  draftQueue: BrickColor[];
  placedTurnCoords: PlacedTurnEntry[];
  rerollsRemaining: number;
  /** BUILD_PICK: index of the draft brick being looked at, or null. */
  pickIndex: number | null;
  /** BUILD_PICK: fusions that keep the selected brick as the Master brick. */
  fusionOptions: TurnFusionOption[];
  gold: number;
  placingTowerType: TowerType | null;
  creepsRemaining: number;
  waveTotalCreeps: number;
}>();

const emit = defineEmits<{
  rerollDraft: [];
  undoLastBrick: [];
  selectDraftBrick: [index: number];
  keepSelectedBrick: [];
  fuseTurnPair: [option: TurnFusionOption];
  selectTowerType: [type: TowerType];
}>();

const placedCount = computed(() => props.placedTurnCoords.length);

function slotState(idx: number): 'placed' | 'next' | 'queued' {
  return idx < placedCount.value ? 'placed' : idx === placedCount.value ? 'next' : 'queued';
}
</script>

<template>
  <footer
    v-if="phase === 'BUILD_PLACE'"
    class="px-3 sm:px-5 py-2 sm:py-2.5 bg-[#1D2531] border-t border-[#2F3D51] flex flex-wrap items-center justify-between gap-2.5 sm:gap-4 shrink-0"
  >
    <div class="flex items-center gap-2 sm:gap-2.5 overflow-x-auto max-w-full pb-0.5">
      <DraftBrickSlot
        v-for="(color, idx) in draftQueue"
        :key="`${idx}-${color}`"
        :index="idx"
        :color="color"
        :state="slotState(idx)"
      />
    </div>

    <div class="flex items-center gap-2 shrink-0 ml-auto">
      <TactileButton
        variant="secondary"
        size="sm"
        :disabled="placedCount === 0"
        @click="emit('undoLastBrick')"
      >
        <Undo2 class="w-3.5 h-3.5" />
        <span>Undo</span>
      </TactileButton>
      <TactileButton
        variant="amber"
        size="sm"
        :disabled="rerollsRemaining <= 0 || placedCount > 0"
        @click="emit('rerollDraft')"
      >
        <RefreshCw class="w-3.5 h-3.5" />
        <span>Reroll ({{ rerollsRemaining }})</span>
      </TactileButton>
    </div>
  </footer>

  <footer
    v-else-if="phase === 'BUILD_PICK'"
    class="px-3 sm:px-5 py-2 sm:py-2.5 bg-[#1D2531] border-t border-[#2F3D51] flex flex-wrap items-center justify-between gap-2.5 sm:gap-4 shrink-0"
  >
    <div class="flex items-center gap-2 sm:gap-2.5 overflow-x-auto max-w-full pb-0.5">
      <DraftBrickSlot
        v-for="(color, idx) in draftQueue"
        :key="`${idx}-${color}`"
        :index="idx"
        :color="color"
        state="pickable"
        :selected="pickIndex === idx"
        @pick="emit('selectDraftBrick', idx)"
      />
    </div>

    <div class="flex items-center gap-2 flex-wrap ml-auto">
      <TactileButton variant="ghost" size="sm" @click="emit('undoLastBrick')">
        <Undo2 class="w-3.5 h-3.5" />
        <span>Undo</span>
      </TactileButton>

      <span v-if="pickIndex === null" class="text-xs text-slate-400">
        Click one of your 4 bricks (board or list) to choose where it stays
      </span>
      <template v-else>
        <TactileButton
          variant="secondary"
          size="sm"
          title="Keep this brick as a single colour (Enter)"
          @click="emit('keepSelectedBrick')"
        >
          <BrickColorGlyph :color="draftQueue[pickIndex]!" size="sm" />
          <span>Keep here</span>
        </TactileButton>
        <TactileButton
          v-for="opt in fusionOptions"
          :key="opt.id"
          variant="amber"
          size="sm"
          :title="opt.description"
          @click="emit('fuseTurnPair', opt)"
        >
          <Sparkles class="w-3.5 h-3.5" />
          <BrickColorGlyph :color="opt.colors[0]" :secondary-color="opt.colors[1]" size="sm" />
          <span>Fuse here: {{ opt.name }}</span>
        </TactileButton>
      </template>
    </div>
  </footer>

  <footer
    v-else
    class="px-3 sm:px-5 py-2 sm:py-2.5 bg-[#1D2531] border-t border-[#2F3D51] space-y-2 shrink-0"
  >
    <div v-if="phase === 'COMBAT'" class="flex items-center gap-3 sm:gap-4">
      <span class="text-xs font-mono text-slate-300 tabular-nums whitespace-nowrap shrink-0">
        Creeps: {{ creepsRemaining }}/{{ waveTotalCreeps }}
      </span>
      <ProgressTrackBar
        :value="waveTotalCreeps - creepsRemaining"
        :max="Math.max(1, waveTotalCreeps)"
        fill-class="bg-emerald-500"
        height-class="h-1.5"
        ariaLabel="Wave defeat progress"
      />
    </div>

    <div class="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5">
      <TurretShopCard
        v-for="tType in TOWER_LIST"
        :key="tType"
        :type="tType"
        :gold="gold"
        :selected="placingTowerType === tType"
        :disabled="phase === 'VICTORY' || phase === 'GAME_OVER'"
        @select="emit('selectTowerType', $event)"
      />
    </div>
  </footer>
</template>
