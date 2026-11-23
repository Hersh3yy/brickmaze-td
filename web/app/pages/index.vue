<script setup lang="ts">
import { Lock, Play, User } from '@lucide/vue';
import {
  BOARD_THEMES,
  BRICK_COLOR_LIST,
  DIFFICULTY_DEFS,
  DIFFICULTY_LIST,
  MAP_LAYOUTS,
  getProfilePerks,
  getXpForNextLevel,
} from '~/game/domain/constants';
import type { BoardThemeId, DifficultyId, MapLayoutId } from '~/game/domain/types';
import { WORLDS, WORLD_LIST, setWorld, type WorldId } from '~/game/worlds';

// Lobby art lives in public/images. Until those files exist the onError fallbacks show.
const HERO_IMAGE = '/images/brickmaze_hero.jpg';
const EMBLEM_IMAGE = '/images/brickmaze_emblem.jpg';

const {
  profile,
  transferCode,
  ensureLoaded,
  selectTheme,
  updateDisplayName,
  importCode,
  resetProfile,
} = useProfile();
const { selectedMap, selectedDifficulty } = useMatchSetup();

const profileOpen = ref(false);
const heroImgFailed = ref(false);
const emblemFailed = ref(false);

const nextXp = computed(() => getXpForNextLevel(profile.value.level));
const perks = computed(() => getProfilePerks(profile.value.level));
const activeDiff = computed(() => DIFFICULTY_DEFS[selectedDifficulty.value]);

const mapIds = Object.keys(MAP_LAYOUTS) as MapLayoutId[];
const themeIds = Object.keys(BOARD_THEMES) as BoardThemeId[];

const world = useWorld();
const towerNames = computed(() => {
  const t = world.value.text.towers;
  return [t.repeater.name, t.cannon.name, t.pulse.name, t.sniper.name];
});
const elementNames = computed(() => {
  const e = world.value.text.elements;
  return [e.yellow.elementName, e.red.elementName, e.green.elementName];
});

function worldButtonClass(id: WorldId): string {
  return [
    'w-full text-left px-3.5 py-2.5 min-h-[44px] rounded-md border transition-colors cursor-pointer',
    world.value.id === id
      ? 'bg-[#283548] border-amber-400 text-slate-100'
      : 'bg-[#171E28] border-[#2C384B] text-slate-300 hover:bg-[#1F2937]',
  ].join(' ');
}

function difficultyButtonClass(diffId: DifficultyId): string {
  const active = selectedDifficulty.value === diffId;
  return [
    'min-h-[40px] px-2 py-2 rounded text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer',
    active
      ? diffId === 'brutal'
        ? 'bg-rose-500/20 text-rose-200 border border-rose-400/60'
        : diffId === 'hard'
          ? 'bg-amber-500/20 text-amber-200 border border-amber-400/60'
          : 'bg-[#283548] text-white border border-amber-400/70'
      : 'text-slate-400 hover:text-slate-200 border border-transparent',
  ].join(' ');
}

function mapButtonClass(id: MapLayoutId): string {
  return [
    'w-full text-left px-3.5 py-2.5 min-h-[44px] rounded-md border transition-colors cursor-pointer',
    selectedMap.value === id
      ? 'bg-[#283548] border-amber-400 text-slate-100'
      : 'bg-[#171E28] border-[#2C384B] text-slate-300 hover:bg-[#1F2937]',
  ].join(' ');
}

function isThemeUnlocked(themeId: BoardThemeId): boolean {
  return profile.value.unlockedThemes.includes(themeId);
}

function themeButtonClass(themeId: BoardThemeId): string {
  const active = profile.value.selectedTheme === themeId;
  return [
    'flex items-center justify-between gap-2 px-3 py-2 min-h-[40px] rounded-md border text-xs transition-colors',
    active
      ? 'bg-[#283548] border-amber-400 text-slate-100 font-semibold cursor-pointer'
      : isThemeUnlocked(themeId)
        ? 'bg-[#171E28] border-[#2C384B] text-slate-300 hover:bg-[#1F2937] cursor-pointer'
        : 'bg-[#141920] border-[#242E3D] text-slate-500 opacity-65 cursor-not-allowed',
  ].join(' ');
}

function startMatch() {
  track('match-start', {
    difficulty: selectedDifficulty.value,
    map: selectedMap.value,
    world: world.value.id,
    theme: profile.value.selectedTheme,
  });
  return navigateTo('/play');
}

onMounted(() => {
  ensureLoaded();
});
</script>

<template>
  <LobbyShellTemplate>
    <template #header>
      <header class="flex items-center justify-between gap-4 sm:gap-8 px-4 sm:px-6 py-3.5 sm:py-4 bg-[#1C2430] border-b border-[#2D3A4D]">
        <div class="flex items-center gap-3 shrink-0">
          <img
            v-if="!emblemFailed"
            :src="EMBLEM_IMAGE"
            alt="BrickMaze TD emblem"
            referrerpolicy="no-referrer"
            class="w-8 h-8 rounded-[4px] object-cover border border-[#3B4C65] pixel-canvas shrink-0"
            @error="emblemFailed = true"
          />
          <div
            v-else
            class="w-8 h-8 rounded-[4px] bg-amber-500/20 border border-amber-400/50 flex items-center justify-center font-mono text-xs font-bold text-amber-300 shrink-0"
          >
            BM
          </div>
          <span class="font-display text-lg font-bold tracking-tight text-slate-100 whitespace-nowrap shrink-0">
            BrickMaze TD
          </span>
        </div>

        <nav class="hidden md:flex items-center gap-5 text-sm text-slate-300">
          <span class="whitespace-nowrap shrink-0">
            {{ profile.displayName }} · Rank {{ profile.level }}
          </span>
          <span aria-hidden="true" class="text-slate-600">
            ·
          </span>
          <span class="font-mono text-xs text-slate-400 tabular-nums whitespace-nowrap shrink-0">
            Best Wave {{ profile.stats.highestWave }}
          </span>
        </nav>

        <div class="flex items-center gap-3 shrink-0">
          <TactileButton variant="secondary" size="sm" @click="profileOpen = true">
            <User class="w-3.5 h-3.5" />
            <span>Profile &amp; Code</span>
          </TactileButton>
        </div>
      </header>
    </template>

    <template #hero-visual>
      <div class="flex flex-col h-full rounded-lg overflow-hidden bg-[#1D2531] border border-[#2F3D51]">
        <div class="relative flex-1 min-h-[220px] sm:min-h-[280px] bg-[#12171E] overflow-hidden">
          <img
            v-if="!heroImgFailed"
            :src="HERO_IMAGE"
            alt="Top-down pixel art plastic brick tower defense maze diorama"
            referrerpolicy="no-referrer"
            class="w-full h-full object-cover"
            @error="heroImgFailed = true"
          />
          <div
            v-else
            class="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1D2531] to-[#11161D] p-8 text-center"
          >
            <span class="font-display text-2xl font-bold text-slate-200">
              BrickMaze TD Tactical Baseplate
            </span>
          </div>
          <div class="absolute inset-0 bg-gradient-to-t from-[#161B22] via-[#161B22]/45 to-transparent" />
          <div class="absolute bottom-0 inset-x-0 p-4 sm:p-6 space-y-2">
            <h1
              class="text-2xl sm:text-4xl font-extrabold tracking-tight text-white max-w-xl"
              style="text-wrap: balance"
            >
              Weapons on Top. Elemental Bricks Underneath.
            </h1>
            <p class="text-xs sm:text-sm text-slate-200 max-w-xl leading-relaxed">
              Draft 4 elemental bricks each turn to build your maze. Mount a {{ towerNames.join(', ') }}—and watch the brick color turn their ammo into {{ elementNames[0] }}, {{ elementNames[1] }}, or {{ elementNames[2] }}.
            </p>
          </div>
        </div>

        <div class="px-6 py-4 bg-[#1A212C] border-t border-[#2D3A4D] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div class="space-y-1.5 flex-1 max-w-sm">
            <div class="flex items-center justify-between text-xs">
              <span class="font-semibold text-slate-200">Rank {{ profile.level }}</span>
              <span class="font-mono text-slate-400 tabular-nums">
                {{ profile.xp }} / {{ nextXp }} XP
              </span>
            </div>
            <ProgressTrackBar
              :value="profile.xp"
              :max="nextXp"
              fill-class="bg-amber-400"
              height-class="h-1.5"
              ariaLabel="Profile rank progress"
            />
          </div>
          <div class="text-xs text-slate-400">
            Perks: <span class="text-emerald-300 font-medium">{{ perks.perkSummary.join(' · ') }}</span>
          </div>
        </div>
      </div>
    </template>

    <template #setup-panel>
      <div class="flex flex-col justify-between h-full rounded-lg bg-[#1D2531] border border-[#2F3D51] p-4 sm:p-6 space-y-5">
        <div class="space-y-5">
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <h2 class="text-sm font-bold text-slate-100">01. Difficulty</h2>
              <span class="font-mono text-[11px] text-emerald-300 tabular-nums">
                {{ Math.round(activeDiff.xpMult * 100) }}% XP
              </span>
            </div>
            <div class="grid grid-cols-3 gap-1.5 p-1 bg-[#141A22] border border-[#2C384B] rounded-md">
              <button
                v-for="diffId in DIFFICULTY_LIST"
                :key="diffId"
                type="button"
                :class="difficultyButtonClass(diffId)"
                @click="selectedDifficulty = diffId"
              >
                {{ DIFFICULTY_DEFS[diffId].label }}
              </button>
            </div>
            <p class="text-xs text-slate-400">{{ activeDiff.tagline }}</p>
          </div>

          <div class="space-y-2 pt-2 border-t border-[#2C384B]">
            <div class="flex items-center justify-between">
              <h2 class="text-sm font-bold text-slate-100">02. Map</h2>
              <span class="text-xs text-slate-400">24×16 · 30 Waves</span>
            </div>
            <div class="space-y-2">
              <button
                v-for="id in mapIds"
                :key="id"
                type="button"
                :class="mapButtonClass(id)"
                @click="selectedMap = id"
              >
                <div class="flex items-center justify-between gap-2">
                  <span class="text-sm font-semibold">{{ world.text.maps[id].name }}</span>
                  <span class="font-mono text-[11px] text-amber-300">{{ MAP_LAYOUTS[id].difficulty }}</span>
                </div>
                <p class="text-xs text-slate-400 mt-0.5 leading-snug">{{ world.text.maps[id].description }}</p>
              </button>
            </div>
          </div>

          <div class="space-y-2 pt-2 border-t border-[#2C384B]">
            <div class="flex items-center justify-between">
              <h2 class="text-sm font-bold text-slate-100">03. World</h2>
              <span class="text-xs text-slate-400">Cosmetic · same rules</span>
            </div>
            <div class="space-y-2">
              <button
                v-for="id in WORLD_LIST"
                :key="id"
                type="button"
                :class="worldButtonClass(id)"
                @click="setWorld(id)"
              >
                <span class="block text-sm font-semibold">{{ WORLDS[id].name }}</span>
                <span class="block text-xs text-slate-400 mt-0.5 leading-snug">{{ WORLDS[id].tagline }}</span>
              </button>
            </div>
          </div>

          <div class="space-y-2 pt-2 border-t border-[#2C384B]">
            <div class="flex items-center justify-between">
              <h2 class="text-sm font-bold text-slate-100">04. Board</h2>
              <span class="text-xs text-slate-400">Cosmetic</span>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <button
                v-for="themeId in themeIds"
                :key="themeId"
                type="button"
                :disabled="!isThemeUnlocked(themeId)"
                :class="themeButtonClass(themeId)"
                @click="selectTheme(themeId)"
              >
                <span class="flex items-center gap-2 truncate">
                  <span
                    class="w-3 h-3 rounded-[2px] border border-white/20 shrink-0"
                    :style="{ backgroundColor: world.boards[themeId].cellFill }"
                  />
                  <span class="truncate">{{ world.boards[themeId].name }}</span>
                </span>
                <span
                  v-if="!isThemeUnlocked(themeId)"
                  class="inline-flex items-center gap-1 font-mono text-[10px] shrink-0"
                >
                  <Lock class="w-3 h-3" />
                  Lv.{{ BOARD_THEMES[themeId].unlockLevel }}
                </span>
              </button>
            </div>
          </div>
        </div>

        <div class="pt-2 space-y-2">
          <TactileButton variant="primary" size="lg" full-width @click="startMatch">
            <Play class="w-4 h-4 fill-current" />
            <span>Start {{ activeDiff.label }} Match</span>
          </TactileButton>
        </div>
      </div>
    </template>

    <template #footer-rules>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="space-y-1.5">
          <h3 class="text-sm font-bold text-slate-100">01. Towers = Weapon Types</h3>
          <p class="text-xs text-slate-400 leading-relaxed">
            {{ towerNames[0] }} (rapid fire), {{ towerNames[1] }} (arcing blast), {{ towerNames[2] }} (360° shockwave), and {{ towerNames[3] }} (pierces armor). Move any weapon freely between waves.
          </p>
        </div>
        <div class="space-y-1.5">
          <h3 class="text-sm font-bold text-slate-100">02. Bricks = Projectile Ammo</h3>
          <div class="space-y-1.5">
            <div
              v-for="c in BRICK_COLOR_LIST"
              :key="c"
              class="inline-flex items-center gap-2 text-xs text-slate-300 mr-4"
            >
              <BrickColorGlyph :color="c" size="sm" />
              <span>{{ world.text.elements[c].bonusShort }}</span>
            </div>
          </div>
        </div>
        <div class="space-y-1.5">
          <h3 class="text-sm font-bold text-slate-100">03. Replant &amp; Zoom</h3>
          <p class="text-xs text-slate-400 leading-relaxed">
            Replant new bricks directly over empty gray walls so you never run out of room, and zoom in up to 225% to watch the pixel-art combat up close.
          </p>
        </div>
      </div>
    </template>

    <template #modal>
      <ProfileTransferModal
        v-if="profileOpen"
        :profile="profile"
        :transfer-code="transferCode"
        :import-code="importCode"
        @close="profileOpen = false"
        @update-display-name="updateDisplayName"
        @reset-profile="resetProfile"
      />
    </template>
  </LobbyShellTemplate>
</template>
