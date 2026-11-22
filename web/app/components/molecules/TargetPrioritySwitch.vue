<script setup lang="ts">
import type { TargetingMode } from '~/game/domain/types';

const props = defineProps<{
  value: TargetingMode;
  /** Offer 'Fresh' (only meaningful for towers that slow, poison or burn). */
  showFresh?: boolean;
}>();

const emit = defineEmits<{ change: [mode: TargetingMode] }>();

const ALL_MODES: { id: TargetingMode; label: string; title: string }[] = [
  { id: 'fresh', label: 'Fresh', title: 'Front-most creep that is not already slowed, poisoned or burning' },
  { id: 'first', label: 'First', title: 'Creep furthest along the path' },
  { id: 'strongest', label: 'Strongest', title: 'Creep with the most HP left' },
  { id: 'closest', label: 'Closest', title: 'Creep nearest to the tower' },
];

const modes = computed(() => ALL_MODES.filter((m) => m.id !== 'fresh' || props.showFresh));
</script>

<template>
  <div
    role="group"
    aria-label="Tower targeting priority"
    :class="[
      'grid gap-1 p-1 bg-[#141921] border border-[#2C384B] rounded-md',
      modes.length === 4 ? 'grid-cols-2' : 'grid-cols-3',
    ]"
  >
    <button
      v-for="m in modes"
      :key="m.id"
      type="button"
      :title="m.title"
      :class="[
        'px-1.5 py-1.5 text-xs font-medium rounded-[4px] transition-colors whitespace-nowrap cursor-pointer',
        value === m.id ? 'bg-[#2E3C52] text-amber-300 font-semibold' : 'text-slate-400 hover:text-slate-200',
      ]"
      @click="emit('change', m.id)"
    >
      {{ m.label }}
    </button>
  </div>
</template>
