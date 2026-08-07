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
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
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
  <!-- list mode layout -->
  <div
    v-if="viewMode === 'list'"
    class="group flex items-center justify-between gap-4 border border-zinc-800 bg-zinc-900/60 px-5 py-3.5 hover:border-zinc-700 hover:bg-zinc-900 transition-colors"
  >
    <div class="flex items-center gap-4 min-w-0 flex-1">
      <h4 class="text-sm font-medium text-zinc-100 truncate group-hover:text-white transition-colors">
        {{ note.title }}
      </h4>
      <p class="hidden sm:block text-xs text-zinc-500 truncate flex-1">
        {{ note.content }}
      </p>
    </div>

    <div class="flex items-center gap-4 shrink-0">
      <span class="hidden md:block font-mono text-[11px] text-zinc-600">
        {{ formatDate(note.updated_at) }}
      </span>
      <div class="flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          class="p-1.5 text-zinc-400 hover:text-zinc-100 transition-colors"
          title="edit note"
          @click="emit('edit', note)"
        >
          <Edit2 class="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          class="p-1.5 text-zinc-400 hover:text-red-400 transition-colors"
          title="delete note"
          @click="emit('delete', note)"
        >
          <Trash2 class="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  </div>

  <!-- grid mode layout (default) -->
  <div
    v-else
    class="group flex flex-col justify-between border border-zinc-800 bg-zinc-900/60 p-5 hover:border-zinc-700 hover:bg-zinc-900 transition-colors"
  >
    <div>
      <!-- card header -->
      <div class="flex items-start justify-between gap-3 pb-3 border-b border-zinc-800/60">
        <h4 class="text-sm font-semibold text-zinc-100 line-clamp-1 group-hover:text-white transition-colors">
          {{ note.title }}
        </h4>
        <div class="flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            type="button"
            class="p-1 text-zinc-400 hover:text-zinc-100 transition-colors"
            title="edit note"
            @click="emit('edit', note)"
          >
            <Edit2 class="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            class="p-1 text-zinc-400 hover:text-red-400 transition-colors"
            title="delete note"
            @click="emit('delete', note)"
          >
            <Trash2 class="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <!-- content snippet -->
      <div class="pt-3 text-xs text-zinc-400 whitespace-pre-wrap leading-relaxed">
        <p :class="{ 'line-clamp-4': !isExpanded }">{{ note.content }}</p>
        <button
          v-if="note.content.length > 180"
          type="button"
          class="mt-2 flex items-center gap-1 font-mono text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors"
          @click="isExpanded = !isExpanded"
        >
          <span>{{ isExpanded ? 'collapse' : 'expand' }}</span>
          <ChevronUp v-if="isExpanded" class="h-3 w-3" />
          <ChevronDown v-else class="h-3 w-3" />
        </button>
      </div>
    </div>

    <!-- card footer -->
    <div class="mt-4 flex items-center gap-1.5 pt-3 border-t border-zinc-800/60">
      <Clock class="h-3 w-3 text-zinc-700" />
      <span class="font-mono text-[11px] text-zinc-600">{{ formatDate(note.updated_at) }}</span>
    </div>
  </div>
</template>
