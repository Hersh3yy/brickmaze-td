<script setup lang="ts">
import type { SynergyInfo } from '~/game/domain/types';

withDefaults(
  defineProps<{
    synergy: SynergyInfo;
    active?: boolean;
  }>(),
  {
    active: false,
  }
);
</script>

<template>
  <div class="flex items-start gap-2.5 py-1.5 border-b border-[#293446] last:border-b-0">
    <div class="flex items-center gap-1 pt-0.5 shrink-0">
      <BrickColorGlyph :color="synergy.colors[0]" size="sm" />
      <span class="text-[10px] text-slate-500 font-mono">+</span>
      <BrickColorGlyph :color="synergy.colors[1]" size="sm" />
    </div>
    <div class="min-w-0 flex-1">
      <div :class="['text-xs font-semibold', active ? 'text-amber-300' : 'text-slate-200']">
        {{ synergy.name }}
      </div>
      <div class="text-[11px] text-slate-400 leading-snug">{{ synergy.shortEffect }}</div>
    </div>
  </div>
</template>
