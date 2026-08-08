<script setup lang="ts">
import { AlertTriangle } from '@lucide/vue';

defineProps<{
  show: boolean;
  isValid: boolean;
}>();

const emit = defineEmits<{
  (e: 'keep-editing'): void;
  (e: 'discard'): void;
  (e: 'save-and-close'): void;
}>();
</script>

<template>
  <Transition name="warn-toast">
    <div v-if="show" class="unsaved-toast">
      <div class="flex items-center justify-center gap-2 py-0.5 select-none text-center">
        <AlertTriangle class="w-4 h-4 shrink-0 text-amber-400 stroke-[2.5]" />
        <span class="font-mono text-xs font-semibold tracking-tight" style="color: var(--text-primary);">Unsaved changes</span>
      </div>
      
      <div class="flex items-center justify-center gap-2 w-full pt-0.5">
        <button
          type="button"
          class="unsaved-toast-btn flex-1 sm:flex-initial"
          style="color: var(--text-secondary);"
          @click="emit('keep-editing')"
        >
          Keep Editing
        </button>
        <button
          type="button"
          class="unsaved-toast-btn flex-1 sm:flex-initial"
          style="color: #f87171; border-color: rgba(239,68,68,0.35); background: rgba(239,68,68,0.07);"
          @click="emit('discard')"
        >
          Discard
        </button>
        <button
          type="button"
          class="unsaved-toast-btn flex-1 sm:flex-initial"
          style="color: var(--accent-light); border-color: var(--accent); background: var(--accent-glow);"
          :disabled="!isValid"
          @click="emit('save-and-close')"
        >
          Save &amp; Close
        </button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.unsaved-toast {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 70;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: min(calc(100vw - 32px), 420px);
  padding: 14px 16px;
  border-radius: 16px;
  border: 1px solid rgba(245, 158, 11, 0.3);
  background: var(--bg-surface);
  box-shadow: 0 16px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(245,158,11,0.15);
  pointer-events: all;
  user-select: none;
}

@media (min-width: 640px) {
  .unsaved-toast {
    bottom: 48px;
    flex-direction: row;
    width: auto;
    max-width: none;
    padding: 10px 20px;
    gap: 16px;
    border-radius: 9999px;
  }
}

.unsaved-toast-btn {
  padding: 6px 12px;
  font-size: 11px;
  font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--bg-raised);
  cursor: pointer;
  white-space: nowrap;
  text-align: center;
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.unsaved-toast-btn:hover {
  opacity: 0.85;
  transform: translateY(-1px);
}

.unsaved-toast-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
}

.warn-toast-enter-active,
.warn-toast-leave-active {
  transition: all 0.25s cubic-bezier(0.19, 1, 0.22, 1);
}
.warn-toast-enter-from,
.warn-toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(16px);
}
.warn-toast-enter-to,
.warn-toast-leave-from {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}
</style>
