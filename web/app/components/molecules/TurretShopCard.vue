<script setup lang="ts">
import { computed } from 'vue';
import { TOWER_DEFS } from '~/game/domain/constants';
import type { TowerType } from '~/game/domain/types';
import { spriteAtlas } from '~/game/engine/spriteAtlas';

// Shop icons are the World's own turret sprites (plain kinetic paint), one data URL per World.
const iconUrls = new Map<string, string>();

const props = defineProps<{
  type: TowerType;
  gold: number;
  selected: boolean;
  disabled: boolean;
}>();

const emit = defineEmits<{ select: [type: TowerType] }>();

const def = computed(() => TOWER_DEFS[props.type]);
const world = useWorld();
const text = computed(() => world.value.text.towers[props.type]);
const iconSrc = computed(() => {
  const key = `${world.value.id}:${props.type}`;
  let url = iconUrls.get(key);
  if (!url) {
    url = spriteAtlas.getTurret(props.type, 'kinetic').toDataURL();
    iconUrls.set(key, url);
  }
  return url;
});
const canAfford = computed(() => props.gold >= def.value.cost);
const isLocked = computed(() => props.disabled || !canAfford.value);
</script>

<template>
  <button
    type="button"
    :disabled="isLocked"
    :title="text.description"
    :class="[
      'flex items-center gap-2.5 px-2.5 lg:px-3.5 py-2 rounded-md border text-left transition-all duration-150 min-w-0',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400',
      selected
        ? 'bg-[#2C3A4E] border-amber-400 shadow-[0_0_0_1px_rgba(251,191,36,0.35)]'
        : isLocked
          ? 'bg-[#19202B] border-[#283344] opacity-50 cursor-not-allowed'
          : 'bg-[#202937] border-[#324054] hover:bg-[#273244] hover:border-[#495D7A] cursor-pointer',
    ]"
    @click="emit('select', type)"
  >
    <img
      :src="iconSrc"
      alt=""
      width="28"
      height="28"
      class="shrink-0 [image-rendering:pixelated]"
    />
    <div class="min-w-0 flex-1">
      <div class="flex items-center justify-between gap-2">
        <span class="text-sm font-semibold text-slate-100 truncate">{{ text.name }}</span>
        <span
          :class="[
            'font-mono text-xs font-bold tabular-nums shrink-0',
            canAfford ? 'text-amber-300' : 'text-rose-400',
          ]"
        >
          {{ def.cost }}g
        </span>
      </div>
      <div class="flex items-center justify-between gap-2 mt-0.5">
        <span class="text-[11px] text-slate-400 truncate">{{ def.shortRole }}</span>
        <kbd class="pointer-coarse:hidden font-mono text-[10px] text-slate-500">{{ def.hotkey }}</kbd>
      </div>
    </div>
  </button>
</template>
