<script setup lang="ts">
import { X } from '@lucide/vue';

// Every keyboard shortcut in one place. Opened with "?" or the keyboard button in the HUD.

const emit = defineEmits<{ close: [] }>();

const GROUPS: { title: string; keys: { keys: string[]; what: string }[] }[] = [
  {
    title: 'Bricks',
    keys: [
      { keys: ['Click'], what: 'Place the next brick' },
      { keys: ['R'], what: 'Reroll the 4 bricks (before placing)' },
      { keys: ['Z'], what: 'Undo the last brick' },
      { keys: ['1', '–', '4'], what: 'Look at one of your 4 bricks' },
      { keys: ['Enter'], what: 'Keep it' },
      { keys: ['Q', 'W', 'E'], what: 'Fuse it with the lettered brick' },
    ],
  },
  {
    title: 'Towers',
    keys: [
      { keys: ['1', '–', '4'], what: 'Build on the selected brick' },
      { keys: ['U'], what: 'Upgrade the selected tower' },
      { keys: ['M'], what: 'Move it (between waves, free)' },
      { keys: ['S', 'S'], what: 'Sell it (press twice)' },
      { keys: ['Del'], what: 'Remove a gray wall (10g)' },
    ],
  },
  {
    title: 'Game',
    keys: [
      { keys: ['Space'], what: 'Send the next wave' },
      { keys: ['+', '−'], what: 'Zoom in and out' },
      { keys: ['0'], what: 'Fit the board' },
      { keys: ['Esc'], what: 'Cancel or close' },
      { keys: ['?'], what: 'Show this list' },
    ],
  },
];
</script>

<template>
  <div
    role="dialog"
    aria-modal="true"
    aria-labelledby="shortcut-sheet-title"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4"
    @click.self="emit('close')"
  >
    <div class="w-full max-w-2xl rounded-lg bg-[#1D2531] border border-[#3A4D66] shadow-2xl">
      <div class="flex items-center justify-between px-5 py-3 border-b border-[#2D3A4D]">
        <h2 id="shortcut-sheet-title" class="text-base font-bold text-slate-100">Keyboard shortcuts</h2>
        <button
          type="button"
          aria-label="Close"
          class="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
          @click="emit('close')"
        >
          <X class="w-4 h-4" />
        </button>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-5 p-5">
        <section v-for="group in GROUPS" :key="group.title" class="space-y-2">
          <h3 class="text-xs font-semibold text-amber-300">{{ group.title }}</h3>
          <dl class="space-y-1.5">
            <div v-for="row in group.keys" :key="row.what" class="flex items-start gap-2 text-xs">
              <dt class="flex items-center gap-0.5 shrink-0 min-w-[64px]">
                <kbd
                  v-for="(k, i) in row.keys"
                  :key="i"
                  :class="
                    k === '–'
                      ? 'text-slate-500 px-0.5'
                      : 'font-mono text-[11px] text-slate-100 bg-[#141A22] border border-[#3A4D66] rounded px-1.5 py-px'
                  "
                >{{ k }}</kbd>
              </dt>
              <dd class="text-slate-300 leading-snug">{{ row.what }}</dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  </div>
</template>
