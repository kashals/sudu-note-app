<script setup lang="ts">
import {
  Undo, Redo, Bold, Italic, Underline, AlignLeft,
  AlignCenter, AlignRight, AlignJustify, Outdent, Indent,
  List, ListOrdered, CheckSquare, Quote
} from '@lucide/vue';
import type { ActiveFormats } from '../../composables/useEditor';

defineProps<{
  activeFormats: ActiveFormats;
}>();

const emit = defineEmits<{
  (e: 'format', command: string, value?: string): void;
  (e: 'insert-checkbox'): void;
}>();
</script>

<template>
  <div class="flex justify-center py-2 shrink-0 border-b select-none z-10 relative" style="background: var(--bg-surface); border-color: var(--border-subtle);">
    <div class="flex items-center gap-1.5 px-4 py-1.5 rounded-full border shadow-sm animate-scale-in" style="background: var(--bg-raised); border-color: var(--border);">
      <!-- Undo & Redo -->
      <button type="button" class="ribbon-btn" title="Undo (Ctrl+Z)" @click="emit('format', 'undo')">
        <Undo class="w-3.5 h-3.5" />
      </button>
      <button type="button" class="ribbon-btn" title="Redo (Ctrl+Y)" @click="emit('format', 'redo')">
        <Redo class="w-3.5 h-3.5" />
      </button>

      <div class="ribbon-separator"></div>

      <!-- Font Styles -->
      <button type="button" class="ribbon-btn" :class="{ 'active': activeFormats.bold }" title="Bold (Ctrl+B)" @click="emit('format', 'bold')">
        <Bold class="w-3.5 h-3.5" />
      </button>
      <button type="button" class="ribbon-btn" :class="{ 'active': activeFormats.italic }" title="Italic (Ctrl+I)" @click="emit('format', 'italic')">
        <Italic class="w-3.5 h-3.5" />
      </button>
      <button type="button" class="ribbon-btn" :class="{ 'active': activeFormats.underline }" title="Underline (Ctrl+U)" @click="emit('format', 'underline')">
        <Underline class="w-3.5 h-3.5" />
      </button>

      <div class="ribbon-separator"></div>

      <!-- Headings -->
      <button type="button" class="ribbon-btn font-bold font-mono text-[10px]" :class="{ 'active': activeFormats.h1 }" title="Heading 1" @click="emit('format', 'formatBlock', 'H1')">H1</button>
      <button type="button" class="ribbon-btn font-bold font-mono text-[10px]" :class="{ 'active': activeFormats.h2 }" title="Heading 2" @click="emit('format', 'formatBlock', 'H2')">H2</button>
      <button type="button" class="ribbon-btn font-bold font-mono text-[10px]" :class="{ 'active': activeFormats.h3 }" title="Heading 3" @click="emit('format', 'formatBlock', 'H3')">H3</button>

      <div class="ribbon-separator"></div>

      <!-- Alignments -->
      <button type="button" class="ribbon-btn" :class="{ 'active': activeFormats.alignLeft }" title="Align Left" @click="emit('format', 'justifyLeft')">
        <AlignLeft class="w-3.5 h-3.5" />
      </button>
      <button type="button" class="ribbon-btn" :class="{ 'active': activeFormats.alignCenter }" title="Align Center" @click="emit('format', 'justifyCenter')">
        <AlignCenter class="w-3.5 h-3.5" />
      </button>
      <button type="button" class="ribbon-btn" :class="{ 'active': activeFormats.alignRight }" title="Align Right" @click="emit('format', 'justifyRight')">
        <AlignRight class="w-3.5 h-3.5" />
      </button>
      <button type="button" class="ribbon-btn" :class="{ 'active': activeFormats.alignJustify }" title="Align Justify" @click="emit('format', 'justifyFull')">
        <AlignJustify class="w-3.5 h-3.5" />
      </button>

      <div class="ribbon-separator"></div>

      <!-- Indents -->
      <button type="button" class="ribbon-btn" title="Outdent" @click="emit('format', 'outdent')">
        <Outdent class="w-3.5 h-3.5" />
      </button>
      <button type="button" class="ribbon-btn" title="Indent" @click="emit('format', 'indent')">
        <Indent class="w-3.5 h-3.5" />
      </button>

      <div class="ribbon-separator"></div>

      <!-- Lists & Blocks -->
      <button type="button" class="ribbon-btn" :class="{ 'active': activeFormats.list }" title="Bullet List" @click="emit('format', 'insertUnorderedList')">
        <List class="w-3.5 h-3.5" />
      </button>
      <button type="button" class="ribbon-btn" :class="{ 'active': activeFormats.listOrdered }" title="Numbered List" @click="emit('format', 'insertOrderedList')">
        <ListOrdered class="w-3.5 h-3.5" />
      </button>
      <button type="button" class="ribbon-btn" title="Checklist" @click="emit('insert-checkbox')">
        <CheckSquare class="w-3.5 h-3.5" />
      </button>
      <button type="button" class="ribbon-btn" :class="{ 'active': activeFormats.quote }" title="Blockquote" @click="emit('format', 'formatBlock', 'blockquote')">
        <Quote class="w-3.5 h-3.5" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.ribbon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: transparent;
  border: 1px solid transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.19, 1, 0.22, 1);
}
.ribbon-btn:hover {
  background-color: var(--bg-surface);
  border-color: var(--border);
  color: var(--text-primary);
  transform: translateY(-1px);
}
.ribbon-btn:active, .ribbon-btn.active {
  background-color: var(--accent-glow);
  border-color: var(--accent);
  color: var(--accent);
  transform: translateY(0);
}

.ribbon-separator {
  width: 1px;
  height: 16px;
  background-color: var(--border);
  margin: 0 5px;
}
</style>
