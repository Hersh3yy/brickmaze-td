<script setup lang="ts">
withDefaults(
  defineProps<{
    label: string;
    value: string | number;
    subtext?: string;
    accentClass?: string;
  }>(),
  {
    accentClass: 'text-slate-100',
  }
);
</script>

<template>
  <div class="flex flex-col leading-tight shrink-0">
    <span class="text-[11px] font-medium text-slate-400 whitespace-nowrap">{{ label }}</span>
    <div class="flex items-baseline gap-1.5">
      <span :class="['font-mono text-sm font-bold tabular-nums whitespace-nowrap', accentClass]">
        {{ value }}
      </span>
      <span v-if="subtext" class="font-mono text-[11px] tabular-nums text-slate-400 whitespace-nowrap">
        {{ subtext }}
      </span>
    </div>
  </div>
</template>
