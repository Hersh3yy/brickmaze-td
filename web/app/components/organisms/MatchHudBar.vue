<script setup lang="ts">
import { ArrowLeft, Play, Skull } from '@lucide/vue';
import { DIFFICULTY_DEFS, MAX_WAVES, WAVE_MODIFIER_INFO, getWaveModifier } from '~/game/domain/constants';
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
}>();

const canSendWave = computed(() => props.phase === 'BUILD_MANAGE');
const isBossWave = computed(() => props.wave % 5 === 0);
const waveModifier = computed(() => getWaveModifier(props.wave));
const waveSubtext = computed(() =>
  isBossWave.value
    ? 'BOSS'
    : waveModifier.value
      ? WAVE_MODIFIER_INFO[waveModifier.value].label
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
    : 'Finish brick draft first'
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
  <header
    class="flex flex-wrap md:flex-nowrap items-center justify-between gap-x-3 gap-y-2 px-3 sm:px-5 py-2 bg-[#1D2531] border-b border-[#2F3D51] shrink-0"
  >
    <div class="flex items-center gap-2 shrink-0">
      <button
        type="button"
        title="Return to Lobby"
        class="p-2 sm:p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
        aria-label="Return to Lobby"
        @click="emit('exitToLobby')"
      >
        <ArrowLeft class="w-4 h-4" />
      </button>
      <span
        class="hidden sm:inline font-display text-base font-bold tracking-tight text-slate-100 whitespace-nowrap shrink-0"
      >
        BrickMaze TD
      </span>
    </div>

    <div
      class="order-3 md:order-2 w-full md:w-auto flex items-center justify-between md:justify-center gap-3 sm:gap-5 pt-1 md:pt-0 border-t border-[#283446] md:border-t-0"
    >
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

    <div class="order-2 md:order-3 flex items-center gap-2 sm:gap-3 shrink-0">
      <SpeedAudioControlGroup
        :speed="speed"
        :muted="muted"
        @change-speed="emit('changeSpeed', $event)"
        @toggle-mute="emit('toggleMute')"
      />
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
      </TactileButton>
    </div>
  </header>
</template>
