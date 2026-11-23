<script setup lang="ts">
import { Info, Maximize2, ZoomIn, ZoomOut } from '@lucide/vue';
import { CANVAS_HEIGHT, CANVAS_WIDTH, GRID_COLS, GRID_ROWS, TILE_SIZE } from '~/game/domain/constants';
import type { Coord, GamePhase } from '~/game/domain/types';
import { renderArenaFrame } from '~/game/engine/pixelRenderer';
import type { CameraView, RenderFrameInput } from '~/game/engine/pixelRenderer';
import type { TileRect } from '~/composables/useArenaMatch';

const props = defineProps<{
  /** Plain mutable object owned by useArenaMatch; read every animation frame. */
  frame: RenderFrameInput;
  phase: GamePhase;
  bricksRemaining: number;
  relocating: boolean;
  hoverStatusText: string | null;
  hoverStatusTone: 'neutral' | 'good' | 'info' | 'bad';
  bossPreview?: { name: string; hp: number; count: number } | null;
  pathLength: number;
  creepsRemaining: number;
  waveTotalCreeps: number;
}>();

const emit = defineEmits<{
  hoverTile: [coord: Coord | null];
  clickTile: [coord: Coord];
  rightClick: [];
  openMobileInspector: [];
}>();

const MIN_ZOOM = 1;
const MAX_ZOOM = 2.25;

function clampCamera(cam: CameraView): CameraView {
  const zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, cam.zoom));
  if (zoom <= 1.001) {
    return { zoom: 1, panX: 0, panY: 0 };
  }
  const minPanX = CANVAS_WIDTH - CANVAS_WIDTH * zoom;
  const minPanY = CANVAS_HEIGHT - CANVAS_HEIGHT * zoom;
  return {
    zoom,
    panX: Math.max(minPanX, Math.min(0, cam.panX)),
    panY: Math.max(minPanY, Math.min(0, cam.panY)),
  };
}

const canvasRef = ref<HTMLCanvasElement | null>(null);
const wrapperRef = ref<HTMLDivElement | null>(null);
const zoomPct = ref(100);
/** Bumped whenever the board moves on screen (resize, zoom, pan), so overlays re-place. */
const layoutTick = ref(0);


// Gesture bookkeeping is plain (non-reactive): it changes on every pointer event.
const drag = {
  active: false,
  moved: false,
  startClientX: 0,
  startClientY: 0,
  startPanX: 0,
  startPanY: 0,
};

const pinch = {
  active: false,
  startDist: 0,
  startZoom: 1,
  midCanvasX: CANVAS_WIDTH / 2,
  midCanvasY: CANVAS_HEIGHT / 2,
};

let rafId = 0;
let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  if (wrapperRef.value && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      layoutTick.value += 1;
    });
    resizeObserver.observe(wrapperRef.value);
  }

  const ctx = canvasRef.value?.getContext('2d') ?? null;
  const renderLoop = (ts: number) => {
    if (ctx) {
      props.frame.nowSec = ts / 1000;
      renderArenaFrame(ctx, props.frame);
    }
    rafId = requestAnimationFrame(renderLoop);
  };
  rafId = requestAnimationFrame(renderLoop);
});

onBeforeUnmount(() => {
  cancelAnimationFrame(rafId);
  resizeObserver?.disconnect();
  window.removeEventListener('keydown', onZoomKey);
});

// + / - zoom around the centre, 0 fits the board again.
function onZoomKey(e: KeyboardEvent) {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === '+' || e.key === '=') zoomStep(0.25);
  else if (e.key === '-' || e.key === '_') zoomStep(-0.25);
  else if (e.key === '0') resetCamera();
}
onMounted(() => window.addEventListener('keydown', onZoomKey));

function applyCamera(next: CameraView) {
  const clamped = clampCamera(next);
  props.frame.camera = clamped;
  zoomPct.value = Math.round(clamped.zoom * 100);
  layoutTick.value += 1;
}

/** Where a grid tile is drawn on screen, for menus placed over the board. */
function tileRect(coord: Coord): TileRect | null {
  void layoutTick.value; // re-run when the board moves
  const canvas = canvasRef.value;
  const wrapper = wrapperRef.value;
  if (!canvas || !wrapper) return null;
  const boxW = canvas.clientWidth;
  const boxH = canvas.clientHeight;
  if (boxW <= 0 || boxH <= 0) return null;

  const scale = Math.min(boxW / CANVAS_WIDTH, boxH / CANVAS_HEIGHT);
  const originX = canvas.offsetLeft + canvas.clientLeft + (boxW - CANVAS_WIDTH * scale) / 2;
  const originY = canvas.offsetTop + canvas.clientTop + (boxH - CANVAS_HEIGHT * scale) / 2;
  const cam = props.frame.camera;
  const stage = wrapper.parentElement;
  const spaceBelow = stage
    ? Math.max(0, stage.clientHeight - (wrapper.offsetTop + wrapper.offsetHeight))
    : 0;
  return {
    x: originX + (coord.x * TILE_SIZE * cam.zoom + cam.panX) * scale,
    y: originY + (coord.y * TILE_SIZE * cam.zoom + cam.panY) * scale,
    size: TILE_SIZE * cam.zoom * scale,
    boxW: wrapper.clientWidth,
    boxH: wrapper.clientHeight,
    spaceBelow,
  };
}

function zoomAtPoint(nextZoom: number, focalCanvasX: number, focalCanvasY: number) {
  const prev = props.frame.camera;
  const targetZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, nextZoom));
  const worldX = (focalCanvasX - prev.panX) / prev.zoom;
  const worldY = (focalCanvasY - prev.panY) / prev.zoom;
  applyCamera({
    zoom: targetZoom,
    panX: focalCanvasX - worldX * targetZoom,
    panY: focalCanvasY - worldY * targetZoom,
  });
}

function zoomStep(delta: number) {
  zoomAtPoint(props.frame.camera.zoom + delta, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
}

function resetCamera() {
  applyCamera({ zoom: 1, panX: 0, panY: 0 });
}

// The canvas box often has a different shape than the 3:2 board (the dock under it
// changes height between phases), and `object-contain` then letterboxes the board
// inside the box. Map pointer positions to the area where the board is really drawn,
// not to the whole box, or clicks land on the wrong tile.
function clientToCanvas(clientX: number, clientY: number) {
  const canvas = canvasRef.value;
  if (!canvas) return null;
  const rect = canvas.getBoundingClientRect();
  const boxW = canvas.clientWidth;
  const boxH = canvas.clientHeight;
  if (boxW <= 0 || boxH <= 0) return null;

  const scale = Math.min(boxW / CANVAS_WIDTH, boxH / CANVAS_HEIGHT);
  const drawnLeft = rect.left + canvas.clientLeft + (boxW - CANVAS_WIDTH * scale) / 2;
  const drawnTop = rect.top + canvas.clientTop + (boxH - CANVAS_HEIGHT * scale) / 2;

  return {
    cx: (clientX - drawnLeft) / scale,
    cy: (clientY - drawnTop) / scale,
    scaleX: 1 / scale,
    scaleY: 1 / scale,
  };
}

function toGridCoord(clientX: number, clientY: number): Coord | null {
  const pos = clientToCanvas(clientX, clientY);
  if (!pos) return null;
  const cam = props.frame.camera;
  const worldX = (pos.cx - cam.panX) / cam.zoom;
  const worldY = (pos.cy - cam.panY) / cam.zoom;
  const gx = Math.floor(worldX / (CANVAS_WIDTH / GRID_COLS));
  const gy = Math.floor(worldY / (CANVAS_HEIGHT / GRID_ROWS));
  if (gx < 0 || gx >= GRID_COLS || gy < 0 || gy >= GRID_ROWS) return null;
  return { x: gx, y: gy };
}

function startDrag(clientX: number, clientY: number) {
  drag.active = true;
  drag.moved = false;
  drag.startClientX = clientX;
  drag.startClientY = clientY;
  drag.startPanX = props.frame.camera.panX;
  drag.startPanY = props.frame.camera.panY;
}

function dragTo(clientX: number, clientY: number, threshold: number) {
  const pos = clientToCanvas(clientX, clientY);
  if (!pos) return;
  const dx = (clientX - drag.startClientX) * pos.scaleX;
  const dy = (clientY - drag.startClientY) * pos.scaleY;
  if (Math.abs(dx) > threshold || Math.abs(dy) > threshold) drag.moved = true;
  // Below the threshold it is still a click: leave the board where it is.
  if (!drag.moved) return;
  applyCamera({
    zoom: props.frame.camera.zoom,
    panX: drag.startPanX + dx,
    panY: drag.startPanY + dy,
  });
}

/**
 * Wheel input. Zoom follows the size of the scroll, so a trackpad zooms smoothly and
 * a mouse notch zooms one comfortable step (it used to jump 25% per event, which sent
 * a trackpad straight to 225%). Trackpad pinch arrives as ctrl+wheel. Sideways scroll
 * (or Shift+wheel) pans the zoomed board; dragging pans too.
 */
function handleWheel(e: WheelEvent) {
  const pos = clientToCanvas(e.clientX, e.clientY);
  if (!pos) return;
  const cam = props.frame.camera;
  const px = e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 400 : 1;
  const dx = (e.shiftKey && e.deltaX === 0 ? e.deltaY : e.deltaX) * px;
  const dy = e.shiftKey ? 0 : e.deltaY * px;

  if (!e.ctrlKey && Math.abs(dx) > Math.abs(dy)) {
    if (cam.zoom <= 1.001) return;
    applyCamera({ zoom: cam.zoom, panX: cam.panX - dx * pos.scaleX, panY: cam.panY });
    return;
  }

  const step = Math.max(-120, Math.min(120, dy));
  const factor = Math.exp(-step * (e.ctrlKey ? 0.01 : 0.002));
  zoomAtPoint(cam.zoom * factor, pos.cx, pos.cy);
}

function handleMouseDown(e: MouseEvent) {
  if (props.frame.camera.zoom <= 1.01) return;
  // Left drag pans too once zoomed in; a press without movement is still a click.
  if (e.button === 0) {
    startDrag(e.clientX, e.clientY);
    return;
  }
  if (e.button === 1 || e.button === 2) {
    e.preventDefault();
    startDrag(e.clientX, e.clientY);
  }
}

function handleMouseMove(e: MouseEvent) {
  if (drag.active) {
    dragTo(e.clientX, e.clientY, 4);
    return;
  }
  emit('hoverTile', toGridCoord(e.clientX, e.clientY));
}

function handleMouseUp() {
  drag.active = false;
}

function handleMouseLeave() {
  drag.active = false;
  emit('hoverTile', null);
}

// Touch gestures: 2-finger pinch zoom, 1-finger pan when zoomed in
function handleTouchStart(e: TouchEvent) {
  const t1 = e.touches[0];
  const t2 = e.touches[1];
  if (e.touches.length === 2 && t1 && t2) {
    const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
    const mid = clientToCanvas((t1.clientX + t2.clientX) / 2, (t1.clientY + t2.clientY) / 2);
    pinch.active = true;
    pinch.startDist = Math.max(10, dist);
    pinch.startZoom = props.frame.camera.zoom;
    pinch.midCanvasX = mid ? mid.cx : CANVAS_WIDTH / 2;
    pinch.midCanvasY = mid ? mid.cy : CANVAS_HEIGHT / 2;
    drag.active = false;
    drag.moved = true;
  } else if (e.touches.length === 1 && t1 && props.frame.camera.zoom > 1.01) {
    startDrag(t1.clientX, t1.clientY);
  }
}

function handleTouchMove(e: TouchEvent) {
  const t1 = e.touches[0];
  const t2 = e.touches[1];
  if (pinch.active && e.touches.length === 2 && t1 && t2) {
    const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
    zoomAtPoint(pinch.startZoom * (dist / pinch.startDist), pinch.midCanvasX, pinch.midCanvasY);
    return;
  }
  if (drag.active && e.touches.length === 1 && t1) {
    dragTo(t1.clientX, t1.clientY, 6);
  }
}

function handleTouchEnd(e: TouchEvent) {
  if (e.touches.length < 2) pinch.active = false;
  if (e.touches.length === 0) drag.active = false;
}

function handleClick(e: MouseEvent) {
  if (drag.moved) {
    drag.moved = false;
    return;
  }
  const coord = toGridCoord(e.clientX, e.clientY);
  if (coord) emit('clickTile', coord);
}

function handleContextMenu() {
  if (drag.moved) {
    drag.moved = false;
    return;
  }
  emit('rightClick');
}

const toneClass = computed(() =>
  props.hoverStatusTone === 'bad'
    ? 'text-rose-400'
    : props.hoverStatusTone === 'good'
      ? 'text-emerald-400'
      : props.hoverStatusTone === 'info'
        ? 'text-sky-300'
        : 'text-slate-400'
);

const zoomed = computed(() => zoomPct.value > 100);
const showCreeps = computed(() => props.phase === 'COMBAT' && props.waveTotalCreeps > 0);
const creepProgress = computed(() =>
  props.waveTotalCreeps > 0
    ? (props.waveTotalCreeps - props.creepsRemaining) / props.waveTotalCreeps
    : 0
);

const bossBar = computed(
  () => Boolean(props.bossPreview) && props.phase !== 'VICTORY' && props.phase !== 'GAME_OVER'
);
</script>

<template>
  <div class="flex flex-col h-full min-h-0 bg-[#141920]">
    <div
      :class="[
        'relative flex items-center justify-between gap-2 sm:gap-4 px-3 sm:px-4 py-1.5 sm:py-2 border-b shrink-0',
        bossBar ? 'bg-rose-950/45 border-rose-500/40' : 'bg-[#1A212C] border-[#293446]',
      ]"
    >
      <PhaseStatusLabel
        :phase="phase"
        :bricks-remaining="bricksRemaining"
        :relocating="relocating"
        :boss-preview="bossPreview"
      />

      <div class="flex items-center gap-2 sm:gap-4 shrink-0">
        <span
          v-if="showCreeps"
          class="font-mono text-[11px] sm:text-xs text-slate-300 tabular-nums whitespace-nowrap"
          title="Creeps left in this wave"
        >
          {{ creepsRemaining }}/{{ waveTotalCreeps }}
        </span>
        <span
          v-else
          class="sm:hidden font-mono text-[11px] text-sky-300 tabular-nums whitespace-nowrap"
          title="Path length in tiles"
        >
          Path {{ pathLength }}
        </span>
        <span
          v-if="hoverStatusText"
          :class="[
            'hidden sm:inline text-xs font-mono font-semibold tabular-nums whitespace-nowrap',
            toneClass,
          ]"
        >
          {{ hoverStatusText }}
        </span>

        <!-- Crisp camera zoom controls -->
        <div
          role="group"
          aria-label="Map zoom controls"
          class="inline-flex items-center gap-0.5 sm:gap-1 bg-[#141921] border border-[#2C384B] rounded-md px-1 py-0.5"
        >
          <button
            type="button"
            :disabled="zoomPct <= 100"
            title="Zoom out (-)"
            aria-label="Zoom out"
            class="p-1.5 sm:p-1 text-slate-300 hover:text-white disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed"
            @click="zoomStep(-0.25)"
          >
            <ZoomOut class="w-3.5 h-3.5" />
          </button>
          <span class="font-mono text-[11px] tabular-nums text-slate-300 px-1 min-w-[36px] text-center">
            {{ zoomPct }}%
          </span>
          <button
            type="button"
            :disabled="zoomPct >= 225"
            title="Zoom in (+, mouse wheel or pinch)"
            aria-label="Zoom in"
            class="p-1.5 sm:p-1 text-slate-300 hover:text-white disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed"
            @click="zoomStep(0.25)"
          >
            <ZoomIn class="w-3.5 h-3.5" />
          </button>
          <button
            v-if="zoomPct > 100"
            type="button"
            title="Fit the board (0)"
            aria-label="Reset camera view"
            class="p-1.5 sm:p-1 text-amber-300 hover:text-amber-200 cursor-pointer border-l border-[#2C384B] pl-1.5"
            @click="resetCamera"
          >
            <Maximize2 class="w-3 h-3" />
          </button>
        </div>

        <button
          type="button"
          aria-label="Open wave & tile info"
          title="Wave & tile info"
          class="lg:hidden p-1.5 rounded-md bg-[#141921] border border-[#2C384B] text-slate-300 hover:text-white cursor-pointer"
          @click="emit('openMobileInspector')"
        >
          <Info class="w-4 h-4" />
        </button>
      </div>

      <!-- Wave progress: a thin line under the strip, so the dock keeps its height -->
      <div v-if="showCreeps" class="absolute left-0 right-0 bottom-0 h-0.5 bg-white/5" aria-hidden="true">
        <div
          class="h-full bg-emerald-500 transition-[width] duration-150"
          :style="{ width: `${creepProgress * 100}%` }"
        />
      </div>
    </div>

    <!-- Top-aligned on purpose: the dock below changes height between phases, and a
         centred board would jump under the player's finger when it does. -->
    <div class="flex-1 min-h-0 flex items-start justify-center p-1.5 sm:p-2.5 overflow-hidden">
      <div
        ref="wrapperRef"
        class="relative max-w-full max-h-full aspect-[24/16] w-full flex items-center justify-center"
      >
        <canvas
          ref="canvasRef"
          :width="CANVAS_WIDTH"
          :height="CANVAS_HEIGHT"
          :class="[
            'pixel-canvas touch-none w-full h-full object-contain rounded-md border border-[#324054] shadow-[0_12px_36px_rgba(0,0,0,0.45)] select-none',
            zoomed ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair',
          ]"
          @wheel.prevent="handleWheel"
          @mousedown="handleMouseDown"
          @mousemove="handleMouseMove"
          @mouseup="handleMouseUp"
          @mouseleave="handleMouseLeave"
          @touchstart="handleTouchStart"
          @touchmove="handleTouchMove"
          @touchend="handleTouchEnd"
          @click="handleClick"
          @contextmenu.prevent="handleContextMenu"
        />
        <slot name="overlay" :tile-rect="tileRect" />
        <div
          v-if="zoomPct > 100"
          class="pointer-events-none absolute bottom-2 right-2 px-2 py-1 rounded bg-[#0F172A]/85 border border-[#324054] font-mono text-[10px] text-slate-300"
        >
          <span class="pointer-coarse:hidden">Drag to pan · 0 fits</span>
          <span class="hidden pointer-coarse:inline">Drag to pan · pinch to zoom</span>
        </div>
      </div>
    </div>
  </div>
</template>
