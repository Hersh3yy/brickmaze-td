<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    value: number;
    max: number;
    fillClass?: string;
    heightClass?: string;
    ariaLabel: string;
  }>(),
  {
    fillClass: 'bg-amber-400',
    heightClass: 'h-2',
  }
);

const pct = computed(() =>
  props.max <= 0 ? 0 : Math.max(0, Math.min(100, (props.value / props.max) * 100))
);
</script>

<template>
  <div
    role="progressbar"
    :aria-label="ariaLabel"
    :aria-valuenow="Math.round(value)"
    :aria-valuemin="0"
    :aria-valuemax="Math.round(max)"
    :class="['w-full overflow-hidden rounded-sm bg-[#12171E] border border-[#2D3A4D]', heightClass]"
  >
    <div :class="['h-full transition-all duration-200', fillClass]" :style="{ width: `${pct}%` }" />
  </div>
</template>
