<script setup lang="ts">
import { AlertTriangle, X } from '@lucide/vue';
import PushButton from './PushButton.vue';

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
  <Transition
    enter-active-class="transition-opacity duration-200"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition-opacity duration-150"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="isOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      style="background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);"
      @click.self="emit('cancel')"
    >
      <div
        class="animate-scale-in w-full max-w-md border"
        style="background: var(--bg-surface); border-color: var(--border);"
      >
        <!-- header -->
        <div class="flex items-center justify-between border-b px-5 py-4" style="border-color: var(--border);">
          <div class="flex items-center gap-2.5">
            <AlertTriangle class="h-4 w-4 shrink-0" style="color: #f87171;" />
            <h3 class="text-sm font-semibold" style="color: var(--text-primary);">{{ title }}</h3>
          </div>
          <button
            type="button"
            class="transition-colors"
            style="color: var(--text-muted);"
            @click="emit('cancel')"
          >
            <X class="h-4 w-4" />
          </button>
        </div>

        <!-- message -->
        <div class="px-5 py-4 text-xs leading-relaxed" style="color: var(--text-secondary);">
          {{ message }}
        </div>

        <!-- actions -->
        <div
          class="flex items-center justify-end gap-2 border-t px-5 py-4"
          style="border-color: var(--border);"
        >
          <button
            type="button"
            class="px-4 py-2 text-xs font-medium border transition-colors disabled:opacity-40"
            style="background: var(--bg-raised); border-color: var(--border); color: var(--text-secondary);"
            :disabled="isProcessing"
            @click="emit('cancel')"
          >
            Cancel
          </button>
          <PushButton
            variant="danger"
            :disabled="isProcessing"
            @click="emit('confirm')"
          >
            <span v-if="isProcessing" class="font-mono">Processing...</span>
            <span v-else>{{ confirmLabel || 'Delete' }}</span>
          </PushButton>
        </div>
      </div>
    </div>
  </Transition>
</template>
