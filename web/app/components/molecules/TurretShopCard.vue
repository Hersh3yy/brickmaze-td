<script setup lang="ts">
import { computed } from 'vue';
import { TOWER_DEFS } from '~/game/domain/constants';
import type { TowerType } from '~/game/domain/types';

const props = defineProps<{
  type: TowerType;
  gold: number;
  selected: boolean;
  disabled: boolean;
}>();

const emit = defineEmits<{ select: [type: TowerType] }>();

const def = computed(() => TOWER_DEFS[props.type]);
const canAfford = computed(() => props.gold >= def.value.cost);
const isLocked = computed(() => props.disabled || !canAfford.value);
</script>

<template>
  <button
    type="button"
    :disabled="isLocked"
    :title="def.description"
    :class="[
      'flex items-center gap-3 px-3.5 py-2 rounded-md border text-left transition-all duration-150',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400',
      selected
        ? 'bg-[#2C3A4E] border-amber-400 shadow-[0_0_0_1px_rgba(251,191,36,0.35)]'
        : isLocked
          ? 'bg-[#19202B] border-[#283344] opacity-50 cursor-not-allowed'
          : 'bg-[#202937] border-[#324054] hover:bg-[#273244] hover:border-[#495D7A] cursor-pointer',
    ]"
    @click="emit('select', type)"
  >
    <svg
      width="28"
      height="28"
      viewBox="0 0 16 16"
      class="shrink-0"
      style="shape-rendering: crispEdges"
      aria-hidden="true"
    >
      <rect x="2" y="2" width="12" height="12" fill="#0F172A" />
      <rect x="3" y="3" width="10" height="10" fill="#334155" />
      <template v-if="type === 'repeater'">
        <rect x="4" y="4" width="6" height="8" fill="#64748B" />
        <rect x="5" y="5" width="4" height="6" fill="#CBD5E1" />
        <rect x="10" y="4" width="5" height="2" fill="#E2E8F0" />
        <rect x="10" y="10" width="5" height="2" fill="#E2E8F0" />
      </template>
      <template v-else-if="type === 'cannon'">
        <rect x="3" y="4" width="7" height="8" fill="#64748B" />
        <rect x="4" y="5" width="5" height="6" fill="#94A3B8" />
        <rect x="9" y="5" width="6" height="6" fill="#1E293B" />
        <rect x="10" y="6" width="4" height="2" fill="#E2E8F0" />
      </template>
      <template v-else-if="type === 'pulse'">
        <rect x="4" y="4" width="8" height="8" fill="#64748B" />
        <rect x="5" y="5" width="6" height="6" fill="#0F172A" />
        <rect x="6" y="6" width="4" height="4" fill="#FDE047" />
        <rect x="7" y="2" width="2" height="2" fill="#CBD5E1" />
        <rect x="7" y="12" width="2" height="2" fill="#CBD5E1" />
        <rect x="2" y="7" width="2" height="2" fill="#CBD5E1" />
        <rect x="12" y="7" width="2" height="2" fill="#CBD5E1" />
      </template>
      <template v-else-if="type === 'sniper'">
        <rect x="3" y="5" width="6" height="6" fill="#64748B" />
        <rect x="4" y="6" width="4" height="4" fill="#CBD5E1" />
        <rect x="9" y="6" width="7" height="4" fill="#94A3B8" />
        <rect x="10" y="7" width="6" height="2" fill="#F8FAFC" />
      </template>
    </svg>
    <div class="min-w-0 flex-1">
      <div class="flex items-center justify-between gap-2">
        <span class="text-sm font-semibold text-slate-100 truncate">{{ def.name }}</span>
        <span
          :class="[
            'font-mono text-xs font-bold tabular-nums shrink-0',
            canAfford ? 'text-amber-300' : 'text-rose-400',
          ]"
        >
          {{ def.cost }}g
        </span>
      </div>
      <div class="flex items-center justify-between gap-2 mt-0.5">
        <span class="text-[11px] text-slate-400 truncate">{{ def.shortRole }}</span>
        <span class="font-mono text-[10px] text-slate-500">[{{ def.hotkey }}]</span>
      </div>
    </div>
  </button>
</template>
