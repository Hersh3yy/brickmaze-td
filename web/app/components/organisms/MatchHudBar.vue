<script setup lang="ts">
import { ArrowLeft, Coins, Heart, Keyboard, Play, Skull } from '@lucide/vue';
import { DIFFICULTY_DEFS, MAX_WAVES, getWaveModifier, isHordeWave } from '~/game/domain/constants';
import type { DifficultyId, GamePhase } from '~/game/domain/types';

const props = defineProps<{
  wave: number;
  difficulty: DifficultyId;
  endlessMode: boolean;
  lives: number;
  gold: number;
  pathLength: number;
  phase: GamePhase;
  speed: 1 | 2 | 3;
  muted: boolean;
}>();

const emit = defineEmits<{
  changeSpeed: [s: 1 | 2 | 3];
  toggleMute: [];
  sendWave: [];
  exitToLobby: [];
  openShortcuts: [];
}>();

// Leaving ends the run, so the back arrow asks once: the first tap arms it for 3 s.
const exitArmed = ref(false);
let exitTimer: ReturnType<typeof setTimeout> | undefined;
function onBack() {
  const runOver = props.phase === 'VICTORY' || props.phase === 'GAME_OVER';
  if (exitArmed.value || runOver) {
    clearTimeout(exitTimer);
    emit('exitToLobby');
    return;
  }
  exitArmed.value = true;
  exitTimer = setTimeout(() => {
    exitArmed.value = false;
  }, 3000);
}
onBeforeUnmount(() => clearTimeout(exitTimer));

const canSendWave = computed(() => props.phase === 'BUILD_MANAGE');
const isBossWave = computed(() => props.wave % 5 === 0);
const world = useWorld();
const waveModifier = computed(() => getWaveModifier(props.wave));
const modifierLabel = computed(() => {
  const labels = [
    isHordeWave(props.wave) ? world.value.text.horde.label : undefined,
    waveModifier.value ? world.value.text.modifiers[waveModifier.value].label : undefined,
  ].filter(Boolean);
  return labels.length ? labels.join(' · ') : undefined;
});
const waveSubtext = computed(() =>
  isBossWave.value
    ? 'BOSS'
    : modifierLabel.value
      ? modifierLabel.value
      : props.endlessMode
      ? 'Endless'
      : props.difficulty !== 'standard'
        ? DIFFICULTY_DEFS[props.difficulty].label
        : undefined
);
const sendTitle = computed(() =>
  canSendWave.value
    ? isBossWave.value
      ? 'Launch Boss Wave (Space)'
      : 'Send next wave (Space)'
    : props.phase === 'COMBAT'
      ? 'Wave in progress'
      : 'Finish this turn\'s bricks first'
);
const sendLabel = computed(() =>
  props.phase === 'COMBAT'
    ? isBossWave.value
      ? `Boss W${props.wave}`
      : `Wave ${props.wave}`
    : isBossWave.value
      ? `Send Boss W${props.wave}`
      : `Send Wave ${props.wave}`
);
const sendLabelShort = computed(() =>
  props.phase === 'COMBAT' ? `W${props.wave}` : isBossWave.value ? 'Boss' : 'Send'
);
</script>

<template>
  <!-- One row on every width: phones get icon labels, wider screens word labels. -->
  <header
    class="flex items-center justify-between gap-2 sm:gap-3 px-2 sm:px-5 py-1.5 sm:py-2 bg-[#1D2531] border-b border-[#2F3D51] shrink-0"
  >
    <div class="flex items-center gap-2 shrink-0">
      <button
        type="button"
        :title="exitArmed ? 'Tap again to leave (this run ends)' : 'Return to Lobby'"
        :aria-label="exitArmed ? 'Confirm: leave match' : 'Return to Lobby'"
        :class="[
          'inline-flex items-center gap-1.5 p-2 sm:p-1.5 rounded-md transition-colors cursor-pointer',
          exitArmed ? 'bg-rose-600 text-white px-2.5' : 'text-slate-400 hover:text-white hover:bg-white/5',
        ]"
        @click="onBack"
      >
        <ArrowLeft class="w-4 h-4" />
        <span v-if="exitArmed" class="text-xs font-semibold whitespace-nowrap">Leave?</span>
      </button>
      <span
        v-if="!exitArmed"
        class="hidden lg:inline font-display text-base font-bold tracking-tight text-slate-100 whitespace-nowrap shrink-0"
      >
        BrickMaze TD
      </span>
    </div>

    <!-- Phone stats: icons, no labels -->
    <div class="flex sm:hidden items-center gap-2.5 min-w-0 font-mono text-sm font-bold tabular-nums">
      <span :class="isBossWave ? 'text-rose-400' : 'text-slate-100'" :title="waveSubtext">
        W{{ endlessMode ? wave : `${wave}/${MAX_WAVES}` }}
      </span>
      <span :class="['inline-flex items-center gap-0.5', lives <= 5 ? 'text-rose-400' : 'text-emerald-400']">
        <Heart class="w-3.5 h-3.5 fill-current" aria-label="Lives" />{{ lives }}
      </span>
      <span class="inline-flex items-center gap-0.5 text-amber-300">
        <Coins class="w-3.5 h-3.5" aria-label="Gold" />{{ gold }}
      </span>
    </div>

    <!-- Wider screens: labelled stats -->
    <div class="hidden sm:flex items-center justify-center gap-3 md:gap-5">
      <TabularMetricValue
        label="Wave"
        :value="endlessMode ? `${wave}` : `${wave}/${MAX_WAVES}`"
        :subtext="waveSubtext"
        :accent-class="isBossWave ? 'text-rose-400' : 'text-slate-100'"
      />
      <span aria-hidden="true" class="h-4 w-px bg-[#2F3D51] shrink-0" />
      <TabularMetricValue
        label="Lives"
        :value="lives"
        :accent-class="lives <= 5 ? 'text-rose-400' : 'text-emerald-400'"
      />
      <span aria-hidden="true" class="h-4 w-px bg-[#2F3D51] shrink-0" />
      <TabularMetricValue label="Gold" :value="`${gold}g`" accent-class="text-amber-300" />
      <span aria-hidden="true" class="h-4 w-px bg-[#2F3D51] shrink-0" />
      <TabularMetricValue label="Path" :value="`${pathLength}`" subtext="t" accent-class="text-sky-300" />
    </div>

    <div class="flex items-center gap-1.5 sm:gap-3 shrink-0">
      <SpeedAudioControlGroup
        :speed="speed"
        :muted="muted"
        @change-speed="emit('changeSpeed', $event)"
        @toggle-mute="emit('toggleMute')"
      />
      <button
        type="button"
        title="Keyboard shortcuts (?)"
        aria-label="Keyboard shortcuts"
        class="hidden pointer-fine:inline-flex p-2 rounded-md bg-[#1D2531] border border-[#2F3D51] text-slate-300 hover:text-white hover:bg-[#273244] transition-colors cursor-pointer"
        @click="emit('openShortcuts')"
      >
        <Keyboard class="w-4 h-4" />
      </button>
      <TactileButton
        :variant="isBossWave ? 'danger' : 'primary'"
        size="sm"
        :disabled="!canSendWave"
        :title="sendTitle"
        @click="emit('sendWave')"
      >
        <Skull v-if="isBossWave" class="w-3.5 h-3.5" />
        <Play v-else class="w-3.5 h-3.5 fill-current" />
        <span class="hidden sm:inline">{{ sendLabel }}</span>
        <span class="sm:hidden">{{ sendLabelShort }}</span>
        <kbd
          v-if="canSendWave"
          class="hidden pointer-fine:inline font-mono text-[10px] font-normal opacity-70 border border-white/25 rounded px-1"
        >Space</kbd>
      </TactileButton>
    </div>
  </header>
</template>
