<script setup lang="ts">
import { HelpCircle, X } from '@lucide/vue';

defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();
</script>

<template>
  <Transition name="fade-editor">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-[80] flex items-center justify-center p-4 select-none"
      style="background: rgba(0,0,0,0.65); backdrop-filter: blur(4px);"
      @click.self="emit('close')"
    >
      <div
        class="w-full max-w-md border rounded-xl shadow-2xl p-6 space-y-4 animate-scale-in"
        style="background: var(--bg-surface); border-color: var(--border);"
      >
        <div class="flex items-center justify-between border-b pb-3" style="border-color: var(--border-subtle);">
          <div class="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider" style="color: var(--text-primary);">
            <HelpCircle class="w-4 h-4" style="color: var(--accent);" />
            Keyboard Shortcuts
          </div>
          <button
            type="button"
            class="p-1 border rounded transition-colors"
            style="background: var(--bg-raised); border-color: var(--border); color: var(--text-muted);"
            @click="emit('close')"
          >
            <X class="w-3.5 h-3.5" />
          </button>
        </div>

        <div class="grid grid-cols-1 gap-1.5 font-mono text-xs">
          <div class="flex items-center justify-between py-1.5 border-b" style="border-color: var(--border-subtle);">
            <span style="color: var(--text-secondary);">Undo</span>
            <kbd class="px-2 py-0.5 border rounded text-[10px]" style="background: var(--bg-raised); border-color: var(--border); color: var(--text-primary);">Ctrl + Z</kbd>
          </div>
          <div class="flex items-center justify-between py-1.5 border-b" style="border-color: var(--border-subtle);">
            <span style="color: var(--text-secondary);">Redo</span>
            <kbd class="px-2 py-0.5 border rounded text-[10px]" style="background: var(--bg-raised); border-color: var(--border); color: var(--text-primary);">Ctrl + Y</kbd>
          </div>
          <div class="flex items-center justify-between py-1.5 border-b" style="border-color: var(--border-subtle);">
            <span style="color: var(--text-secondary);">Bold Text</span>
            <kbd class="px-2 py-0.5 border rounded text-[10px]" style="background: var(--bg-raised); border-color: var(--border); color: var(--text-primary);">Ctrl + B</kbd>
          </div>
          <div class="flex items-center justify-between py-1.5 border-b" style="border-color: var(--border-subtle);">
            <span style="color: var(--text-secondary);">Italic Text</span>
            <kbd class="px-2 py-0.5 border rounded text-[10px]" style="background: var(--bg-raised); border-color: var(--border); color: var(--text-primary);">Ctrl + I</kbd>
          </div>
          <div class="flex items-center justify-between py-1.5 border-b" style="border-color: var(--border-subtle);">
            <span style="color: var(--text-secondary);">Underline Text</span>
            <kbd class="px-2 py-0.5 border rounded text-[10px]" style="background: var(--bg-raised); border-color: var(--border); color: var(--text-primary);">Ctrl + U</kbd>
          </div>
          <div class="flex items-center justify-between py-1.5 border-b" style="border-color: var(--border-subtle);">
            <span style="color: var(--text-secondary);">Save &amp; Close</span>
            <kbd class="px-2 py-0.5 border rounded text-[10px]" style="background: var(--bg-raised); border-color: var(--border); color: var(--text-primary);">Ctrl + Enter</kbd>
          </div>
          <div class="flex items-center justify-between py-1.5" style="border-color: var(--border-subtle);">
            <span style="color: var(--text-secondary);">Exit / Back</span>
            <kbd class="px-2 py-0.5 border rounded text-[10px]" style="background: var(--bg-raised); border-color: var(--border); color: var(--text-primary);">Esc</kbd>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>
