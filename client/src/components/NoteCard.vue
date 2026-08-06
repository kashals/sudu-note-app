<script setup lang="ts">
import { ref } from 'vue';
import { Edit2, Trash2, Clock, ChevronDown, ChevronUp } from '@lucide/vue';
import type { Note } from '../types/note';

// component props
const props = defineProps<{
  note: Note;
}>();

// component emits
const emit = defineEmits<{
  (e: 'edit', note: Note): void;
  (e: 'delete', note: Note): void;
}>();

const isExpanded = ref(false);

// format date string
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
  <div
    class="group flex flex-col justify-between border border-zinc-800 bg-zinc-900/80 p-5 transition-colors hover:border-zinc-700"
  >
    <div>
      <!-- note header -->
      <div class="flex items-start justify-between gap-3 pb-3">
        <h4 class="text-sm font-semibold text-zinc-100 line-clamp-1 group-hover:text-white">
          {{ note.title }}
        </h4>
        <div class="flex items-center gap-1 opacity-80 group-hover:opacity-100">
          <button
            type="button"
            class="p-1 text-zinc-400 hover:text-zinc-100"
            title="edit note"
            @click="emit('edit', note)"
          >
            <Edit2 class="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            class="p-1 text-zinc-400 hover:text-red-400"
            title="delete note"
            @click="emit('delete', note)"
          >
            <Trash2 class="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <!-- note content snippet -->
      <div class="py-2 text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed">
        <p :class="{ 'line-clamp-4': !isExpanded }">
          {{ note.content }}
        </p>
        <button
          v-if="note.content.length > 180"
          type="button"
          class="mt-2 flex items-center gap-1 text-[11px] font-medium text-zinc-400 hover:text-zinc-200"
          @click="isExpanded = !isExpanded"
        >
          <span>{{ isExpanded ? 'show less' : 'read more' }}</span>
          <ChevronUp v-if="isExpanded" class="h-3 w-3" />
          <ChevronDown v-else class="h-3 w-3" />
        </button>
      </div>
    </div>

    <!-- note metadata footer -->
    <div class="mt-4 flex items-center justify-between border-t border-zinc-800/80 pt-3 text-[11px] text-zinc-500">
      <div class="flex items-center gap-1">
        <Clock class="h-3 w-3" />
        <span>{{ formatDate(note.updated_at) }}</span>
      </div>
    </div>
  </div>
</template>
