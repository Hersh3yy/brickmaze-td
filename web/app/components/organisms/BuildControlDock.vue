<script setup lang="ts">
import { Info, RefreshCw, Undo2 } from '@lucide/vue';
import { TOWER_LIST } from '~/game/domain/constants';
import type { BrickColor, GamePhase, PlacedTurnEntry, TowerType } from '~/game/domain/types';

// The bar under the board. It keeps one fixed height in every phase, so the board
// above never resizes (and tiles never slide away from the cursor) between steps.
// Phones skip the tower shop: the on-board menu builds there.

const props = defineProps<{
  phase: GamePhase;
  draftQueue: BrickColor[];
  placedTurnCoords: PlacedTurnEntry[];
  rerollsRemaining: number;
  /** BUILD_PICK: index of the draft brick being looked at, or null. */
  pickIndex: number | null;
  gold: number;
  placingTowerType: TowerType | null;
  /** One line about the next (or running) wave, for the phone bar. */
  waveLine: string;
}>();

const emit = defineEmits<{
  rerollDraft: [];
  undoLastBrick: [];
  selectDraftBrick: [index: number];
  selectTowerType: [type: TowerType];
  openDetails: [];
}>();

const placedCount = computed(() => props.placedTurnCoords.length);
const isDraft = computed(() => props.phase === 'BUILD_PLACE' || props.phase === 'BUILD_PICK');

function slotState(idx: number): 'placed' | 'next' | 'queued' | 'pickable' {
  if (props.phase === 'BUILD_PICK') return 'pickable';
  return idx < placedCount.value ? 'placed' : idx === placedCount.value ? 'next' : 'queued';
}

const BAR =
  'h-16 sm:h-[72px] px-2 sm:px-5 bg-[#1D2531] border-t border-[#2F3D51] flex items-center gap-2 sm:gap-4 shrink-0';
</script>

<template>
  <!-- Draft: place 4, then pick one -->
  <footer v-if="isDraft" :class="BAR">
    <div class="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
      <DraftBrickSlot
        v-for="(color, idx) in draftQueue"
        :key="`${idx}-${color}`"
        :index="idx"
        :color="color"
        :state="slotState(idx)"
        :selected="phase === 'BUILD_PICK' && pickIndex === idx"
        @pick="emit('selectDraftBrick', idx)"
      />
    </div>

    <p v-if="phase === 'BUILD_PICK'" class="hidden md:block min-w-0 text-xs text-slate-400 leading-snug">
      Keep one brick. The other three turn into gray walls.
    </p>

    <div class="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto">
      <TactileButton
        variant="secondary"
        size="sm"
        :disabled="placedCount === 0"
        title="Undo the last brick (Z)"
        aria-label="Undo the last brick"
        @click="emit('undoLastBrick')"
      >
        <Undo2 class="w-3.5 h-3.5" />
        <span class="hidden sm:inline">Undo</span>
      </TactileButton>
      <TactileButton
        v-if="phase === 'BUILD_PLACE'"
        variant="amber"
        size="sm"
        :disabled="rerollsRemaining <= 0 || placedCount > 0"
        :title="placedCount > 0 ? 'Reroll only before placing' : 'New set of 4 bricks (R)'"
        :aria-label="`Reroll bricks, ${rerollsRemaining} left`"
        @click="emit('rerollDraft')"
      >
        <RefreshCw class="w-3.5 h-3.5" />
        <span><span class="hidden sm:inline">Reroll </span>{{ rerollsRemaining }}</span>
      </TactileButton>
    </div>
  </footer>

  <!-- Building and combat -->
  <footer v-else :class="BAR">
    <!-- Phones: what is coming, plus the way to the details sheet -->
    <button
      type="button"
      class="sm:hidden flex items-center gap-2 min-w-0 w-full text-left cursor-pointer"
      @click="emit('openDetails')"
    >
      <Info class="w-4 h-4 text-slate-400 shrink-0" />
      <span class="min-w-0">
        <span class="block text-xs font-semibold text-slate-100 truncate">{{ waveLine }}</span>
        <span class="block text-[11px] text-slate-400 truncate">
          {{ phase === 'COMBAT' ? 'Tap a gray wall to remove it (10g)' : 'Tap a brick to build · tap a tower to upgrade' }}
        </span>
      </span>
    </button>

    <div class="hidden sm:grid grid-cols-4 gap-2 sm:gap-2.5 w-full">
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
