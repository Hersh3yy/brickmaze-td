<script setup lang="ts">
import { computed } from 'vue';
import { BRICK_COLORS } from '~/game/domain/constants';
import type { BrickColor } from '~/game/domain/types';

const props = defineProps<{
  index: number;
  color: BrickColor;
  state: 'next' | 'queued' | 'placed' | 'pickable';
}>();

const emit = defineEmits<{ pick: [] }>();

const meta = computed(() => BRICK_COLORS[props.color]);
const isInteractive = computed(() => props.state === 'pickable');

const baseClass = computed(() =>
  [
    'flex items-center gap-2.5 px-3 py-2 rounded-md border text-left transition-all duration-150 min-w-[152px]',
    props.state === 'next'
      ? 'bg-[#283344] border-amber-400/80 shadow-[0_0_0_1px_rgba(251,191,36,0.3)]'
      : props.state === 'pickable'
        ? 'bg-[#283344] border-sky-400 hover:bg-[#314056] hover:border-amber-300 cursor-pointer'
        : props.state === 'placed'
          ? 'bg-[#1A212C] border-[#2C3748] opacity-65'
          : 'bg-[#1D2531] border-[#2D394B]',
  ].join(' ')
);

const stateLabel = computed(() =>
  props.state === 'next'
    ? 'Next'
    : props.state === 'pickable'
      ? 'Keep'
      : props.state === 'placed'
        ? 'Placed'
        : `#${props.index + 1}`
);

const roleHint = computed(() =>
  props.color === 'yellow' ? 'Speed & Chain' : props.color === 'red' ? 'DMG & Splash' : 'Slow & DoT'
);
</script>

<template>
  <component
    :is="isInteractive ? 'button' : 'div'"
    :type="isInteractive ? 'button' : undefined"
    :class="baseClass"
    @click="isInteractive && emit('pick')"
  >
    <BrickColorGlyph :color="color" size="md" />
    <div class="min-w-0 flex-1">
      <div class="flex items-center justify-between gap-2">
        <span class="text-xs font-semibold text-slate-100 whitespace-nowrap">
          {{ meta.elementName }}
        </span>
        <span class="font-mono text-[10px] text-slate-400 whitespace-nowrap">{{ stateLabel }}</span>
      </div>
      <div class="text-[11px] text-slate-400 truncate">{{ roleHint }}</div>
    </div>
  </component>
</template>
