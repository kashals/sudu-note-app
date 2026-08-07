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
    <div class="w-full max-w-md border border-zinc-800 bg-zinc-900">
      <!-- modal header -->
      <div class="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
        <div class="flex items-center gap-2.5">
          <AlertTriangle class="h-4 w-4 text-red-500 shrink-0" />
          <h3 class="text-sm font-semibold text-zinc-100">{{ title }}</h3>
        </div>
        <button
          type="button"
          class="text-zinc-600 hover:text-zinc-300 transition-colors"
          @click="emit('cancel')"
        >
          <X class="h-4 w-4" />
        </button>
      </div>

      <!-- message body -->
      <div class="px-5 py-4 text-xs text-zinc-400 leading-relaxed">
        {{ message }}
      </div>

      <!-- action row -->
      <div class="flex items-center justify-end gap-2 border-t border-zinc-800 px-5 py-4">
        <button
          type="button"
          class="border border-zinc-800 bg-zinc-900 px-4 py-2 text-xs font-medium text-zinc-400 hover:border-zinc-700 hover:text-zinc-200 disabled:opacity-40 transition-colors"
          :disabled="isProcessing"
          @click="emit('cancel')"
        >
          cancel
        </button>
        <button
          type="button"
          class="border border-red-900 bg-red-950/20 px-4 py-2 text-xs font-medium text-red-400 hover:border-red-700 hover:bg-red-950/40 hover:text-red-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          :disabled="isProcessing"
          @click="emit('confirm')"
        >
          <span v-if="isProcessing" class="font-mono">processing...</span>
          <span v-else>{{ confirmLabel || 'delete' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
