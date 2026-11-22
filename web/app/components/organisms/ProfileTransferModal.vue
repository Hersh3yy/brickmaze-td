<script setup lang="ts">
import { X } from '@lucide/vue';
import { getProfilePerks, getXpForNextLevel } from '~/game/domain/constants';
import type { PlayerProfile } from '~/game/domain/types';

const props = defineProps<{
  profile: PlayerProfile;
  transferCode: string;
  importCode: (code: string) => Promise<{ ok: boolean; error?: string }>;
}>();

const emit = defineEmits<{
  close: [];
  updateDisplayName: [name: string];
  resetProfile: [];
}>();

const nameInput = ref(props.profile.displayName);
const nextXp = computed(() => getXpForNextLevel(props.profile.level));
const perks = computed(() => getProfilePerks(props.profile.level));

// Start over is two clicks on purpose: the first only arms the button.
const confirmReset = ref(false);

function handleReset() {
  if (!confirmReset.value) {
    confirmReset.value = true;
    return;
  }
  confirmReset.value = false;
  emit('resetProfile');
}

// A reset or an imported code swaps the whole profile, so refresh the name field.
watch(
  () => props.profile.profileId,
  () => {
    nameInput.value = props.profile.displayName;
  }
);

function handleSaveName() {
  const cleaned = nameInput.value.trim().slice(0, 24);
  if (cleaned) emit('updateDisplayName', cleaned);
}
</script>

<template>
  <div
    role="dialog"
    aria-modal="true"
    aria-labelledby="profile-modal-title"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
  >
    <div class="w-full max-w-lg rounded-lg bg-[#1D2531] border border-[#36475F] shadow-2xl overflow-hidden">
      <div class="flex items-center justify-between px-5 py-4 border-b border-[#2D3A4D]">
        <div>
          <h2 id="profile-modal-title" class="text-lg font-bold text-slate-100">
            Architect Profile &amp; Transfer
          </h2>
          <p class="text-xs text-slate-400 font-mono mt-0.5">
            ID: {{ profile.profileId }} · Rank {{ profile.level }}
          </p>
        </div>
        <button
          type="button"
          aria-label="Close profile dialog"
          class="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-white/5 cursor-pointer"
          @click="emit('close')"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <div class="p-5 space-y-5 max-h-[80vh] overflow-y-auto">
        <!-- Display Name -->
        <form class="space-y-1.5" @submit.prevent="handleSaveName">
          <label for="profile-name-input" class="block text-xs font-medium text-slate-300">
            Workshop Name
          </label>
          <div class="flex items-center gap-2">
            <input
              id="profile-name-input"
              v-model="nameInput"
              type="text"
              maxlength="24"
              class="flex-1 bg-[#141920] border border-[#324054] rounded-md px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-400"
            />
            <TactileButton type="submit" variant="secondary" size="sm">
              Save Name
            </TactileButton>
          </div>
        </form>

        <!-- Rank Progress & Light QoL Perks -->
        <div class="space-y-2 pt-3 border-t border-[#2D3A4D]">
          <div class="flex items-center justify-between text-xs">
            <span class="font-semibold text-slate-200">Architect Rank {{ profile.level }}</span>
            <span class="font-mono text-slate-400 tabular-nums">
              {{ profile.xp }} / {{ nextXp }} XP
            </span>
          </div>
          <ProgressTrackBar
            :value="profile.xp"
            :max="nextXp"
            fill-class="bg-amber-400"
            ariaLabel="Architect experience progress"
          />
          <div class="text-xs text-slate-400">
            Active Perks: <span class="text-emerald-300">{{ perks.perkSummary.join(' · ') }}</span>
          </div>
        </div>

        <!-- Lifetime Stats -->
        <div class="grid grid-cols-3 gap-4 pt-3 border-t border-[#2D3A4D] text-xs">
          <div>
            <div class="text-slate-400">Matches / Wins</div>
            <div class="font-mono font-bold text-slate-100 text-sm tabular-nums mt-0.5">
              {{ profile.stats.gamesPlayed }} / {{ profile.stats.gamesWon }}
            </div>
          </div>
          <div>
            <div class="text-slate-400">Highest Wave</div>
            <div class="font-mono font-bold text-amber-300 text-sm tabular-nums mt-0.5">
              {{ profile.stats.highestWave }}
            </div>
          </div>
          <div>
            <div class="text-slate-400">Longest Maze</div>
            <div class="font-mono font-bold text-sky-300 text-sm tabular-nums mt-0.5">
              {{ profile.stats.longestMazePath }} tiles
            </div>
          </div>
        </div>

        <!-- Portable Transfer Code -->
        <div class="pt-3 border-t border-[#2D3A4D]">
          <TransferCodeField :transfer-code="transferCode" :import-code="importCode" />
        </div>

        <!-- Start over -->
        <div class="pt-3 border-t border-[#2D3A4D] flex items-center justify-between gap-3">
          <p class="text-[11px] text-slate-400">
            Progress is saved in this browser only. Starting over wipes rank, XP, themes and stats.
          </p>
          <div class="flex items-center gap-2 shrink-0">
            <TactileButton v-if="confirmReset" variant="ghost" size="sm" @click="confirmReset = false">
              Cancel
            </TactileButton>
            <TactileButton :variant="confirmReset ? 'danger' : 'secondary'" size="sm" @click="handleReset">
              {{ confirmReset ? 'Yes, wipe it' : 'Start Over' }}
            </TactileButton>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
