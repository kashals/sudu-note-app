<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, toRef } from 'vue';
import {
  Search, Grid, List, FileText, Plus, Check, Pin, Archive,
  RefreshCw, CheckSquare, Square, X, Filter, Calendar, Loader2
} from '@lucide/vue';
import type { Note } from '../types/note';
import NoteCard from './NoteCard.vue';
import PushButton from './PushButton.vue';
import FilterPopover from './ui/FilterPopover.vue';
import DateFilterPopover from './ui/DateFilterPopover.vue';
import { useNoteFilter } from '../composables/useNoteFilter';

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
  (e: 'archive', note: Note): void;
  (e: 'restore', note: Note): void;
  (e: 'refresh'): void;
  (e: 'batch-archive', noteIds: string[]): void;
  (e: 'batch-restore', noteIds: string[]): void;
  (e: 'batch-delete', noteIds: string[]): void;
}>();

const VIEW_MODE_KEY = 'sudu_note_view_mode';

const searchInput = ref('');
const searchQuery = ref('');
const viewMode = ref<'grid' | 'list'>('grid');
const showArchived = ref(false);
const isFilterMenuOpen = ref(false);
const isDateMenuOpen = ref(false);

// ─── composable filter & sort logic (DRY) ──────────────────────
const notesRef = toRef(props, 'notes');
const showArchivedRef = toRef(showArchived);
const searchQueryRef = toRef(searchQuery);

const {
  sortOrder,
  selectedCategoryFilter,
  selectedTagFilter,
  startDate,
  endDate,
  quickDatePreset,
  isDateFilterActive,
  availableCategories,
  availableTags,
  isFilterActive,
  activeFilterCount,
  toggleCategoryFilter,
  toggleTagFilter,
  resetDateFilter,
  resetFilters,
  filteredNotes
} = useNoteFilter(notesRef, showArchivedRef, searchQueryRef);

function handleOutsideClick(e: MouseEvent) {
  const target = e.target as HTMLElement;
  if (!target.closest('.filter-dropdown-container')) {
    isFilterMenuOpen.value = false;
  }
  if (!target.closest('.date-dropdown-container')) {
    isDateMenuOpen.value = false;
  }
}

// ─── select / batch state ──────────────────────────────────────
const isSelectMode = ref(false);
const selectedNoteIds = ref<string[]>([]);

function toggleSelectMode() {
  isSelectMode.value = !isSelectMode.value;
  if (!isSelectMode.value) {
    selectedNoteIds.value = [];
  }
}

function toggleNoteSelection(id: string) {
  const idx = selectedNoteIds.value.indexOf(id);
  if (idx > -1) {
    selectedNoteIds.value.splice(idx, 1);
  } else {
    selectedNoteIds.value.push(id);
  }
}

function selectAllNotes() {
  const allIds = filteredNotes.value.map(n => n.id);
  if (selectedNoteIds.value.length === allIds.length) {
    selectedNoteIds.value = [];
  } else {
    selectedNoteIds.value = allIds;
  }
}

function handleBatchArchive() {
  if (selectedNoteIds.value.length === 0) return;
  emit('batch-archive', [...selectedNoteIds.value]);
  selectedNoteIds.value = [];
  isSelectMode.value = false;
}

function handleBatchRestore() {
  if (selectedNoteIds.value.length === 0) return;
  emit('batch-restore', [...selectedNoteIds.value]);
  selectedNoteIds.value = [];
  isSelectMode.value = false;
}

function handleBatchDelete() {
  if (selectedNoteIds.value.length === 0) return;
  emit('batch-delete', [...selectedNoteIds.value]);
  selectedNoteIds.value = [];
  isSelectMode.value = false;
}

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

// reset pagination page on search query change or archive view change
watch(searchQuery, () => {
  currentPage.value = 1;
});

watch(showArchived, () => {
  currentPage.value = 1;
  selectedNoteIds.value = [];
});

// persist view mode
watch(viewMode, (val) => { localStorage.setItem(VIEW_MODE_KEY, val); });

// instant clear
function clearSearch() {
  if (debounceTimer) clearTimeout(debounceTimer);
  searchInput.value = '';
  searchQuery.value = '';
}

// load view mode and add event listener
onMounted(() => {
  const saved = localStorage.getItem(VIEW_MODE_KEY);
  if (saved === 'grid' || saved === 'list') viewMode.value = saved;
  document.addEventListener('click', handleOutsideClick);
});

onUnmounted(() => {
  document.removeEventListener('click', handleOutsideClick);
});

// separate pinned vs unpinned notes
const pinnedNotes = computed(() => {
  if (showArchived.value) return [];
  return filteredNotes.value.filter((note) => note.is_pinned === 1);
});

const unpinnedNotes = computed(() => {
  if (showArchived.value) return filteredNotes.value;
  return filteredNotes.value.filter((note) => note.is_pinned !== 1);
});

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
  <div class="space-y-6 relative">
    <!-- toolbar -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <!-- search & filter group -->
      <div class="flex items-center gap-1.5 flex-1 max-w-md">
        <!-- search input -->
        <div class="relative flex-1">
          <Search class="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 z-10" style="color: var(--text-muted);" />
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
            class="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[9px] hover:text-white transition-colors z-10"
            style="color: var(--text-muted);"
            @click="clearSearch"
          >
            esc
          </button>
        </div>

        <!-- Frameless Filter Icon Button & Popover -->
        <div class="relative filter-dropdown-container">
          <button
            type="button"
            class="h-9 w-9 relative rounded-lg flex items-center justify-center transition-all select-none shrink-0 cursor-pointer hover:bg-white/10"
            :style="isFilterActive
              ? 'color: var(--accent-light);'
              : 'color: var(--text-secondary);'"
            :title="isFilterActive ? `${activeFilterCount} filter(s) active — click to modify` : 'Filter & sort notes'"
            @click="isFilterMenuOpen = !isFilterMenuOpen; isDateMenuOpen = false;"
          >
            <Filter class="w-4 h-4" />

            <!-- Top right numerical active filter badge -->
            <span
              v-if="activeFilterCount > 0"
              class="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full text-[9px] font-mono font-bold text-white leading-none flex items-center justify-center shadow-md"
              style="background: var(--accent); border: 1.5px solid var(--bg-surface);"
            >
              {{ activeFilterCount }}
            </span>
          </button>

          <FilterPopover
            :is-open="isFilterMenuOpen"
            :sort-order="sortOrder"
            :selected-categories="selectedCategoryFilter"
            :selected-tags="selectedTagFilter"
            :available-categories="availableCategories"
            :available-tags="availableTags"
            :active-filter-count="activeFilterCount"
            :is-filter-active="isFilterActive"
            :match-count="filteredNotes.length"
            @update:sort-order="sortOrder = $event"
            @toggle:category="toggleCategoryFilter"
            @toggle:tag="toggleTagFilter"
            @reset="resetFilters"
            @close="isFilterMenuOpen = false"
          />
        </div>

        <!-- Frameless Calendar Date Icon Button & Popover -->
        <div class="relative date-dropdown-container">
          <button
            type="button"
            class="h-9 w-9 relative rounded-lg flex items-center justify-center transition-all select-none shrink-0 cursor-pointer hover:bg-white/10"
            :style="isDateFilterActive
              ? 'color: var(--accent-light);'
              : 'color: var(--text-secondary);'"
            :title="isDateFilterActive ? 'Date filter active — click to modify' : 'Filter notes by date period'"
            @click="isDateMenuOpen = !isDateMenuOpen; isFilterMenuOpen = false;"
          >
            <Calendar class="w-4 h-4" />

            <!-- Top right active indicator dot -->
            <span
              v-if="isDateFilterActive"
              class="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full shadow-md"
              style="background: var(--accent); border: 1.5px solid var(--bg-surface);"
            ></span>
          </button>

          <DateFilterPopover
            :is-open="isDateMenuOpen"
            :start-date="startDate"
            :end-date="endDate"
            :quick-date-preset="quickDatePreset"
            :is-date-filter-active="isDateFilterActive"
            @update:start-date="startDate = $event"
            @update:end-date="endDate = $event"
            @update:quick-date-preset="quickDatePreset = $event"
            @reset="resetDateFilter"
            @close="isDateMenuOpen = false"
          />
        </div>
      </div>

      <!-- actions -->
      <div class="flex items-center gap-2 flex-wrap">
        <!-- refresh -->
        <button
          type="button"
          class="h-[38px] w-[38px] flex items-center justify-center border transition-all rounded hover:border-emerald-500 shrink-0 cursor-pointer"
          :disabled="isLoading"
          :title="refreshState === 'success' ? 'Up to date' : refreshState === 'loading' ? 'Refreshing...' : 'Refresh workspace'"
          style="background: var(--bg-surface); border-color: var(--border);"
          @click="handleRefresh"
        >
          <Loader2 v-if="refreshState === 'loading'" class="h-4 w-4 animate-spin text-emerald-400" />
          <Check v-else-if="refreshState === 'success'" class="h-4 w-4 text-emerald-400" />
          <RefreshCw v-else class="h-4 w-4" style="color: var(--text-secondary);" />
        </button>

        <!-- view mode -->
        <div class="flex border rounded overflow-hidden h-[38px] shrink-0" style="border-color: var(--border);">
          <button
            type="button"
            class="px-2.5 flex items-center justify-center transition-colors cursor-pointer"
            :style="viewMode === 'grid'
              ? 'background: var(--accent); color: #fff;'
              : 'background: var(--bg-surface); color: var(--text-muted);'"
            title="Grid view"
            @click="viewMode = 'grid'"
          >
            <Grid class="h-4 w-4" />
          </button>
          <button
            type="button"
            class="px-2.5 flex items-center justify-center transition-colors cursor-pointer"
            :style="viewMode === 'list'
              ? 'background: var(--accent); color: #fff;'
              : 'background: var(--bg-surface); color: var(--text-muted);'"
            title="List view"
            @click="viewMode = 'list'"
          >
            <List class="h-4 w-4" />
          </button>
        </div>

        <!-- Select mode toggle -->
        <PushButton
          :variant="isSelectMode ? 'primary' : 'secondary'"
          :title="isSelectMode ? 'Exit select mode' : 'Enter batch select mode'"
          @click="toggleSelectMode"
        >
          <CheckSquare class="h-3.5 w-3.5" />
          <span>Select</span>
        </PushButton>

        <!-- show archived workspace switch -->
        <PushButton
          :variant="showArchived ? 'warning' : 'secondary'"
          :title="showArchived ? 'View active workspace' : 'View archived notes'"
          @click="showArchived = !showArchived"
        >
          <Archive class="h-3.5 w-3.5" />
          Archive
        </PushButton>

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

    <!-- ── Empty States ── -->
    <!-- Archive Workspace Mode Empty States -->
    <template v-else-if="!isLoading && showArchived && filteredNotes.length === 0">
      <div
        v-if="!searchQuery && !isFilterActive"
        class="animate-fade-up flex flex-col items-center justify-center border border-dashed py-20 text-center"
        style="border-color: var(--border); border-radius: 8px;"
      >
        <div
          class="mb-4 p-4 border"
          style="background: var(--bg-raised); border-color: var(--border); border-radius: 12px;"
        >
          <Archive class="h-7 w-7" style="color: var(--text-muted);" />
        </div>
        <p class="font-mono text-sm" style="color: var(--text-muted);">// Archive is empty</p>
        <p class="font-mono text-xs mt-1" style="color: var(--text-muted); opacity: 0.6;">
          There are no archived notes in your workspace.
        </p>
      </div>

      <div
        v-else
        class="animate-fade-up flex flex-col items-center justify-center border border-dashed py-20 text-center"
        style="border-color: var(--border); border-radius: 8px;"
      >
        <Search class="h-8 w-8 mb-3" style="color: var(--text-muted);" />
        <p class="font-mono text-sm" style="color: var(--text-muted);">// No matching archived records</p>
        <p class="font-mono text-xs mt-1" style="color: var(--text-muted); opacity: 0.6;">
          <span v-if="searchQuery">No archived results matching "<span style="color: var(--accent-light);">{{ searchQuery }}</span>"</span>
          <span v-else>No archived notes match the current filters.</span>
        </p>
        <button
          type="button"
          class="mt-4 font-mono text-[11px] transition-colors hover:underline cursor-pointer"
          style="color: var(--accent);"
          @click="clearSearch(); resetFilters();"
        >
          Reset search and filters
        </button>
      </div>
    </template>

    <!-- Active Workspace Mode Empty States -->
    <template v-else-if="!isLoading && !showArchived && filteredNotes.length === 0">
      <!-- Zero notes total in database -->
      <div
        v-if="notes.length === 0"
        class="animate-fade-up flex flex-col items-center justify-center border border-dashed py-20 text-center"
        style="border-color: var(--border); border-radius: 8px;"
      >
        <div
          class="mb-4 p-4 border"
          style="background: var(--accent-glow); border-color: var(--accent); border-radius: 12px;"
        >
          <FileText class="h-7 w-7" style="color: var(--accent);" />
        </div>
        <p class="font-mono text-sm" style="color: var(--text-muted);">// No notes in workspace</p>
        <p class="font-mono text-xs mt-1 mb-5" style="color: var(--text-muted); opacity: 0.6;">
          Create your first note to get started
        </p>
        <PushButton variant="primary" @click="emit('create')">
          <Plus class="h-3.5 w-3.5" />
          New Note
        </PushButton>
      </div>

      <!-- System has notes, but all active notes are in archive -->
      <div
        v-else-if="!searchQuery && !isFilterActive"
        class="animate-fade-up flex flex-col items-center justify-center border border-dashed py-20 text-center"
        style="border-color: var(--border); border-radius: 8px;"
      >
        <div
          class="mb-4 p-4 border"
          style="background: var(--bg-raised); border-color: var(--border); border-radius: 12px;"
        >
          <Archive class="h-7 w-7" style="color: #fb923c;" />
        </div>
        <p class="font-mono text-sm" style="color: var(--text-muted);">// No active workspace notes</p>
        <p class="font-mono text-xs mt-1 mb-5" style="color: var(--text-muted); opacity: 0.6;">
          All existing notes are currently archived.
        </p>
        <div class="flex items-center gap-3">
          <PushButton variant="primary" @click="emit('create')">
            <Plus class="h-3.5 w-3.5" />
            New Note
          </PushButton>
          <PushButton variant="secondary" @click="showArchived = true">
            <Archive class="h-3.5 w-3.5" />
            View Archive
          </PushButton>
        </div>
      </div>

      <!-- Search or filter returned 0 results in active workspace -->
      <div
        v-else
        class="animate-fade-up flex flex-col items-center justify-center border border-dashed py-20 text-center"
        style="border-color: var(--border); border-radius: 8px;"
      >
        <Search class="h-8 w-8 mb-3" style="color: var(--text-muted);" />
        <p class="font-mono text-sm" style="color: var(--text-muted);">// No matching records</p>
        <p class="font-mono text-xs mt-1" style="color: var(--text-muted); opacity: 0.6;">
          <span v-if="searchQuery">No results matching "<span style="color: var(--accent-light);">{{ searchQuery }}</span>"</span>
          <span v-else>No notes match the current filters.</span>
        </p>
        <button
          type="button"
          class="mt-4 font-mono text-[11px] transition-colors hover:underline cursor-pointer"
          style="color: var(--accent);"
          @click="clearSearch(); resetFilters();"
        >
          Reset search and filters
        </button>
      </div>
    </template>

    <!-- render notes workspace (split pinned / unpinned) -->
    <div v-else class="space-y-6">
      <!-- ── pinned workspace ── -->
      <div v-if="pinnedNotes.length > 0 && !showArchived" class="space-y-3">
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
              v-for="(note) in pinnedNotes"
              :key="note.id"
              :note="note"
              :view-mode="viewMode"
              :index-number="notes.findIndex(n => n.id === note.id)"
              :is-select-mode="isSelectMode"
              :is-selected="selectedNoteIds.includes(note.id)"
              class="animate-fade-up"
              @edit="emit('edit', $event)"
              @delete="emit('delete', $event)"
              @toggle-pin="emit('toggle-pin', $event)"
              @archive="emit('archive', $event)"
              @restore="emit('restore', $event)"
              @toggle-select="toggleNoteSelection"
            />
          </div>
        </Transition>
      </div>

      <!-- ── all notes workspace ── -->
      <div class="space-y-3">
        <div class="flex items-center gap-2 border-b pb-2 pt-2" style="border-color: var(--border-subtle);">
          <h3 class="text-[10px] font-extrabold uppercase tracking-widest" style="color: var(--text-secondary);">
            {{ showArchived ? 'Archived Notes' : 'All Workspace Notes' }}
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
              :is-select-mode="isSelectMode"
              :is-selected="selectedNoteIds.includes(note.id)"
              :class="`animate-fade-up ${staggerClass(index)}`"
              @edit="emit('edit', $event)"
              @delete="emit('delete', $event)"
              @toggle-pin="emit('toggle-pin', $event)"
              @archive="emit('archive', $event)"
              @restore="emit('restore', $event)"
              @toggle-select="toggleNoteSelection"
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
              class="px-3 py-1 border transition-colors disabled:opacity-40 select-none rounded hover:border-emerald-500 cursor-pointer"
              style="background: var(--bg-surface); border-color: var(--border); color: var(--text-secondary);"
              :disabled="currentPage === 1"
              @click="currentPage--"
            >
              Previous
            </button>
            <button
              class="px-3 py-1 border transition-colors disabled:opacity-40 select-none rounded hover:border-emerald-500 cursor-pointer"
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

    <!-- ── Floating Batch Operations Bar ── -->
    <Transition name="warn-toast">
      <div
        v-if="isSelectMode && selectedNoteIds.length > 0"
        class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-2.5 border rounded-xl shadow-2xl font-mono text-xs select-none"
        style="background: var(--bg-surface); border-color: var(--accent); box-shadow: 0 12px 40px rgba(0,0,0,0.4);"
      >
        <div class="flex items-center gap-2 shrink-0" style="color: var(--accent-light);">
          <CheckSquare class="w-4 h-4" />
          <span class="font-bold">{{ selectedNoteIds.length }} selected</span>
        </div>

        <div class="h-4 w-px shrink-0" style="background: var(--border);"></div>

        <div class="flex items-center gap-2 shrink-0">
          <button
            type="button"
            class="px-2.5 py-1 text-[11px] border rounded transition-all hover:border-gray-400 cursor-pointer"
            style="background: var(--bg-raised); border-color: var(--border); color: var(--text-secondary);"
            @click="selectAllNotes"
          >
            {{ selectedNoteIds.length === filteredNotes.length ? 'Deselect All' : 'Select All' }}
          </button>

          <button
            v-if="showArchived"
            type="button"
            class="px-2.5 py-1 text-[11px] border rounded transition-all hover:opacity-90 cursor-pointer"
            style="background: var(--accent-glow); border-color: var(--accent); color: var(--accent-light);"
            @click="handleBatchRestore"
          >
            Restore ({{ selectedNoteIds.length }})
          </button>

          <button
            v-else
            type="button"
            class="px-2.5 py-1 text-[11px] border rounded transition-all hover:opacity-90 cursor-pointer"
            style="background: rgba(249, 115, 22, 0.1); border-color: #fb923c; color: #fb923c;"
            @click="handleBatchArchive"
          >
            Archive ({{ selectedNoteIds.length }})
          </button>

          <button
            type="button"
            class="px-2.5 py-1 text-[11px] border rounded transition-all hover:opacity-90 cursor-pointer"
            style="background: rgba(239, 68, 68, 0.1); border-color: rgba(239, 68, 68, 0.35); color: #f87171;"
            @click="handleBatchDelete"
          >
            Delete ({{ selectedNoteIds.length }})
          </button>
        </div>

        <button
          type="button"
          class="p-1 hover:text-white transition-colors ml-1 shrink-0 cursor-pointer"
          style="color: var(--text-muted);"
          @click="selectedNoteIds = []; isSelectMode = false;"
        >
          <X class="w-4 h-4" />
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
@keyframes progressBar {
  0%   { transform: translateX(-100%); width: 60%; }
  50%  { transform: translateX(80%);   width: 60%; }
  100% { transform: translateX(200%);  width: 60%; }
}

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
