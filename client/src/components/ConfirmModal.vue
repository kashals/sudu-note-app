<script setup lang="ts">
import { AlertTriangle, X } from '@lucide/vue';

// component props
defineProps<{
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  isProcessing?: boolean;
}>();

// component emits
const emit = defineEmits<{
  (e: 'confirm'): void;
  (e: 'cancel'): void;
}>();
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs"
    @click.self="emit('cancel')"
  >
    <div
      class="w-full max-w-md border border-zinc-800 bg-zinc-900 p-6 shadow-2xl transition-all"
    >
      <div class="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div class="flex items-center gap-2">
          <AlertTriangle class="h-5 w-5 text-red-400" />
          <h3 class="text-base font-semibold text-zinc-100">{{ title }}</h3>
        </div>
        <button
          type="button"
          class="text-zinc-400 hover:text-zinc-100"
          @click="emit('cancel')"
        >
          <X class="h-4 w-4" />
        </button>
      </div>

      <div class="py-4 text-sm text-zinc-300">
        <p>{{ message }}</p>
      </div>

      <div class="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          class="border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-medium text-zinc-200 hover:bg-zinc-700"
          :disabled="isProcessing"
          @click="emit('cancel')"
        >
          cancel
        </button>
        <button
          type="button"
          class="border border-red-600 bg-red-600 px-4 py-2 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
          :disabled="isProcessing"
          @click="emit('confirm')"
        >
          <span v-if="isProcessing">processing...</span>
          <span v-else>{{ confirmLabel || 'delete' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
