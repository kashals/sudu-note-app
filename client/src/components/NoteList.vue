<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { Search, Grid, List, FileText, Plus, RefreshCw } from '@lucide/vue';
import type { Note } from '../types/note';
import NoteCard from './NoteCard.vue';
import PushButton from './PushButton.vue';

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

const VIEW_MODE_KEY = 'sudu_note_view_mode';

const searchInput = ref('');
const searchQuery = ref('');
const viewMode = ref<'grid' | 'list'>('grid');

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

// debounced search
watch(searchInput, (val) => {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => { searchQuery.value = val; }, 250);
});

// persist view mode
watch(viewMode, (val) => { localStorage.setItem(VIEW_MODE_KEY, val); });

// instant clear
function clearSearch() {
  if (debounceTimer) clearTimeout(debounceTimer);
  searchInput.value = '';
  searchQuery.value = '';
}

// load persisted view mode
onMounted(() => {
  const saved = localStorage.getItem(VIEW_MODE_KEY);
  if (saved === 'grid' || saved === 'list') viewMode.value = saved;
});

// filtered notes
const filteredNotes = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  if (!query) return props.notes;
  return props.notes.filter(
    (note) =>
      note.title.toLowerCase().includes(query) ||
      note.content.toLowerCase().includes(query)
  );
});

// stagger delay class
function staggerClass(index: number): string {
  const cls = ['stagger-1','stagger-2','stagger-3','stagger-4','stagger-5','stagger-6'];
  return cls[index % cls.length] ?? '';
}
</script>

<template>
  <div class="space-y-5">
    <!-- toolbar -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <!-- search -->
      <div class="relative flex-1 max-w-sm">
        <Search class="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2" style="color: var(--text-muted);" />
        <input
          v-model="searchInput"
          type="text"
          placeholder="Search notes..."
          class="w-full pl-9 pr-8 py-2 text-xs border font-mono focus:outline-none transition-colors"
          style="
            background: var(--bg-surface);
            border-color: var(--border);
            color: var(--text-primary);
          "
          @focus="($el as HTMLInputElement).style.borderColor = 'var(--accent)'"
          @blur="($el as HTMLInputElement).style.borderColor = 'var(--border)'"
        />
        <button
          v-if="searchInput"
          type="button"
          class="absolute right-2.5 top-1/2 -translate-y-1/2 font-mono text-[10px] transition-colors"
          style="color: var(--text-muted);"
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
          class="p-2 border transition-colors"
          style="background: var(--bg-surface); border-color: var(--border); color: var(--text-muted);"
          title="Refresh"
          @click="emit('refresh')"
        >
          <RefreshCw class="h-3.5 w-3.5" :class="{ 'animate-spin': isLoading }" />
        </button>

        <!-- view mode -->
        <div class="flex border" style="border-color: var(--border);">
          <button
            type="button"
            class="p-2 transition-colors"
            :style="viewMode === 'grid'
              ? 'background: var(--accent); color: #fff;'
              : 'background: var(--bg-surface); color: var(--text-muted);'"
            title="Grid view"
            @click="viewMode = 'grid'"
          >
            <Grid class="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            class="p-2 transition-colors"
            :style="viewMode === 'list'
              ? 'background: var(--accent); color: #fff;'
              : 'background: var(--bg-surface); color: var(--text-muted);'"
            title="List view"
            @click="viewMode = 'list'"
          >
            <List class="h-3.5 w-3.5" />
          </button>
        </div>

        <!-- new note -->
        <PushButton variant="primary" @click="emit('create')">
          <Plus class="h-3.5 w-3.5" />
          New Note
        </PushButton>
      </div>
    </div>

    <!-- loading skeleton -->
    <div v-if="isLoading && notes.length === 0" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="i in 6"
        :key="i"
        class="h-40 border p-5"
        style="border-color: var(--border);"
      >
        <div class="skeleton h-3 w-2/3 mb-4"></div>
        <div class="space-y-2">
          <div class="skeleton h-2.5 w-full"></div>
          <div class="skeleton h-2.5 w-4/5"></div>
          <div class="skeleton h-2.5 w-3/5"></div>
        </div>
      </div>
    </div>

    <!-- empty state — no notes -->
    <div
      v-else-if="!isLoading && notes.length === 0"
      class="animate-fade-up flex flex-col items-center justify-center border border-dashed py-20 text-center"
      style="border-color: var(--border);"
    >
      <div
        class="mb-4 p-4 border"
        style="background: var(--accent-glow); border-color: var(--accent); border-radius: 12px;"
      >
        <FileText class="h-7 w-7" style="color: var(--accent);" />
      </div>
      <p class="font-mono text-sm" style="color: var(--text-muted);">// No records found</p>
      <p class="font-mono text-xs mt-1" style="color: var(--text-muted); opacity: 0.6;">
        Create your first note to get started
      </p>
      <div class="mt-5">
        <PushButton variant="primary" @click="emit('create')">
          <Plus class="h-3.5 w-3.5" />
          Create Note
        </PushButton>
      </div>
    </div>

    <!-- empty state — no search results -->
    <div
      v-else-if="filteredNotes.length === 0"
      class="animate-fade-up flex flex-col items-center justify-center border border-dashed py-20 text-center"
      style="border-color: var(--border);"
    >
      <Search class="h-8 w-8 mb-3" style="color: var(--text-muted);" />
      <p class="font-mono text-sm" style="color: var(--text-muted);">// No matching records</p>
      <p class="font-mono text-xs mt-1" style="color: var(--text-muted); opacity: 0.6;">
        No results for "<span style="color: var(--accent-light);">{{ searchQuery }}</span>"
      </p>
      <button
        type="button"
        class="mt-4 font-mono text-[11px] transition-colors"
        style="color: var(--text-muted);"
        @click="clearSearch"
      >
        Clear filter
      </button>
    </div>

    <!-- notes grid / list -->
    <div
      v-else
      :class="viewMode === 'grid' ? 'grid gap-3 sm:grid-cols-2 lg:grid-cols-3' : 'flex flex-col gap-2'"
    >
      <NoteCard
        v-for="(note, index) in filteredNotes"
        :key="note.id"
        :note="note"
        :view-mode="viewMode"
        :class="`animate-fade-up ${staggerClass(index)}`"
        @edit="emit('edit', $event)"
        @delete="emit('delete', $event)"
      />
    </div>
  </div>
</template>
