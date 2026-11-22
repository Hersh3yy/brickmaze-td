<script setup lang="ts">
import { Volume2, VolumeX } from '@lucide/vue';

defineProps<{
  speed: 1 | 2 | 3;
  muted: boolean;
}>();

const emit = defineEmits<{
  changeSpeed: [s: 1 | 2 | 3];
  toggleMute: [];
}>();

const speeds: (1 | 2 | 3)[] = [1, 2, 3];
</script>

<template>
  <div class="flex items-center gap-2 shrink-0">
    <div
      role="group"
      aria-label="Simulation speed"
      class="inline-flex items-center bg-[#151B23] border border-[#2F3D51] rounded-md p-0.5"
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
