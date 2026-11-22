<script setup lang="ts">
import { Eraser, Sparkles, X } from '@lucide/vue';
import { CLEAR_GRAY_BRICK_COST, TOWER_DEFS, TOWER_LIST } from '~/game/domain/constants';
import type { Coord, TowerType, TurnFusionOption } from '~/game/domain/types';
import type { TileMenu, TileRect } from '~/composables/useArenaMatch';

// A small menu drawn over the board, next to the tile it acts on, so the player
// never has to look away from the maze to keep, fuse or build.

const props = defineProps<{
  menu: TileMenu;
  gold: number;
  tileRect: (coord: Coord) => TileRect | null;
  /** Tiles the menu should not cover if it can help it (e.g. the other draft bricks). */
  avoid?: Coord[];
}>();

const emit = defineEmits<{
  keep: [];
  fuse: [option: TurnFusionOption];
  mount: [type: TowerType];
  remove: [];
  close: [];
}>();

const PANEL_WIDTH = 224;
const GAP = 8;
const EDGE = 4;

const panelRef = ref<HTMLDivElement | null>(null);
const panelHeight = ref(160);
const hoveredPartner = ref<Coord | null>(null);

function measure() {
  const h = panelRef.value?.offsetHeight;
  if (h && h !== panelHeight.value) panelHeight.value = h;
}
onMounted(measure);
onUpdated(measure);

// A new tile means a new menu: forget the partner highlight.
watch(
  () => `${props.menu.kind}:${props.menu.coord.x},${props.menu.coord.y}`,
  () => {
    hoveredPartner.value = null;
  }
);

const panelStyle = computed(() => {
  const rect = props.tileRect(props.menu.coord);
  if (!rect) return { display: 'none' };

  const w = PANEL_WIDTH;
  const h = panelHeight.value;
  const cx = rect.x + rect.size / 2;
  const cy = rect.y + rect.size / 2;
  const clampTop = (top: number) => Math.max(EDGE, Math.min(top, rect.boxH - h - EDGE));
  const clampLeft = (left: number) => Math.max(EDGE, Math.min(left, rect.boxW - w - EDGE));
  type Spot = { left: number; top: number };

  // Under the board, in the empty space portrait phones have there: covers nothing.
  const underBoard: Spot | null =
    rect.spaceBelow >= h + GAP * 2 ? { left: clampLeft(cx - w / 2), top: rect.boxH + GAP } : null;
  // Tiles this small leave no room for a menu beside them without hiding the maze.
  if (underBoard && rect.size < 28) {
    return { left: `${underBoard.left}px`, top: `${underBoard.top}px`, width: `${w}px` };
  }

  // Right, left, below, above the tile: the first that fits on the board and covers
  // none of the tiles to avoid wins; then the space under the board; then any that fits.
  const spots: Spot[] = [
    { left: rect.x + rect.size + GAP, top: clampTop(cy - h / 2) },
    { left: rect.x - GAP - w, top: clampTop(cy - h / 2) },
    { left: cx - w / 2, top: rect.y + rect.size + GAP },
    { left: cx - w / 2, top: rect.y - GAP - h },
  ];

  const fits = (s: Spot) =>
    s.left >= EDGE && s.left + w <= rect.boxW - EDGE && s.top >= EDGE && s.top + h <= rect.boxH - EDGE;
  const avoidRects = (props.avoid ?? [])
    .map((c) => props.tileRect(c))
    .filter((r): r is TileRect => r !== null);
  const coversAvoided = (s: Spot) =>
    avoidRects.some(
      (r) => r.x < s.left + w && r.x + r.size > s.left && r.y < s.top + h && r.y + r.size > s.top
    );

  const chosen: Spot =
    spots.find((s) => fits(s) && !coversAvoided(s)) ??
    underBoard ??
    spots.find(fits) ?? { left: clampLeft(spots[0]!.left), top: clampTop(cy - h / 2) };
  return { left: `${chosen.left}px`, top: `${chosen.top}px`, width: `${w}px` };
});

const partnerStyle = computed(() => {
  const partner = hoveredPartner.value;
  const rect = partner ? props.tileRect(partner) : null;
  if (!rect) return null;
  return {
    left: `${rect.x}px`,
    top: `${rect.y}px`,
    width: `${rect.size}px`,
    height: `${rect.size}px`,
  };
});

const title = computed(() => {
  if (props.menu.kind === 'draft') return 'Keep or fuse here';
  return props.menu.isGray ? 'Gray wall' : 'Brick';
});

const world = useWorld();
</script>

<template>
  <!-- Partner brick of the hovered fusion -->
  <div
    v-if="partnerStyle"
    class="pointer-events-none absolute z-10 rounded-[3px] border-2 border-dashed border-amber-300 bg-amber-300/15"
    :style="partnerStyle"
  />

  <div
    ref="panelRef"
    role="menu"
    :aria-label="title"
    class="absolute z-20 rounded-lg border border-[#3A4D66] bg-[#1C2430]/95 shadow-2xl backdrop-blur-[2px] text-xs"
    :style="panelStyle"
    @wheel.stop
    @contextmenu.prevent="emit('close')"
  >
    <div class="flex items-center justify-between gap-2 px-3 pt-2 pb-1.5 border-b border-[#2D3A4D]">
      <span class="font-semibold text-slate-200">{{ title }}</span>
      <button
        type="button"
        aria-label="Close menu"
        title="Close (Esc)"
        class="p-1 -mr-1 rounded text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
        @click="emit('close')"
      >
        <X class="w-3.5 h-3.5" />
      </button>
    </div>

    <!-- Draft: keep or fuse -->
    <div v-if="menu.kind === 'draft'" class="p-1.5 flex flex-col gap-1">
      <button
        type="button"
        role="menuitem"
        class="flex items-center gap-2 w-full min-h-9 px-2 py-1.5 rounded-md text-left text-slate-100 hover:bg-white/8 cursor-pointer"
        title="Keep this brick as a single colour (Enter)"
        @click="emit('keep')"
      >
        <BrickColorGlyph :color="menu.keepColor" size="sm" />
        <span class="flex-1 font-medium">Keep {{ world.text.elements[menu.keepColor].elementName }}</span>
        <span class="font-mono text-[10px] text-slate-500">Enter</span>
      </button>
      <button
        v-for="f in menu.fusions"
        :key="f.option.id"
        type="button"
        role="menuitem"
        class="flex items-center gap-2 w-full min-h-9 px-2 py-1.5 rounded-md text-left text-amber-200 hover:bg-amber-400/12 focus-visible:bg-amber-400/12 cursor-pointer"
        :title="f.option.description"
        @mouseenter="hoveredPartner = f.partner"
        @mouseleave="hoveredPartner = null"
        @focus="hoveredPartner = f.partner"
        @blur="hoveredPartner = null"
        @click="emit('fuse', f.option)"
      >
        <Sparkles class="w-3.5 h-3.5 shrink-0" />
        <BrickColorGlyph :color="f.option.colors[0]" :secondary-color="f.option.colors[1]" size="sm" />
        <span class="flex-1 font-medium leading-tight">{{ f.option.name }}</span>
      </button>
      <p class="px-2 pt-1 pb-0.5 text-[10px] text-slate-500 leading-snug">
        The other bricks harden into gray walls.
      </p>
    </div>

    <!-- Build: mount a weapon, or remove a gray wall -->
    <div v-else class="p-1.5 flex flex-col gap-0.5">
      <button
        v-for="(type, idx) in TOWER_LIST"
        :key="type"
        type="button"
        role="menuitem"
        :disabled="gold < TOWER_DEFS[type].cost"
        class="flex items-center gap-2 w-full min-h-9 px-2 py-1.5 rounded-md text-left hover:bg-white/8 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
        :title="world.text.towers[type].description"
        @click="emit('mount', type)"
      >
        <span class="font-mono text-[10px] text-slate-500 w-3">{{ idx + 1 }}</span>
        <span class="flex-1 min-w-0">
          <span class="block font-semibold text-slate-100 truncate">{{ world.text.towers[type].name }}</span>
          <span class="block text-[10px] text-slate-400 truncate">{{ TOWER_DEFS[type].shortRole }}</span>
        </span>
        <span
          :class="[
            'font-mono font-bold tabular-nums',
            gold >= TOWER_DEFS[type].cost ? 'text-amber-300' : 'text-rose-400',
          ]"
        >
          {{ TOWER_DEFS[type].cost }}g
        </span>
      </button>

      <template v-if="menu.isGray">
        <div class="my-1 border-t border-[#2D3A4D]" />
        <button
          type="button"
          role="menuitem"
          :disabled="gold < CLEAR_GRAY_BRICK_COST"
          class="flex items-center gap-2 w-full min-h-9 px-2 py-1.5 rounded-md text-left text-rose-300 hover:bg-rose-500/12 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          title="Open this tile for the path (Delete)"
          @click="emit('remove')"
        >
          <Eraser class="w-3.5 h-3.5 shrink-0" />
          <span class="flex-1 font-medium">Remove wall</span>
          <span class="font-mono font-bold tabular-nums">{{ CLEAR_GRAY_BRICK_COST }}g</span>
        </button>
      </template>
    </div>
  </div>
</template>
