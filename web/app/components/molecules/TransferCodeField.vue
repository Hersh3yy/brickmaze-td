<script setup lang="ts">
import { ref } from 'vue';
import { Check, Copy, Download } from '@lucide/vue';

const props = defineProps<{
  transferCode: string;
  importCode: (code: string) => Promise<{ ok: boolean; error?: string }>;
}>();

const copied = ref(false);
const importInput = ref('');
const status = ref<{ kind: 'idle' | 'success' | 'error'; message: string }>({
  kind: 'idle',
  message: '',
});

async function handleCopy() {
  try {
    await navigator.clipboard.writeText(props.transferCode);
    copied.value = true;
    track('profile-transfer', { action: 'export' });
    setTimeout(() => {
      copied.value = false;
    }, 1800);
  } catch {
    status.value = { kind: 'error', message: 'Select and copy the code manually.' };
  }
}

async function handleImportSubmit() {
  if (!importInput.value.trim()) return;
  const res = await props.importCode(importInput.value);
  if (res.ok) {
    track('profile-transfer', { action: 'import' });
    status.value = { kind: 'success', message: 'Profile loaded and saved to this browser.' };
    importInput.value = '';
  } else {
    status.value = { kind: 'error', message: res.error ?? 'Invalid transfer code.' };
  }
}

function handleImportInput() {
  if (status.value.kind !== 'idle') status.value = { kind: 'idle', message: '' };
}

function selectAll(e: FocusEvent) {
  (e.currentTarget as HTMLInputElement).select();
}
</script>

<template>
  <div class="space-y-4">
    <div>
      <label class="block text-xs font-medium text-slate-300 mb-1.5">
        Your Portable Transfer Code
      </label>
      <div class="flex items-center gap-2">
        <input
          type="text"
          readonly
          :value="transferCode"
          aria-label="Your profile transfer code"
          class="flex-1 min-w-0 bg-[#141920] border border-[#324054] rounded-md px-3 py-2 font-mono text-xs text-amber-200 focus:outline-none focus:border-amber-400"
          @focus="selectAll"
        />
        <TactileButton variant="secondary" size="sm" @click="handleCopy">
          <Check v-if="copied" class="w-3.5 h-3.5 text-emerald-400" />
          <Copy v-else class="w-3.5 h-3.5" />
          <span>{{ copied ? 'Copied' : 'Copy Code' }}</span>
        </TactileButton>
      </div>
      <p class="text-[11px] text-slate-400 mt-1.5">
        Save this string to carry your rank, stats, and board themes to another browser or device without an account.
      </p>
    </div>

    <form class="pt-3 border-t border-[#2D3A4D]" @submit.prevent="handleImportSubmit">
      <label for="import-code-input" class="block text-xs font-medium text-slate-300 mb-1.5">
        Load Profile From Another Device
      </label>
      <div class="flex items-center gap-2">
        <input
          id="import-code-input"
          v-model="importInput"
          type="text"
          placeholder="Paste BM1-XXXX-... code here"
          class="flex-1 min-w-0 bg-[#141920] border border-[#324054] rounded-md px-3 py-2 font-mono text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
          @input="handleImportInput"
        />
        <TactileButton variant="amber" size="sm" type="submit" :disabled="!importInput.trim()">
          <Download class="w-3.5 h-3.5" />
          <span>Load</span>
        </TactileButton>
      </div>
      <p
        v-if="status.kind !== 'idle'"
        :class="['text-xs mt-1.5', status.kind === 'success' ? 'text-emerald-400' : 'text-rose-400']"
      >
        {{ status.message }}
      </p>
    </form>
  </div>
</template>
