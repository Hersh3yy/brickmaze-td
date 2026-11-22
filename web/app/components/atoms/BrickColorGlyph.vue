<script setup lang="ts">
import { computed } from 'vue';
import { BRICK_COLORS } from '~/game/domain/constants';
import type { BrickColor } from '~/game/domain/types';
import { spriteAtlas } from '~/game/engine/spriteAtlas';

// One data URL per World and colour, so every glyph on screen shares the baked emblem.
const emblemUrls = new Map<string, string>();

const props = withDefaults(
  defineProps<{
    color: BrickColor;
    secondaryColor?: BrickColor;
    size?: 'sm' | 'md' | 'lg';
    showLabel?: boolean;
  }>(),
  {
    size: 'md',
    showLabel: false,
  }
);

const SIZE_MAP = {
  sm: 'w-5 h-5 text-[10px]',
  md: 'w-7 h-7 text-xs',
  lg: 'w-9 h-9 text-sm',
};

const primary = computed(() => BRICK_COLORS[props.color]);
const secondary = computed(() => (props.secondaryColor ? BRICK_COLORS[props.secondaryColor] : null));
const isDouble = computed(() => Boolean(props.secondaryColor && props.secondaryColor === props.color));

const glyphStyle = computed(() => ({
  background:
    secondary.value && !isDouble.value
      ? `linear-gradient(135deg, ${primary.value.hex} 50%, ${secondary.value.hex} 50%)`
      : primary.value.hex,
  borderColor: isDouble.value ? '#FDE047' : primary.value.darkHex,
  boxShadow: isDouble.value
    ? `inset 0 0 0 1px #FEF08A, 0 0 0 1px ${primary.value.darkHex}`
    : `inset 2px 2px 0 ${primary.value.lightHex}55, inset -2px -2px 0 rgba(0,0,0,0.35)`,
}));

const world = useWorld();

/** ×2 and ★ stay text; a single colour shows the World's pixel emblem for that element. */
const glyphText = computed(() => (isDouble.value ? '×2' : secondary.value ? '★' : ''));

const emblemSrc = computed(() => {
  if (glyphText.value) return '';
  const key = `${world.value.id}:${props.color}`;
  let url = emblemUrls.get(key);
  if (!url) {
    url = spriteAtlas.getEmblem(props.color).toDataURL();
    emblemUrls.set(key, url);
  }
  return url;
});

const labelText = computed(() => {
  const names = world.value.text.elements;
  const a = names[props.color].elementName;
  if (isDouble.value) return `Double ${a} (×2)`;
  return props.secondaryColor ? `${a} + ${names[props.secondaryColor].elementName}` : a;
});
</script>

<template>
  <span class="inline-flex items-center gap-2 shrink-0">
    <span
      aria-hidden="true"
      :style="glyphStyle"
      :class="[
        'inline-flex items-center justify-center rounded-[3px] border font-mono font-bold text-white select-none shrink-0',
        SIZE_MAP[size],
      ]"
    >
      <span v-if="glyphText" class="drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]">{{ glyphText }}</span>
      <img v-else :src="emblemSrc" alt="" class="w-[62%] h-auto [image-rendering:pixelated]" />
    </span>
    <span v-if="showLabel" class="text-xs font-medium text-slate-200 whitespace-nowrap">
      {{ labelText }}
    </span>
  </span>
</template>
