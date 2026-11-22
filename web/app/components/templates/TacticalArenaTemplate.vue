<script setup lang="ts">
withDefaults(
  defineProps<{
    mobileInspectorOpen?: boolean;
  }>(),
  { mobileInspectorOpen: false }
);

const emit = defineEmits<{
  closeMobileInspector: [];
}>();
</script>

<template>
  <div class="h-[100dvh] w-screen overflow-hidden flex flex-col bg-[#161B22] text-slate-100">
    <slot name="hud" />

    <div class="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_276px] overflow-hidden relative">
      <main class="min-w-0 min-h-0 h-full overflow-hidden"><slot name="stage" /></main>
      <div class="hidden lg:block min-h-0 h-full overflow-hidden"><slot name="inspector" /></div>

      <!-- Mobile / tablet bottom-sheet inspector -->
      <div v-if="mobileInspectorOpen" class="lg:hidden fixed inset-0 z-40 flex flex-col justify-end">
        <button
          type="button"
          aria-label="Close inspector"
          class="flex-1 bg-black/55 backdrop-blur-[1px]"
          @click="emit('closeMobileInspector')"
        />
        <div
          class="max-h-[72dvh] bg-[#1C2430] border-t border-[#3A4D66] rounded-t-2xl shadow-2xl overflow-hidden flex flex-col"
        >
          <div class="flex justify-center pt-2 pb-1 shrink-0">
            <span class="w-10 h-1 rounded-full bg-slate-600" aria-hidden="true" />
          </div>
          <div class="flex-1 min-h-0 overflow-y-auto"><slot name="inspector" /></div>
        </div>
      </div>
    </div>

    <slot name="dock" />
    <slot name="modal" />
  </div>
</template>
