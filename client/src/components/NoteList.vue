<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, toRef } from 'vue';
import {
  Search, Grid, List, FileText, Plus, Check, Pin, Archive,
  CheckSquare, Square, X, Filter, Calendar, Folder
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
  activeFolderId?: string | null;
  activeFolderName?: string | null;
  showArchived?: boolean;
}>();

// component emits
const emit = defineEmits<{
  (e: 'create'): void;
  (e: 'edit', note: Note): void;
  (e: 'delete', note: Note): void;
  (e: 'toggle-pin', note: Note): void;
  (e: 'archive', note: Note): void;
  (e: 'restore', note: Note): void;
  (e: 'batch-archive', noteIds: string[]): void;
  (e: 'batch-restore', noteIds: string[]): void;
  (e: 'batch-delete', noteIds: string[]): void;
  (e: 'drag-note', noteId: string): void;
  (e: 'batch-move-folder', payload: { noteIds: string[]; folderId: string | null }): void;
  (e: 'update:showArchived', val: boolean): void;
}>();

const VIEW_MODE_KEY = 'sudu_note_view_mode';

const searchInput = ref('');
const searchQuery = ref('');
const viewMode = ref<'grid' | 'list'>('grid');
const localShowArchived = ref(props.showArchived ?? false);
watch(() => props.showArchived, (val) => {
  if (val !== undefined) localShowArchived.value = val;
});
const showArchived = computed({
  get: () => props.showArchived ?? localShowArchived.value,
  set: (val) => {
    localShowArchived.value = val;
    emit('update:showArchived', val);
  }
});
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
  filteredNotes: filteredByFilters
} = useNoteFilter(notesRef, showArchivedRef, searchQueryRef);

// ─── folder-level filtering (applied on top of other filters) ───
const filteredNotes = computed(() => {
  if (showArchived.value) {
    return filteredByFilters.value;
  }
  if (props.activeFolderId === undefined || props.activeFolderId === null) {
    // Only show uncategorized notes (not in any folder)
    return filteredByFilters.value.filter(n => n.folder_id === null);
  }
  return filteredByFilters.value.filter(n => n.folder_id === props.activeFolderId);
});

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
const showMoveModal = ref(false);

import { useFolderState } from '../composables/useFolderState';
const { folders } = useFolderState();

function openMoveFolderModal() {
  showMoveModal.value = true;
}

function moveSelectedNotes(folderId: string | null) {
  emit('batch-move-folder', { noteIds: [...selectedNoteIds.value], folderId });
  selectedNoteIds.value = [];
  isSelectMode.value = false;
  showMoveModal.value = false;
}

function toggleSelectMode() {
  isSelectMode.value = !isSelectMode.value;
  if (!isSelectMode.value) {
    selectedNoteIds.value = [];
  }
}

function toggleNoteSelection(id: string) {
  if (!isSelectMode.value) {
    isSelectMode.value = true;
  }
  const idx = selectedNoteIds.value.indexOf(id);
  if (idx > -1) {
    selectedNoteIds.value.splice(idx, 1);
    if (selectedNoteIds.value.length === 0) {
      isSelectMode.value = false;
    }
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

// Global note statistics for empty state checks
const activeUncategorizedNotesCount = computed(() =>
  props.notes.filter(n => n.is_archived === 0 && !n.folder_id).length
);
const activeFolderNotesCount = computed(() =>
  props.notes.filter(n => n.is_archived === 0 && n.folder_id).length
);
const archivedNotesCount = computed(() =>
  props.notes.filter(n => n.is_archived === 1).length
);

// separate pinned vs unpinned notes
const pinnedNotes = computed(() => {
  if (showArchived.value) return [];
  return filteredNotes.value.filter((note) => note.is_pinned === 1);
});

const unpinnedNotes = computed(() => {
  if (showArchived.value) return filteredNotes.value;
  return filteredNotes.value.filter((note) => note.is_pinned !== 1);
});

// Compute a persistent sequence map based on creation date ascending (global)
const noteSequenceMap = computed(() => {
  const sorted = [...props.notes].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const map: Record<string, number> = {};
  sorted.forEach((note, idx) => {
    map[note.id] = idx + 1;
  });
  return map;
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
  <div class="flex-1 flex flex-col space-y-6 relative">
    <!-- toolbar -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <!-- search & filter group -->
      <div class="flex items-center gap-2 w-full flex-1 sm:max-w-md">
        <!-- search input -->
        <div class="relative flex-1 min-w-0">
          <Search class="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 z-10" style="color: var(--text-muted);" />
          <input
            v-model="searchInput"
            type="text"
            placeholder="Search workspace notes..."
            class="input-search text-xs font-mono w-full"
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
        <div class="relative filter-dropdown-container shrink-0">
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
        <div class="relative date-dropdown-container shrink-0">
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
      <div class="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
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

        <!-- Desktop Action Buttons (Hidden on Mobile) -->
        <div class="hidden sm:flex items-center gap-2">
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
            <span>Archive</span>
          </PushButton>

          <!-- new note (desktop only) -->
          <PushButton variant="primary" @click="emit('create')">
            <Plus class="h-3.5 w-3.5" />
            <span>New Note</span>
          </PushButton>
        </div>
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
        class="animate-fade-up flex-1 flex flex-col items-center justify-center border border-dashed py-10 text-center"
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
        class="animate-fade-up flex-1 flex flex-col items-center justify-center border border-dashed py-10 text-center"
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
      <!-- Folder specific empty state -->
      <div
        v-if="activeFolderId !== null && activeFolderId !== undefined && !searchQuery && !isFilterActive"
        class="animate-fade-up flex-1 flex flex-col items-center justify-center border border-dashed py-10 text-center"
        style="border-color: var(--border); border-radius: 8px;"
      >
        <div
          class="mb-4 p-4 border"
          style="background: var(--accent-glow); border-color: var(--accent); border-radius: 12px;"
        >
          <FileText class="h-7 w-7" style="color: var(--accent);" />
        </div>
        <p class="font-mono text-sm" style="color: var(--text-muted);">// Folder is empty</p>
        <p class="font-mono text-xs mt-1 mb-5" style="color: var(--text-muted); opacity: 0.6;">
          No active notes in "{{ activeFolderName || 'this folder' }}"
        </p>
        <PushButton variant="primary" class="hidden sm:inline-flex" @click="emit('create')">
          <Plus class="h-3.5 w-3.5" />
          New Note
        </PushButton>
      </div>

      <!-- Zero notes total in database -->
      <div
        v-else-if="notes.length === 0"
        class="animate-fade-up flex-1 flex flex-col items-center justify-center border border-dashed py-10 text-center"
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
        <PushButton variant="primary" class="hidden sm:inline-flex" @click="emit('create')">
          <Plus class="h-3.5 w-3.5" />
          New Note
        </PushButton>
      </div>

      <!-- All active notes are organized in folders (none uncategorized) -->
      <div
        v-else-if="!searchQuery && !isFilterActive && activeUncategorizedNotesCount === 0 && activeFolderNotesCount > 0"
        class="animate-fade-up flex-1 flex flex-col items-center justify-center border border-dashed py-10 text-center"
        style="border-color: var(--border); border-radius: 8px;"
      >
        <div
          class="mb-4 p-4 border"
          style="background: var(--bg-raised); border-color: var(--border); border-radius: 12px;"
        >
          <Folder class="h-7 w-7" style="color: var(--text-secondary);" />
        </div>
        <p class="font-mono text-sm" style="color: var(--text-muted);">// All notes in folders</p>
        <p class="font-mono text-xs mt-1 mb-5" style="color: var(--text-muted); opacity: 0.6;">
          Your active workspace notes are organized inside folders.
        </p>
        <PushButton variant="primary" class="hidden sm:inline-flex" @click="emit('create')">
          <Plus class="h-3.5 w-3.5" />
          New Note
        </PushButton>
      </div>

      <!-- System has notes, but all active notes are in archive -->
      <div
        v-else-if="!searchQuery && !isFilterActive && activeUncategorizedNotesCount === 0 && archivedNotesCount > 0"
        class="animate-fade-up flex-1 flex flex-col items-center justify-center border border-dashed py-10 text-center"
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
          <PushButton variant="primary" class="hidden sm:inline-flex" @click="emit('create')">
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
        class="animate-fade-up flex-1 flex flex-col items-center justify-center border border-dashed py-10 text-center"
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
    <div v-else class="space-y-6 pb-20 sm:pb-6">
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
          <TransitionGroup
            :key="viewMode"
            tag="div"
            :class="viewMode === 'grid' ? 'grid gap-3 sm:grid-cols-2 lg:grid-cols-3' : 'flex flex-col gap-2'"
            name="note-card-stack"
          >
            <NoteCard
              v-for="(note) in pinnedNotes"
              :key="note.id"
              :note="note"
              :view-mode="viewMode"
              :note-number="noteSequenceMap[note.id]"
              :is-select-mode="isSelectMode"
              :is-selected="selectedNoteIds.includes(note.id)"
              :selected-note-ids="selectedNoteIds"
              :selected-notes="notes.filter(n => selectedNoteIds.includes(n.id))"
              class="animate-fade-up"
              @edit="emit('edit', $event)"
              @delete="emit('delete', $event)"
              @toggle-pin="emit('toggle-pin', $event)"
              @archive="emit('archive', $event)"
              @restore="emit('restore', $event)"
              @toggle-select="toggleNoteSelection"
            />
          </TransitionGroup>
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
          <TransitionGroup
            :key="viewMode"
            tag="div"
            :class="viewMode === 'grid' ? 'grid gap-3 sm:grid-cols-2 lg:grid-cols-3' : 'flex flex-col gap-2'"
            name="note-card-stack"
          >
            <NoteCard
              v-for="(note, index) in paginatedUnpinnedNotes"
              :key="note.id"
              :note="note"
              :view-mode="viewMode"
              :note-number="noteSequenceMap[note.id]"
              :is-select-mode="isSelectMode"
              :is-selected="selectedNoteIds.includes(note.id)"
              :selected-note-ids="selectedNoteIds"
              :selected-notes="notes.filter(n => selectedNoteIds.includes(n.id))"
              :class="`animate-fade-up ${staggerClass(index)}`"
              @edit="emit('edit', $event)"
              @delete="emit('delete', $event)"
              @toggle-pin="emit('toggle-pin', $event)"
              @archive="emit('archive', $event)"
              @restore="emit('restore', $event)"
              @toggle-select="toggleNoteSelection"
            />
          </TransitionGroup>
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
        class="fixed bottom-6 left-1/2 z-50 flex items-center gap-2 sm:gap-3 px-3.5 sm:px-5 py-2.5 border rounded-xl shadow-2xl font-mono text-xs select-none max-w-[calc(100vw-32px)] overflow-x-auto scrollbar-none"
        style="transform: translate(-50%, 0); background: var(--bg-surface); border-color: var(--accent); box-shadow: 0 12px 40px rgba(0,0,0,0.4);"
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
            style="background: rgba(16, 185, 129, 0.08); border-color: #10b981; color: #10b981;"
            @click="handleBatchRestore"
          >
            Restore ({{ selectedNoteIds.length }})
          </button>

          <button
            v-else
            type="button"
            class="px-2.5 py-1 text-[11px] border rounded transition-all hover:opacity-90 cursor-pointer"
            style="background: rgba(254, 152, 11, 0.08); border-color: #fe980b; color: #fe980b;"
            @click="handleBatchArchive"
          >
            Archive ({{ selectedNoteIds.length }})
          </button>

          <button
            v-if="!showArchived"
            type="button"
            class="px-2.5 py-1 text-[11px] border rounded transition-all hover:opacity-90 cursor-pointer"
            style="background: rgba(16, 185, 129, 0.08); border-color: #10b981; color: #10b981;"
            @click="openMoveFolderModal"
          >
            Move to Folder
          </button>

          <button
            type="button"
            class="px-2.5 py-1 text-[11px] border rounded transition-all hover:opacity-90 cursor-pointer"
            style="background: rgba(239, 68, 68, 0.08); border-color: #ef4444; color: #ef4444;"
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

    <!-- Mobile Floating Action Button (FAB) for New Note -->
    <div class="sm:hidden fixed bottom-14 right-4 z-40">
      <PushButton
        variant="primary"
        class="!p-3.5 !rounded-xl shadow-2xl"
        title="Create New Note"
        @click="emit('create')"
      >
        <Plus class="h-6 w-6 stroke-[2.5]" />
      </PushButton>
    </div>

    <!-- Move to Folder Modal -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="showMoveModal" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);" @click.self="showMoveModal = false">
          <div class="animate-scale-in w-full max-w-sm border" style="background: var(--bg-surface); border-color: var(--border); border-radius: 8px; overflow: hidden;">
            <!-- header -->
            <div class="flex items-center justify-between border-b px-5 py-4" style="border-color: var(--border);">
              <div class="flex items-center gap-2.5">
                <Folder class="h-4 w-4 shrink-0" style="color: var(--accent);" />
                <h3 class="text-sm font-semibold" style="color: var(--text-primary);">Move to Folder</h3>
              </div>
              <button type="button" class="transition-colors" style="color: var(--text-muted);" @click="showMoveModal = false">
                <X class="h-4 w-4" />
              </button>
            </div>

            <!-- body -->
            <div class="px-5 py-4 flex flex-col gap-2 max-h-60 overflow-y-auto text-xs">
              <!-- All Notes option -->
              <button
                type="button"
                class="flex items-center gap-3 p-3 w-full border text-left rounded-lg transition-colors cursor-pointer"
                style="background: var(--bg-raised); border-color: var(--border); color: var(--text-primary);"
                @click="moveSelectedNotes(null)"
              >
                <FileText class="h-4 w-4" style="color: var(--text-muted);" />
                <div class="flex-1">
                  <p class="font-semibold">All Notes</p>
                  <p class="text-[10px] opacity-75" style="color: var(--text-muted);">Remove from current folder</p>
                </div>
              </button>

              <!-- folder options -->
              <button
                v-for="folder in folders"
                :key="folder.id"
                type="button"
                class="flex items-center gap-3 p-3 w-full border text-left rounded-lg transition-colors cursor-pointer"
                style="background: var(--bg-raised); border-color: var(--border); color: var(--text-primary);"
                @click="moveSelectedNotes(folder.id)"
              >
                <Folder class="h-4 w-4 shrink-0" :style="{ color: folder.color, fill: folder.color + '1a' }" />
                <div class="flex-1 min-w-0">
                  <p class="font-semibold truncate">{{ folder.name }}</p>
                  <p v-if="folder.is_locked" class="text-[10px] opacity-50" style="color: var(--text-muted);">Locked folder</p>
                </div>
              </button>
            </div>

            <!-- footer -->
            <div class="flex items-center justify-end border-t px-5 py-4" style="border-color: var(--border);">
              <button
                type="button"
                class="px-4 py-2 text-xs font-medium border transition-colors"
                style="background: var(--bg-raised); border-color: var(--border); color: var(--text-secondary);"
                @click="showMoveModal = false"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
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
  transform: translate(-50%, 16px);
}
.warn-toast-enter-to,
.warn-toast-leave-from {
  opacity: 1;
  transform: translate(-50%, 0);
}

/* Note card stack transitions for disappearing and sliding in place */
.note-card-stack-enter-active,
.note-card-stack-leave-active {
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}
.note-card-stack-enter-from,
.note-card-stack-leave-to {
  opacity: 0;
  transform: scale(0.92) translateY(12px);
}
.note-card-stack-move {
  transition: transform 0.35s cubic-bezier(0.25, 0.8, 0.25, 1);
}
</style>
