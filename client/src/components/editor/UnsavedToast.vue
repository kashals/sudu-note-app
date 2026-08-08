<script setup lang="ts">
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
      <div class="flex items-center gap-2" style="color: #fbbf24;">
        <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <span class="font-mono text-xs" style="color: var(--text-primary);">Unsaved changes</span>
      </div>
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="unsaved-toast-btn"
          style="color: var(--text-secondary);"
          @click="emit('keep-editing')"
        >
          Keep Editing
        </button>
        <button
          type="button"
          class="unsaved-toast-btn"
          style="color: #f87171; border-color: rgba(239,68,68,0.35); background: rgba(239,68,68,0.07);"
          @click="emit('discard')"
        >
          Discard
        </button>
        <button
          type="button"
          class="unsaved-toast-btn"
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
  bottom: 60px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 70;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 20px;
  border-radius: 12px;
  border: 1px solid rgba(245, 158, 11, 0.35);
  background: var(--bg-raised);
  box-shadow: 0 8px 32px rgba(0,0,0,0.35), 0 0 0 1px rgba(245,158,11,0.1);
  pointer-events: all;
  user-select: none;
  white-space: nowrap;
}

.unsaved-toast-btn {
  padding: 5px 12px;
  font-size: 10px;
  font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--bg-surface);
  cursor: pointer;
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
