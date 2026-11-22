<script setup lang="ts">
import { computed } from 'vue';
import { Skull } from '@lucide/vue';
import type { GamePhase } from '~/game/domain/types';

const props = defineProps<{
  phase: GamePhase;
  bricksRemaining: number;
  relocating: boolean;
  bossPreview?: { name: string; hp: number; count: number } | null;
}>();

const status = computed(() => {
  let title = '';
  let detail = '';
  let accent = 'text-amber-300';

  if (props.relocating && props.phase !== 'COMBAT') {
    title = 'Move Tower';
    detail = 'Click any empty brick · Esc to cancel';
    accent = 'text-emerald-300';
  } else {
    switch (props.phase) {
      case 'BUILD_PLACE':
        title = `Place ${props.bricksRemaining} Brick${props.bricksRemaining === 1 ? '' : 's'}`;
        detail = 'Click open tiles or replant empty gray walls';
        accent = 'text-amber-300';
        break;
      case 'BUILD_PICK':
        title = 'Keep 1 Brick or Fuse';
        detail = 'Click a brick, then keep it or fuse into it · others turn gray';
        accent = 'text-sky-300';
        break;
      case 'BUILD_MANAGE':
        title = 'Build & Move Towers';
        detail = 'Ready for next wave';
        accent = 'text-emerald-300';
        break;
      case 'COMBAT':
        title = props.bossPreview ? `Boss Fight · ${props.bossPreview.name}` : 'Wave Active';
        detail = 'Click gray walls to delete (10g)';
        accent = 'text-rose-300';
        break;
      case 'VICTORY':
        title = 'Victory';
        detail = 'All 30 waves cleared';
        accent = 'text-emerald-300';
        break;
      case 'GAME_OVER':
        title = 'Game Over';
        detail = 'Out of lives';
        accent = 'text-rose-400';
        break;
    }
  }

  return { title, detail, accent };
});

const showBossAlert = computed(
  () =>
    Boolean(props.bossPreview) &&
    (props.phase === 'BUILD_PLACE' || props.phase === 'BUILD_PICK' || props.phase === 'BUILD_MANAGE')
);
</script>

<template>
  <div class="flex items-center gap-2 min-w-0">
    <span :class="['text-xs font-semibold whitespace-nowrap shrink-0', status.accent]">
      {{ status.title }}
    </span>
    <template v-if="showBossAlert && bossPreview">
      <span aria-hidden="true" class="text-slate-600 shrink-0">·</span>
      <span class="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-300 truncate">
        <Skull class="w-3.5 h-3.5 text-rose-400 shrink-0" />
        <span class="truncate">
          Boss Incoming: {{ bossPreview.count > 1 ? `${bossPreview.count}× ` : '' }}{{ bossPreview.name }}
          ({{ bossPreview.hp.toLocaleString() }} HP)
        </span>
      </span>
    </template>
    <template v-else>
      <span aria-hidden="true" class="hidden sm:inline text-slate-600 shrink-0">·</span>
      <span class="hidden sm:inline text-xs text-slate-400 truncate">{{ status.detail }}</span>
    </template>
  </div>
</template>
