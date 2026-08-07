<script setup lang="ts">
import { ref } from 'vue';
import { Edit2, Trash2, Clock, ChevronDown, ChevronUp } from '@lucide/vue';
import type { Note } from '../types/note';

// component props
const props = defineProps<{
  note: Note;
  viewMode?: 'grid' | 'list';
}>();

// component emits
const emit = defineEmits<{
  (e: 'edit', note: Note): void;
  (e: 'delete', note: Note): void;
}>();

const isExpanded = ref(false);

// format timestamp
function formatDate(isoString: string): string {
  try {
    return new Date(isoString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return isoString;
  }
}
</script>

<template>
  <!-- list row -->
  <div
    v-if="viewMode === 'list'"
    class="group flex items-center justify-between gap-4 px-5 py-3.5 border transition-all duration-200 cursor-default"
    style="background: var(--bg-surface); border-color: var(--border);"
    @mouseover="($el as HTMLElement).style.borderColor = 'var(--accent)'"
    @mouseleave="($el as HTMLElement).style.borderColor = 'var(--border)'"
  >
    <div class="flex items-center gap-4 min-w-0 flex-1">
      <h4 class="text-sm font-medium truncate" style="color: var(--text-primary);">
        {{ note.title }}
      </h4>
      <p class="hidden sm:block text-xs truncate flex-1" style="color: var(--text-muted);">
        {{ note.content }}
      </p>
    </div>

    <div class="flex items-center gap-4 shrink-0">
      <span class="hidden md:block font-mono text-[11px]" style="color: var(--text-muted);">
        {{ formatDate(note.updated_at) }}
      </span>
      <div class="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <button
          type="button"
          class="p-1.5 transition-colors"
          style="color: var(--text-muted);"
          title="Edit Note"
          @mouseover="($el as HTMLElement).style.color = 'var(--accent)'"
          @mouseleave="($el as HTMLElement).style.color = 'var(--text-muted)'"
          @click="emit('edit', note)"
        >
          <Edit2 class="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          class="p-1.5 transition-colors"
          style="color: var(--text-muted);"
          title="Delete Note"
          @mouseover="($el as HTMLElement).style.color = '#f87171'"
          @mouseleave="($el as HTMLElement).style.color = 'var(--text-muted)'"
          @click="emit('delete', note)"
        >
          <Trash2 class="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  </div>

  <!-- grid card -->
  <div
    v-else
    class="group flex flex-col justify-between border transition-all duration-200 p-5 cursor-default h-[180px]"
    style="background: var(--bg-surface); border-color: var(--border);"
    @mouseover="($el as HTMLElement).style.borderColor = 'var(--accent)'"
    @mouseleave="($el as HTMLElement).style.borderColor = 'var(--border)'"
  >
    <!-- card header -->
    <div class="min-w-0">
      <div
        class="flex items-center justify-between gap-3 pb-3 border-b min-w-0"
        style="border-color: var(--border-subtle);"
      >
        <h4 class="text-sm font-bold truncate flex-1 transition-colors" style="color: var(--text-primary);">
          {{ note.title }}
        </h4>
        <div class="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shrink-0">
          <button
            type="button"
            class="p-1 transition-colors"
            style="color: var(--text-muted);"
            title="Edit Note"
            @mouseover="($el as HTMLElement).style.color = 'var(--accent)'"
            @mouseleave="($el as HTMLElement).style.color = 'var(--text-muted)'"
            @click="emit('edit', note)"
          >
            <Edit2 class="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            class="p-1 transition-colors"
            style="color: var(--text-muted);"
            title="Delete Note"
            @mouseover="($el as HTMLElement).style.color = '#f87171'"
            @mouseleave="($el as HTMLElement).style.color = 'var(--text-muted)'"
            @click="emit('delete', note)"
          >
            <Trash2 class="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <!-- content -->
      <div class="pt-3 text-xs leading-relaxed" style="color: var(--text-secondary);">
        <p class="line-clamp-3 break-words">{{ note.content }}</p>
      </div>
    </div>

    <!-- card footer -->
    <div
      class="mt-3 flex items-center gap-1.5 pt-2 border-t"
      style="border-color: var(--border-subtle);"
    >
      <Clock class="h-3 w-3" style="color: var(--text-muted);" />
      <span class="font-mono text-[11px]" style="color: var(--text-muted);">
        {{ formatDate(note.updated_at) }}
      </span>
    </div>
  </div>
</template>
