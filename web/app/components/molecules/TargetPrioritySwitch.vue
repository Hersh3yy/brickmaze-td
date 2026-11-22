<script setup lang="ts">
import type { TargetingMode } from '~/game/domain/types';

defineProps<{
  value: TargetingMode;
}>();

const emit = defineEmits<{ change: [mode: TargetingMode] }>();

const MODES: { id: TargetingMode; label: string }[] = [
  { id: 'first', label: 'First' },
  { id: 'strongest', label: 'Strongest' },
  { id: 'closest', label: 'Closest' },
];
</script>

<template>
  <div
    role="group"
    aria-label="Tower targeting priority"
    class="grid grid-cols-3 gap-1 p-1 bg-[#141921] border border-[#2C384B] rounded-md"
  >
    <button
      v-for="m in MODES"
      :key="m.id"
      type="button"
      :class="[
        'px-2 py-1.5 text-xs font-medium rounded-[4px] transition-colors whitespace-nowrap cursor-pointer',
        value === m.id ? 'bg-[#2E3C52] text-amber-300 font-semibold' : 'text-slate-400 hover:text-slate-200',
      ]"
      @click="emit('change', m.id)"
    >
      {{ m.label }}
    </button>
  </div>
</template>
