<script setup lang="ts">
import { computed } from 'vue';
import { BRICK_COLORS } from '~/game/domain/constants';
import type { BrickColor } from '~/game/domain/types';

const props = defineProps<{
  index: number;
  color: BrickColor;
  state: 'next' | 'queued' | 'placed' | 'pickable';
  /** In the pick phase: this is the brick currently being looked at. */
  selected?: boolean;
}>();

const emit = defineEmits<{ pick: [] }>();

const meta = computed(() => BRICK_COLORS[props.color]);
const world = useWorld();
const isInteractive = computed(() => props.state === 'pickable');

// Phones show the glyph and a number badge; the name and role appear from sm up.
const baseClass = computed(() =>
  [
    'relative flex items-center gap-2.5 p-1.5 sm:px-3 sm:py-2 rounded-md border text-left transition-all duration-150 sm:min-w-[140px]',
    props.state === 'next'
      ? 'bg-[#283344] border-amber-400/80 shadow-[0_0_0_1px_rgba(251,191,36,0.3)]'
      : props.state === 'pickable' && props.selected
        ? 'bg-[#314056] border-amber-400 shadow-[0_0_0_1px_rgba(251,191,36,0.45)] cursor-pointer'
        : props.state === 'pickable'
          ? 'bg-[#283344] border-sky-400/60 hover:bg-[#314056] hover:border-sky-300 cursor-pointer'
        : props.state === 'placed'
          ? 'bg-[#1A212C] border-[#2C3748] opacity-50'
          : 'bg-[#1D2531] border-[#2D394B]',
  ].join(' ')
);

const stateLabel = computed(() =>
  props.state === 'next'
    ? 'Next'
    : props.state === 'pickable'
      ? props.selected
        ? 'Picked'
        : `${props.index + 1}`
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
    :aria-label="`${world.text.elements[color].elementName} brick ${index + 1}: ${stateLabel}`"
    :class="baseClass"
    @click="isInteractive && emit('pick')"
  >
    <BrickColorGlyph :color="color" size="md" />
    <span
      class="sm:hidden absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 rounded-full bg-[#141A22] border border-[#3A4D66] font-mono text-[9px] leading-[14px] text-center text-slate-300"
      aria-hidden="true"
    >{{ state === 'placed' ? '✓' : index + 1 }}</span>
    <div class="hidden sm:block min-w-0 flex-1">
      <div class="flex items-center justify-between gap-2">
        <span class="text-xs font-semibold text-slate-100 whitespace-nowrap">
          {{ world.text.elements[color].elementName }}
        </span>
        <span class="font-mono text-[10px] text-slate-400 whitespace-nowrap">{{ stateLabel }}</span>
      </div>
      <div class="text-[11px] text-slate-400 truncate">{{ roleHint }}</div>
    </div>
  </component>
</template>
