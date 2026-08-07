<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { Search, Grid, List, FileText, Plus, Check, Pin } from '@lucide/vue';
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
  (e: 'toggle-pin', note: Note): void;
  (e: 'refresh'): void;
}>();

const VIEW_MODE_KEY = 'sudu_note_view_mode';

const searchInput = ref('');
const searchQuery = ref('');
const viewMode = ref<'grid' | 'list'>('grid');

// ─── pagination state ─────────────────────────────────────────
const currentPage = ref(1);
const itemsPerPage = ref(6);

// ─── refresh state ────────────────────────────────────────────
const refreshState = ref<'idle' | 'loading' | 'success'>('idle');
let refreshSuccessTimer: ReturnType<typeof setTimeout> | null = null;

watch(
  () => props.isLoading,
  (isNowLoading, wasLoading) => {
    if (isNowLoading) {
      refreshState.value = 'loading';
      if (refreshSuccessTimer) clearTimeout(refreshSuccessTimer);
    } else if (wasLoading && !isNowLoading) {
      refreshState.value = 'success';
      if (refreshSuccessTimer) clearTimeout(refreshSuccessTimer);
      refreshSuccessTimer = setTimeout(() => {
        refreshState.value = 'idle';
      }, 2000);
    }
  }
);

function handleRefresh() {
  if (props.isLoading) return;
  emit('refresh');
}

// ─── search debounce ──────────────────────────────────────────
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

watch(searchInput, (val) => {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => { searchQuery.value = val; }, 250);
});

// reset pagination page on search query change
watch(searchQuery, () => {
  currentPage.value = 1;
});

// persist view mode
watch(viewMode, (val) => { localStorage.setItem(VIEW_MODE_KEY, val); });

// instant clear
function clearSearch() {
  if (debounceTimer) clearTimeout(debounceTimer);
  searchInput.value = '';
  searchQuery.value = '';
}

// load view mode
onMounted(() => {
  const saved = localStorage.getItem(VIEW_MODE_KEY);
  if (saved === 'grid' || saved === 'list') viewMode.value = saved;
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

// separate pinned vs unpinned notes
const pinnedNotes = computed(() =>
  filteredNotes.value.filter((note) => note.is_pinned === 1)
);

const unpinnedNotes = computed(() =>
  filteredNotes.value.filter((note) => note.is_pinned !== 1)
);

// unpinned notes pagination
const totalPages = computed(() =>
  Math.max(1, Math.ceil(unpinnedNotes.value.length / itemsPerPage.value))
);

const paginatedUnpinnedNotes = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  const end = start + itemsPerPage.value;
  return unpinnedNotes.value.slice(start, end);
});

// stagger delay class
function staggerClass(index: number): string {
  const cls = ['stagger-1','stagger-2','stagger-3','stagger-4','stagger-5','stagger-6'];
  return cls[index % cls.length] ?? '';
}
</script>

<template>
  <div class="space-y-6">
    <!-- toolbar -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <!-- search (ErzenXz inspired high fidelity design) -->
      <div class="relative flex-1 max-w-sm">
        <Search class="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2" style="color: var(--text-muted);" />
        <input
          v-model="searchInput"
          type="text"
          placeholder="Search workspace notes..."
          class="input-search text-xs font-mono"
          @keydown.esc="clearSearch"
        />
        <button
          v-if="searchInput"
          type="button"
          class="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[9px] hover:text-white transition-colors"
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
          class="p-2 border transition-colors rounded"
          :disabled="isLoading"
          :title="refreshState === 'success' ? 'Up to date' : refreshState === 'loading' ? 'Refreshing...' : 'Refresh'"
          style="background: var(--bg-surface); border-color: var(--border);"
          @click="handleRefresh"
        >
          <Transition
            enter-active-class="transition-opacity duration-150"
            enter-from-class="opacity-0"
            enter-to-class="opacity-100"
            leave-active-class="transition-opacity duration-100"
            leave-from-class="opacity-100"
            leave-to-class="opacity-0"
            mode="out-in"
          >
            <Check
              v-if="refreshState === 'success'"
              key="check"
              class="h-3.5 w-3.5"
              style="color: var(--text-secondary);"
            />
            <RefreshCw
              v-else
              key="refresh"
              class="h-3.5 w-3.5"
              :class="refreshState === 'loading' ? 'animate-spin' : ''"
              style="color: var(--text-secondary);"
            />
          </Transition>
        </button>

        <!-- view mode -->
        <div class="flex border rounded overflow-hidden" style="border-color: var(--border);">
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

    <!-- loading indicator line -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-300"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isLoading && notes.length > 0"
        class="w-full h-[2px] overflow-hidden"
        style="background: var(--border);"
      >
        <div
          class="h-full"
          style="background: var(--accent); animation: progressBar 1.2s ease-in-out infinite;"
        ></div>
      </div>
    </Transition>

    <!-- loading skeleton -->
    <div v-if="isLoading && notes.length === 0" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="i in 6"
        :key="i"
        class="h-40 border p-5"
        style="border-color: var(--border); border-radius: 8px;"
      >
        <div class="skeleton h-3 w-2/3 mb-4"></div>
        <div class="space-y-2">
          <div class="skeleton h-2.5 w-full"></div>
          <div class="skeleton h-2.5 w-4/5"></div>
          <div class="skeleton h-2.5 w-3/5"></div>
        </div>
      </div>
    </div>

    <!-- empty state: zero notes total -->
    <div
      v-else-if="!isLoading && notes.length === 0"
      class="animate-fade-up flex flex-col items-center justify-center border border-dashed py-20 text-center"
      style="border-color: var(--border); border-radius: 8px;"
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

    <!-- empty state: search returned zero results -->
    <div
      v-else-if="filteredNotes.length === 0"
      class="animate-fade-up flex flex-col items-center justify-center border border-dashed py-20 text-center"
      style="border-color: var(--border); border-radius: 8px;"
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

    <!-- render notes workspace (split pinned / unpinned) -->
    <div v-else class="space-y-6">
      <!-- ── pinned workspace ── -->
      <div v-if="pinnedNotes.length > 0" class="space-y-3">
        <div class="flex items-center gap-2 border-b pb-2" style="border-color: var(--border-subtle);">
          <Pin class="h-3.5 w-3.5" style="color: var(--accent);" />
          <h3 class="text-[10px] font-extrabold uppercase tracking-widest" style="color: var(--text-secondary);">
            Pinned Notes
          </h3>
          <span class="font-mono text-[9px] px-1.5 py-0.5 rounded border" style="background: var(--bg-surface); border-color: var(--border); color: var(--text-muted);">
            {{ pinnedNotes.length }}
          </span>
        </div>

        <Transition name="fade-layout" mode="out-in">
          <div :key="viewMode" :class="viewMode === 'grid' ? 'grid gap-3 sm:grid-cols-2 lg:grid-cols-3' : 'flex flex-col gap-2'">
            <NoteCard
              v-for="(note, index) in pinnedNotes"
              :key="note.id"
              :note="note"
              :view-mode="viewMode"
              :index-number="notes.findIndex(n => n.id === note.id)"
              class="animate-fade-up"
              @edit="emit('edit', $event)"
              @delete="emit('delete', $event)"
              @toggle-pin="emit('toggle-pin', $event)"
            />
          </div>
        </Transition>
      </div>

      <!-- ── all notes workspace ── -->
      <div class="space-y-3">
        <div v-if="pinnedNotes.length > 0" class="flex items-center gap-2 border-b pb-2 pt-2" style="border-color: var(--border-subtle);">
          <h3 class="text-[10px] font-extrabold uppercase tracking-widest" style="color: var(--text-secondary);">
            All Workspace Notes
          </h3>
          <span class="font-mono text-[9px] px-1.5 py-0.5 rounded border" style="background: var(--bg-surface); border-color: var(--border); color: var(--text-muted);">
            {{ unpinnedNotes.length }}
          </span>
        </div>

        <Transition name="fade-layout" mode="out-in">
          <div :key="viewMode" :class="viewMode === 'grid' ? 'grid gap-3 sm:grid-cols-2 lg:grid-cols-3' : 'flex flex-col gap-2'">
            <NoteCard
              v-for="(note, index) in paginatedUnpinnedNotes"
              :key="note.id"
              :note="note"
              :view-mode="viewMode"
              :index-number="notes.findIndex(n => n.id === note.id)"
              :class="`animate-fade-up ${staggerClass(index)}`"
              @edit="emit('edit', $event)"
              @delete="emit('delete', $event)"
              @toggle-pin="emit('toggle-pin', $event)"
            />
          </div>
        </Transition>

        <!-- ── pagination controls ── -->
        <div
          v-if="totalPages > 1"
          class="flex items-center justify-between border-t pt-4 mt-6 font-mono text-[11px]"
          style="border-color: var(--border-subtle);"
        >
          <span style="color: var(--text-muted);">
            Page {{ currentPage }} of {{ totalPages }} · showing max {{ itemsPerPage }} per page
          </span>
          <div class="flex items-center gap-2">
            <button
              class="px-3 py-1 border transition-colors disabled:opacity-40 select-none rounded"
              style="background: var(--bg-surface); border-color: var(--border); color: var(--text-secondary);"
              :disabled="currentPage === 1"
              @click="currentPage--"
            >
              Previous
            </button>
            <button
              class="px-3 py-1 border transition-colors disabled:opacity-40 select-none rounded"
              style="background: var(--bg-surface); border-color: var(--border); color: var(--text-secondary);"
              :disabled="currentPage === totalPages"
              @click="currentPage++"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes progressBar {
  0%   { transform: translateX(-100%); width: 60%; }
  50%  { transform: translateX(80%);   width: 60%; }
  100% { transform: translateX(200%);  width: 60%; }
}

/* ErzenXz inspired search input styling */
.input-search {
  width: 100%;
  height: 36px;
  padding: 8px 12px 8px 36px;
  border-radius: 8px;
  border: 1.5px solid var(--border);
  outline: none;
  background: var(--bg-surface);
  color: var(--text-primary);
  transition: all 0.3s cubic-bezier(0.19, 1, 0.22, 1);
}

.input-search:hover {
  border-color: var(--text-muted);
}

.input-search:active {
  transform: scale(0.98);
}

.input-search:focus {
  border-color: var(--accent);
}
</style>
