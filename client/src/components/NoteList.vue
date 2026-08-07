<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
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

// storage key
const VIEW_MODE_KEY = 'sudu_note_view_mode';

// search state — searchInput drives the debounced searchQuery
const searchInput = ref('');
const searchQuery = ref('');
const viewMode = ref<'grid' | 'list'>('grid');

// debounce timer ref
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

// debounced search update
watch(searchInput, (val) => {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    searchQuery.value = val;
  }, 250);
});

// persist view mode
watch(viewMode, (val) => {
  localStorage.setItem(VIEW_MODE_KEY, val);
});

// clear search immediately
function clearSearch() {
  if (debounceTimer) clearTimeout(debounceTimer);
  searchInput.value = '';
  searchQuery.value = '';
}

// load persisted view mode on mount
onMounted(() => {
  const saved = localStorage.getItem(VIEW_MODE_KEY);
  if (saved === 'grid' || saved === 'list') {
    viewMode.value = saved;
  }
});

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
  <div class="space-y-5">
    <!-- toolbar row -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <!-- search bar -->
      <div class="relative flex-1 max-w-sm">
        <Search class="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
        <input
          v-model="searchInput"
          type="text"
          placeholder="search notes..."
          class="w-full border border-zinc-800 bg-zinc-950 pl-9 pr-8 py-2 text-xs text-zinc-200 placeholder-zinc-700 focus:border-zinc-700 focus:outline-none transition-colors font-mono"
        />
        <button
          v-if="searchInput"
          type="button"
          class="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-zinc-600 hover:text-zinc-300 transition-colors"
          @click="clearSearch"
        >
          esc
        </button>
      </div>

      <!-- actions -->
      <div class="flex items-center gap-2">
        <!-- refresh -->
        <button
          type="button"
          class="border border-zinc-800 bg-zinc-900 p-2 text-zinc-500 hover:border-zinc-700 hover:text-zinc-200 transition-colors"
          title="refresh"
          @click="emit('refresh')"
        >
          <RefreshCw class="h-3.5 w-3.5" :class="{ 'animate-spin': isLoading }" />
        </button>

        <!-- view mode toggle -->
        <div class="flex border border-zinc-800">
          <button
            type="button"
            class="p-2 transition-colors"
            :class="viewMode === 'grid' ? 'bg-zinc-800 text-zinc-100' : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300'"
            title="grid view"
            @click="viewMode = 'grid'"
          >
            <Grid class="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            class="p-2 transition-colors"
            :class="viewMode === 'list' ? 'bg-zinc-800 text-zinc-100' : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300'"
            title="list view"
            @click="viewMode = 'list'"
          >
            <List class="h-3.5 w-3.5" />
          </button>
        </div>

        <!-- create note -->
        <button
          type="button"
          class="flex items-center gap-2 border border-zinc-100 bg-zinc-100 px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-white transition-colors"
          @click="emit('create')"
        >
          <Plus class="h-3.5 w-3.5" />
          <span>new note</span>
        </button>
      </div>
    </div>

    <!-- loading skeleton -->
    <div v-if="isLoading && notes.length === 0" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div v-for="i in 6" :key="i" class="h-40 border border-zinc-800 bg-zinc-900/60 p-5 animate-pulse">
        <div class="h-3 w-2/3 bg-zinc-800 mb-4"></div>
        <div class="space-y-2">
          <div class="h-2.5 w-full bg-zinc-800/70"></div>
          <div class="h-2.5 w-4/5 bg-zinc-800/70"></div>
          <div class="h-2.5 w-3/5 bg-zinc-800/70"></div>
        </div>
      </div>
    </div>

    <!-- empty state — no notes at all -->
    <div
      v-else-if="!isLoading && notes.length === 0"
      class="flex flex-col items-center justify-center border border-dashed border-zinc-800 py-20 text-center"
    >
      <FileText class="h-8 w-8 text-zinc-700 mb-3" />
      <p class="font-mono text-sm text-zinc-600">// no records found</p>
      <p class="font-mono text-xs text-zinc-700 mt-1">create your first note to get started</p>
      <button
        type="button"
        class="mt-5 border border-zinc-800 bg-zinc-900 px-4 py-2 text-xs font-medium text-zinc-400 hover:border-zinc-700 hover:text-zinc-200 transition-colors"
        @click="emit('create')"
      >
        create note
      </button>
    </div>

    <!-- empty state — search returned nothing -->
    <div
      v-else-if="filteredNotes.length === 0"
      class="flex flex-col items-center justify-center border border-dashed border-zinc-800 py-20 text-center"
    >
      <Search class="h-8 w-8 text-zinc-700 mb-3" />
      <p class="font-mono text-sm text-zinc-600">// no matching records found</p>
      <p class="font-mono text-xs text-zinc-700 mt-1">
        no results for <span class="text-zinc-500">"{{ searchQuery }}"</span>
      </p>
      <button
        type="button"
        class="mt-5 font-mono text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors"
        @click="clearSearch"
      >
        clear filter
      </button>
    </div>

    <!-- notes grid/list -->
    <div
      v-else
      :class="
        viewMode === 'grid'
          ? 'grid gap-3 sm:grid-cols-2 lg:grid-cols-3'
          : 'flex flex-col gap-2'
      "
    >
      <NoteCard
        v-for="note in filteredNotes"
        :key="note.id"
        :note="note"
        :view-mode="viewMode"
        @edit="emit('edit', $event)"
        @delete="emit('delete', $event)"
      />
    </div>
  </div>
</template>
