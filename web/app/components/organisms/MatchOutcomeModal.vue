<script setup lang="ts">
import { Infinity as InfinityIcon, RotateCcw, Trophy } from '@lucide/vue';
import { DIFFICULTY_DEFS } from '~/game/domain/constants';
import type { MatchSummary } from '~/game/domain/types';

const props = defineProps<{
  summary: MatchSummary;
}>();

const emit = defineEmits<{
  continueEndless: [];
  playAgain: [];
  returnLobby: [];
}>();

const diffLabel = computed(() => DIFFICULTY_DEFS[props.summary.difficulty]?.label ?? 'Standard');
</script>

<template>
  <div
    role="dialog"
    aria-modal="true"
    aria-labelledby="outcome-modal-title"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
  >
    <div class="w-full max-w-md rounded-lg bg-[#1D2531] border border-[#3A4D66] shadow-2xl overflow-hidden">
      <div class="px-6 py-5 border-b border-[#2D3A4D]">
        <div class="flex items-center gap-2.5">
          <Trophy v-if="summary.won" class="w-5 h-5 text-amber-400 shrink-0" />
          <h2
            id="outcome-modal-title"
            :class="['text-xl font-bold', summary.won ? 'text-emerald-300' : 'text-rose-300']"
          >
            {{ summary.won ? 'Maze Mastered — Victory!' : 'Maze Breached — Game Over' }}
          </h2>
        </div>
        <p class="text-xs text-slate-400 mt-1">
          {{ diffLabel }} Difficulty ·
          {{
            summary.won
              ? 'All 30 waves conquered. Push your labyrinth further in Endless Mode or start a fresh layout.'
              : 'Your defenses fell, but every wave cleared earned permanent Architect XP.'
          }}
        </p>
      </div>

      <div class="p-6 space-y-5">
        <div class="grid grid-cols-2 gap-4 text-xs">
          <div>
            <div class="text-slate-400">Waves Cleared</div>
            <div class="font-mono text-lg font-bold text-slate-100 tabular-nums">{{ summary.wavesCleared }}</div>
          </div>
          <div>
            <div class="text-slate-400">Longest Maze Path</div>
            <div class="font-mono text-lg font-bold text-sky-300 tabular-nums">{{ summary.longestPath }} tiles</div>
          </div>
          <div>
            <div class="text-slate-400">Creeps Eliminated</div>
            <div class="font-mono text-lg font-bold text-slate-100 tabular-nums">{{ summary.creepsDefeated }}</div>
          </div>
          <div>
            <div class="text-slate-400">Synergy Circuits</div>
            <div class="font-mono text-lg font-bold text-amber-300 tabular-nums">{{ summary.synergiesCount }}</div>
          </div>
        </div>

        <div class="py-3 px-4 rounded-md bg-[#141A22] border border-[#2C394C] flex items-center justify-between">
          <span class="text-xs text-slate-300">Architect XP Earned</span>
          <span class="font-mono text-sm font-bold text-emerald-400 tabular-nums">
            +{{ summary.xpEarned }} XP{{ summary.leveledUp ? ` · Rank ${summary.newLevel}!` : '' }}
          </span>
        </div>

        <div class="flex flex-col gap-2">
          <TactileButton v-if="summary.won" variant="amber" full-width @click="emit('continueEndless')">
            <InfinityIcon class="w-4 h-4" />
            <span>Continue Endless Mode</span>
          </TactileButton>
          <TactileButton variant="primary" full-width @click="emit('playAgain')">
            <RotateCcw class="w-4 h-4" />
            <span>Play Again</span>
          </TactileButton>
          <TactileButton variant="ghost" full-width @click="emit('returnLobby')">
            Return to Lobby
          </TactileButton>
        </div>
      </div>
    </div>
  </div>
</template>
