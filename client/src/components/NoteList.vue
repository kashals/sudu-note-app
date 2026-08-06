<script setup lang="ts">
import { ref, computed } from 'vue';
import { Search, Grid, List, FileText, Plus, RefreshCw } from '@lucide/vue';
import type { Note } from '../types/note';
import NoteCard from './NoteCard.vue';

// component props
const props = defineProps<{
  notes: Note[];
  isLoading?: boolean;
}>();

// component emits
const emit = defineEmits<{
  (e: 'create'): void;
  (e: 'edit', note: Note): void;
  (e: 'delete', note: Note): void;
  (e: 'refresh'): void;
}>();

const searchQuery = ref('');
const viewMode = ref<'grid' | 'list'>('grid');

// filtered notes list
const filteredNotes = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  if (!query) return props.notes;
  return props.notes.filter(
    (note) =>
      note.title.toLowerCase().includes(query) ||
      note.content.toLowerCase().includes(query)
  );
});
</script>

<template>
  <div class="space-y-6">
    <!-- list filter controls -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <!-- search bar -->
      <div class="relative flex-1 max-w-md">
        <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="search notes by title or content..."
          class="w-full border border-zinc-800 bg-zinc-900/90 pl-9 pr-4 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:border-zinc-600 focus:outline-none"
        />
        <button
          v-if="searchQuery"
          type="button"
          class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500 hover:text-zinc-300"
          @click="searchQuery = ''"
        >
          clear
        </button>
      </div>

      <!-- control actions -->
      <div class="flex items-center gap-3">
        <!-- refresh button -->
        <button
          type="button"
          class="border border-zinc-800 bg-zinc-900 p-2 text-zinc-400 hover:border-zinc-700 hover:text-zinc-100"
          title="refresh notes"
          @click="emit('refresh')"
        >
          <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': isLoading }" />
        </button>

        <!-- view mode toggle -->
        <div class="flex border border-zinc-800 bg-zinc-900">
          <button
            type="button"
            class="p-2 text-xs"
            :class="viewMode === 'grid' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'"
            title="grid view"
            @click="viewMode = 'grid'"
          >
            <Grid class="h-4 w-4" />
          </button>
          <button
            type="button"
            class="p-2 text-xs"
            :class="viewMode === 'list' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'"
            title="list view"
            @click="viewMode = 'list'"
          >
            <List class="h-4 w-4" />
          </button>
        </div>

        <!-- create note button -->
        <button
          type="button"
          class="flex items-center gap-2 border border-zinc-100 bg-zinc-100 px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-zinc-200"
          @click="emit('create')"
        >
          <Plus class="h-4 w-4" />
          <span>new note</span>
        </button>
      </div>
    </div>

    <!-- loading skeleton state -->
    <div v-if="isLoading && notes.length === 0" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div v-for="i in 6" :key="i" class="h-44 border border-zinc-800 bg-zinc-900/50 p-5 animate-pulse">
        <div class="h-4 w-2/3 bg-zinc-800"></div>
        <div class="mt-4 space-y-2">
          <div class="h-3 w-full bg-zinc-800/80"></div>
          <div class="h-3 w-4/5 bg-zinc-800/80"></div>
        </div>
      </div>
    </div>

    <!-- empty state -->
    <div
      v-else-if="filteredNotes.length === 0"
      class="flex flex-col items-center justify-center border border-dashed border-zinc-800 bg-zinc-900/40 py-16 text-center"
    >
      <FileText class="h-10 w-10 text-zinc-600" />
      <h3 class="mt-3 text-sm font-medium text-zinc-200">
        {{ searchQuery ? 'no matching notes found' : 'no notes recorded yet' }}
      </h3>
      <p class="mt-1 text-xs text-zinc-500">
        {{ searchQuery ? 'try refining your search term.' : 'get started by creating your first note.' }}
      </p>
      <button
        v-if="!searchQuery"
        type="button"
        class="mt-4 border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-medium text-zinc-200 hover:bg-zinc-700"
        @click="emit('create')"
      >
        create note
      </button>
    </div>

    <!-- notes list display -->
    <div
      v-else
      :class="
        viewMode === 'grid'
          ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3'
          : 'flex flex-col gap-3'
      "
    >
      <NoteCard
        v-for="note in filteredNotes"
        :key="note.id"
        :note="note"
        @edit="emit('edit', $event)"
        @delete="emit('delete', $event)"
      />
    </div>
  </div>
</template>
