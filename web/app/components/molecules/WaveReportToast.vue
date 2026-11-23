<script setup lang="ts">
import { Heart, ShieldCheck } from '@lucide/vue';
import type { WaveReport } from '~/composables/useArenaMatch';

// A short "how did that wave go" note over the board. Leaks used to cost lives silently.

defineProps<{ report: WaveReport }>();
</script>

<template>
  <div
    :key="report.id"
    role="status"
    class="toast-pop pointer-events-none absolute z-30 left-1/2 top-3 -translate-x-1/2 flex items-center gap-2.5 px-3.5 py-2 rounded-lg border shadow-xl text-xs font-semibold whitespace-nowrap bg-[#1C2430]/95"
    :class="report.livesLost > 0 ? 'border-rose-500/60' : 'border-emerald-500/60'"
  >
    <ShieldCheck v-if="report.livesLost === 0" class="w-4 h-4 text-emerald-400" />
    <Heart v-else class="w-4 h-4 text-rose-400 fill-current" />
    <span class="text-slate-100">Wave {{ report.wave }} cleared</span>
    <span v-if="report.bonusGold > 0" class="font-mono text-amber-300">+{{ report.bonusGold }}g</span>
    <span v-if="report.livesLost > 0" class="text-rose-300">
      {{ report.livesLost }} {{ report.livesLost === 1 ? 'life' : 'lives' }} lost
    </span>
    <span v-else class="text-emerald-300">No leaks</span>
  </div>
</template>

<style scoped>
.toast-pop {
  animation: toast-pop 3.5s ease forwards;
}
@keyframes toast-pop {
  0% { opacity: 0; transform: translate(-50%, -6px); }
  8% { opacity: 1; transform: translate(-50%, 0); }
  85% { opacity: 1; }
  100% { opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .toast-pop { animation: none; }
}
</style>
