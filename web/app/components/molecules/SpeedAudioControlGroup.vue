<script setup lang="ts">
import { Volume2, VolumeX } from '@lucide/vue';

const emit = defineEmits<{
  changeSpeed: [s: 1 | 2 | 3];
  toggleMute: [];
}>();

const props = defineProps<{
  speed: 1 | 2 | 3;
  muted: boolean;
}>();

const speeds: (1 | 2 | 3)[] = [1, 2, 3];
/** Phones get one button that cycles 1x > 2x > 3x, to keep the HUD on one row. */
function cycleSpeed() {
  emit('changeSpeed', props.speed === 3 ? 1 : ((props.speed + 1) as 2 | 3));
}
</script>

<template>
  <div class="flex items-center gap-1.5 sm:gap-2 shrink-0">
    <button
      type="button"
      :aria-label="`Speed ${speed}x, tap to change`"
      class="sm:hidden min-w-10 px-2 py-1.5 rounded-md bg-amber-500 text-slate-950 font-mono text-xs font-bold cursor-pointer"
      @click="cycleSpeed"
    >
      {{ speed }}x
    </button>
    <div
      role="group"
      aria-label="Simulation speed"
      class="hidden sm:inline-flex items-center bg-[#151B23] border border-[#2F3D51] rounded-md p-0.5"
    >
      <button
        v-for="s in speeds"
        :key="s"
        type="button"
        :class="[
          'px-2 py-1 text-xs font-mono font-semibold rounded-[4px] transition-colors whitespace-nowrap shrink-0 cursor-pointer',
          speed === s ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-100',
        ]"
        @click="emit('changeSpeed', s)"
      >
        {{ s }}x
      </button>
    </div>

    <button
      type="button"
      :aria-label="muted ? 'Unmute sound effects' : 'Mute sound effects'"
      :title="muted ? 'Unmute audio' : 'Mute audio'"
      class="p-2 rounded-md bg-[#1D2531] border border-[#2F3D51] text-slate-300 hover:text-white hover:bg-[#273244] transition-colors cursor-pointer shrink-0"
      @click="emit('toggleMute')"
    >
      <VolumeX v-if="muted" class="w-4 h-4 text-slate-500" />
      <Volume2 v-else class="w-4 h-4" />
    </button>
  </div>
</template>
