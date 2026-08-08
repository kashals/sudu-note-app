<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { FileText, AlertCircle, CheckCircle2, X, Sun, Moon, Keyboard, Loader2, Check, RefreshCw } from '@lucide/vue';
import type { Note, CreateNoteDto } from './types/note';
import { getNotes, createNote, updateNote, deleteNote } from './services/api';
import NoteList from './components/NoteList.vue';
import NoteForm from './components/NoteForm.vue';
import ConfirmModal from './components/ConfirmModal.vue';
import FolderSidebar from './components/sidebar/FolderSidebar.vue';
import { useToast } from './composables/useToast';
import { useTheme } from './composables/useTheme';
import { useFolderState } from './composables/useFolderState';

// ─── note state ──────────────────────────────────────────────
const notes = ref<Note[]>([]);
const isLoading = ref(false);
const isFormOpen = ref(false);
const noteToEdit = ref<Note | null>(null);
const isSubmittingForm = ref(false);
const noteFormRef = ref<{ requestClose: () => void } | null>(null);

// ─── delete state ─────────────────────────────────────────────
const isDeleteModalOpen = ref(false);
const noteToDelete = ref<Note | null>(null);
const isDeleting = ref(false);

// ─── archive state ────────────────────────────────────────────
const isArchiveModalOpen = ref(false);
const noteToArchive = ref<Note | null>(null);
const isArchiving = ref(false);

// ─── batch operations confirmation state ──────────────────────
const isBatchDelete = ref(false);
const isBatchArchive = ref(false);
const batchNoteIds = ref<string[]>([]);

const deleteModalTitle = computed(() => isBatchDelete.value ? 'Delete Multiple Notes Forever' : 'Delete Note Forever');
const deleteModalMessage = computed(() => {
  if (isBatchDelete.value) {
    return `Are you sure you want to delete these ${batchNoteIds.value.length} notes permanently? This action is permanent and cannot be undone.`;
  }
  return `Permanently delete '${noteToDelete.value?.title || 'Untitled Note'}'? This action is permanent and cannot be undone.`;
});

const archiveModalTitle = computed(() => isBatchArchive.value ? 'Move Multiple Notes to Archive' : 'Move to Archive');
const archiveModalMessage = computed(() => {
  if (isBatchArchive.value) {
    return `Are you sure you want to archive these ${batchNoteIds.value.length} notes? You can restore them later from the Archive view.`;
  }
  return `Are you sure you want to archive '${noteToArchive.value?.title || 'Untitled Note'}'? You can view, restore, or delete it forever from the Archive view.`;
});

// ─── feedback & theme composables ────────────────────────────
const connectionError = ref<string | null>(null);
const formError = ref<string | null>(null);
const { toastMessage, toastType, showToast, dismissToast } = useToast();
const { isDark, toggleTheme, initTheme } = useTheme();

// ─── folder state ─────────────────────────────────────────────
const {
  activeFolderId,
  activeFolder,
  loadFolders,
  updateFolderNoteCount
} = useFolderState();

// ─── refresh state ────────────────────────────────────────────
const refreshState = ref<'idle' | 'loading' | 'success'>('idle');
let refreshSuccessTimer: ReturnType<typeof setTimeout> | null = null;

async function handleRefresh() {
  if (refreshState.value === 'loading') return;
  refreshState.value = 'loading';
  if (refreshSuccessTimer) clearTimeout(refreshSuccessTimer);
  try {
    await fetchNotes();
    refreshState.value = 'success';
    refreshSuccessTimer = setTimeout(() => {
      refreshState.value = 'idle';
    }, 2000);
  } catch {
    refreshState.value = 'idle';
  }
}

// ─── agent state ──────────────────────────────────────────
const agentStatus = ref<'idle' | 'syncing'>('idle');
const isShortcutsOpen = ref(false);
let agentTimer: ReturnType<typeof setTimeout> | null = null;

// ─── breadcrumb ───────────────────────────────────────────────
const breadcrumb = computed(() => {
  if (isFormOpen.value) {
    return ['System', 'Notes', noteToEdit.value ? 'Edit' : 'New'];
  }
  if (isDeleteModalOpen.value) return ['System', 'Notes', 'Delete Forever'];
  if (isArchiveModalOpen.value) return ['System', 'Notes', 'Archive'];
  return ['System', 'Notes'];
});

// ─── agent helpers ────────────────────────────────────────────
function agentSync() {
  if (agentTimer) clearTimeout(agentTimer);
  agentStatus.value = 'syncing';
}

function agentIdle(delay = 1400) {
  if (agentTimer) clearTimeout(agentTimer);
  agentTimer = setTimeout(() => { agentStatus.value = 'idle'; }, delay);
}


// ─── keyboard shortcuts ───────────────────────────────────────
function handleGlobalKeydown(e: KeyboardEvent) {
  const isInput = document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA';
  
  // Toggle help modal when pressing '?'
  if (e.key === '?' && !isInput) {
    e.preventDefault();
    isShortcutsOpen.value = !isShortcutsOpen.value;
    return;
  }

  // Ctrl+K / Cmd+K → focus search bar
  const mod = e.metaKey || e.ctrlKey;
  if (mod && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    const searchInput = document.querySelector('.input-search') as HTMLInputElement;
    if (searchInput) {
      searchInput.focus();
      searchInput.select();
    }
    return;
  }

  // '/' → focus search bar (when not typing)
  if (e.key === '/' && !isInput) {
    e.preventDefault();
    const searchInput = document.querySelector('.input-search') as HTMLInputElement;
    if (searchInput) {
      searchInput.focus();
      searchInput.select();
    }
    return;
  }

  // Alt+N → new note (only when no modal is open)
  if (e.altKey && e.key.toLowerCase() === 'n' && !isFormOpen.value && !isDeleteModalOpen.value) {
    e.preventDefault();
    openCreateModal();
    return;
  }

  // Alt+R → refresh notes
  if (e.altKey && e.key.toLowerCase() === 'r') {
    e.preventDefault();
    fetchNotes();
    return;
  }

  // Escape → close any open modal or blur active inputs
  if (e.key === 'Escape') {
    if (isFormOpen.value) {
      // Delegate to NoteForm's guard which checks for dirty state
      noteFormRef.value?.requestClose();
    } else if (isDeleteModalOpen.value) {
      isDeleteModalOpen.value = false;
    } else if (isShortcutsOpen.value) {
      isShortcutsOpen.value = false;
    } else if (isInput) {
      (document.activeElement as HTMLElement)?.blur();
    }
  }
}

// ─── sorting helper ───────────────────────────────────────────
function sortNotes() {
  notes.value.sort((a, b) => {
    if (b.is_pinned !== a.is_pinned) {
      return b.is_pinned - a.is_pinned;
    }
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });
}

// ─── fetch ────────────────────────────────────────────────────
async function fetchNotes() {
  isLoading.value = true;
  connectionError.value = null;
  try {
    notes.value = await getNotes();
    sortNotes();
  } catch (err: any) {
    connectionError.value = err.message || 'Failed to connect to backend service';
  } finally {
    isLoading.value = false;
  }
}

// ─── create (optimistic) ──────────────────────────────────────
function openCreateModal() {
  noteToEdit.value = null;
  formError.value = null;
  isFormOpen.value = true;
}

function openEditModal(note: Note) {
  noteToEdit.value = note;
  formError.value = null;
  isFormOpen.value = true;
}

async function handleFormSubmit(payload: CreateNoteDto) {
  isSubmittingForm.value = true;
  formError.value = null;
  agentSync();

  if (noteToEdit.value) {
    // ── optimistic update ──
    const targetId = noteToEdit.value.id;
    const index = notes.value.findIndex((n) => n.id === targetId);
    const original: Note | null = index !== -1 ? { ...notes.value[index] } as Note : null;

    if (index !== -1) {
      const currentNote = notes.value[index] as Note;
      const updatedNotes = [...notes.value];
      updatedNotes[index] = {
        ...currentNote,
        title: payload.title,
        content: payload.content,
        category: payload.category ?? currentNote.category,
        is_pinned: payload.is_pinned ?? currentNote.is_pinned,
        is_archived: payload.is_archived ?? currentNote.is_archived,
        tags: payload.tags ?? currentNote.tags,
        updated_at: new Date().toISOString(),
      } as Note;
      notes.value = updatedNotes;
      sortNotes();
    }

    isFormOpen.value = false;

    try {
      const updated = await updateNote(targetId, payload);
      const i = notes.value.findIndex((n) => n.id === updated.id);
      if (i !== -1) {
        const updatedNotes = [...notes.value];
        updatedNotes[i] = updated;
        notes.value = updatedNotes;
      }
      sortNotes();
      showToast('Note updated');
      agentIdle();
    } catch (err: any) {
      // revert
      if (original && index !== -1) {
        const updatedNotes = [...notes.value];
        updatedNotes[index] = original;
        notes.value = updatedNotes;
      }
      sortNotes();
      showToast('Reverting...', 'error');
      agentIdle(0);
    }

  } else {
    // ── optimistic create ──
    const tempId = `temp_${Date.now()}`;
    const tempNote: Note = {
      id: tempId,
      title: payload.title,
      content: payload.content,
      category: payload.category ?? 'Personal',
      is_pinned: payload.is_pinned ?? 0,
      is_archived: payload.is_archived ?? 0,
      tags: payload.tags ?? '[]',
      folder_id: activeFolderId.value,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    notes.value = [tempNote, ...notes.value];
    sortNotes();
    isFormOpen.value = false;

    try {
      const created = await createNote({
        ...payload,
        folder_id: activeFolderId.value
      });
      const i = notes.value.findIndex((n) => n.id === tempId);
      if (i !== -1) {
        const updatedNotes = [...notes.value];
        updatedNotes[i] = created;
        notes.value = updatedNotes;
      }
      // update sidebar count
      if (activeFolderId.value) updateFolderNoteCount(activeFolderId.value, 1);
      sortNotes();
      showToast('Note created');
      agentIdle();
    } catch (err: any) {
      // revert
      notes.value = notes.value.filter((n) => n.id !== tempId);
      sortNotes();
      showToast('Reverting...', 'error');
      agentIdle(0);
    }
  }

  isSubmittingForm.value = false;
}

// ─── auto-save (silent, no close) ────────────────────────────
async function handleAutoSave(payload: CreateNoteDto) {
  if (!noteToEdit.value) return;
  const targetId = noteToEdit.value.id;
  const index = notes.value.findIndex((n) => n.id === targetId);
  if (index === -1) return;

  // Optimistically update the in-memory list without closing form
  const currentNote = notes.value[index] as Note;
  const updatedNotes = [...notes.value];
  updatedNotes[index] = {
    ...currentNote,
    title: payload.title,
    content: payload.content,
    category: payload.category ?? currentNote.category,
    is_pinned: payload.is_pinned ?? currentNote.is_pinned,
    is_archived: payload.is_archived ?? currentNote.is_archived,
    tags: payload.tags ?? currentNote.tags,
    updated_at: new Date().toISOString(),
  } as Note;
  notes.value = updatedNotes;

  try {
    const updated = await updateNote(targetId, payload);
    const i = notes.value.findIndex((n) => n.id === updated.id);
    if (i !== -1) {
      const fresh = [...notes.value];
      fresh[i] = updated;
      notes.value = fresh;
    }
    sortNotes();
  } catch {
    // Silent failure — user can still manually save
  }
}

// ─── toggle pin (optimistic) ──────────────────────────────────
async function handleTogglePin(note: Note) {
  agentSync();
  const originalPinned = note.is_pinned;
  const newPinned = originalPinned === 1 ? 0 : 1;

  const index = notes.value.findIndex((n) => n.id === note.id);
  if (index !== -1) {
    const currentNote = notes.value[index] as Note;
    const updatedNotes = [...notes.value];
    updatedNotes[index] = {
      ...currentNote,
      is_pinned: newPinned,
      updated_at: new Date().toISOString()
    } as Note;
    notes.value = updatedNotes;
    sortNotes();
  }

  try {
    const updated = await updateNote(note.id, {
      title: note.title,
      content: note.content,
      category: note.category,
      is_pinned: newPinned,
      is_archived: note.is_archived,
      tags: note.tags
    });
    const i = notes.value.findIndex((n) => n.id === updated.id);
    if (i !== -1) {
      const updatedNotes = [...notes.value];
      updatedNotes[i] = updated;
      notes.value = updatedNotes;
    }
    sortNotes();
    showToast(newPinned === 1 ? 'Note pinned' : 'Note unpinned');
    agentIdle();
  } catch (err: any) {
    // revert
    if (index !== -1) {
      const currentNote = notes.value[index] as Note;
      const updatedNotes = [...notes.value];
      updatedNotes[index] = {
        ...currentNote,
        is_pinned: originalPinned
      } as Note;
      notes.value = updatedNotes;
      sortNotes();
    }
    showToast('Reverting...', 'error');
    agentIdle(0);
  }
}

// ─── archive note (optimistic) ────────────────────────────────
function openArchiveModal(note: Note) {
  noteToArchive.value = note;
  isArchiveModalOpen.value = true;
}

async function handleConfirmArchive() {
  if (isBatchArchive.value) {
    isArchiving.value = true;
    try {
      await handleBatchArchive(batchNoteIds.value);
      isArchiveModalOpen.value = false;
      batchNoteIds.value = [];
      isBatchArchive.value = false;
    } finally {
      isArchiving.value = false;
    }
    return;
  }

  if (!noteToArchive.value) return;
  isArchiving.value = true;
  agentSync();

  const target = { ...noteToArchive.value };
  const targetIndex = notes.value.findIndex((n) => n.id === target.id);
  const originalNotes = [...notes.value];

  // optimistic archive
  notes.value = notes.value.map(n => n.id === target.id ? { ...n, is_archived: 1, is_pinned: 0 } : n);
  sortNotes();
  if (target.folder_id) updateFolderNoteCount(target.folder_id, -1);
  isArchiveModalOpen.value = false;
  noteToArchive.value = null;

  try {
    await updateNote(target.id, {
      title: target.title,
      content: target.content,
      category: target.category,
      is_pinned: 0,
      is_archived: 1,
      tags: target.tags
    });
    await loadFolders();
    showToast('Note moved to archive');
    agentIdle();
  } catch (err: any) {
    notes.value = originalNotes;
    sortNotes();
    await loadFolders();
    showToast('Reverting...', 'error');
    agentIdle(0);
  } finally {
    isArchiving.value = false;
  }
}

// ─── restore note (optimistic) ────────────────────────────────
async function handleRestoreNote(note: Note) {
  agentSync();
  const originalNotes = [...notes.value];

  // optimistic restore
  notes.value = notes.value.map(n => n.id === note.id ? { ...n, is_archived: 0 } : n);
  sortNotes();
  if (note.folder_id) updateFolderNoteCount(note.folder_id, 1);

  try {
    await updateNote(note.id, {
      title: note.title,
      content: note.content,
      category: note.category,
      is_pinned: note.is_pinned,
      is_archived: 0,
      tags: note.tags
    });
    await loadFolders();
    showToast('Note restored to workspace');
    agentIdle();
  } catch (err: any) {
    notes.value = originalNotes;
    sortNotes();
    await loadFolders();
    showToast('Reverting...', 'error');
    agentIdle(0);
  }
}

// ─── batch operations (optimistic) ─────────────────────────────
async function handleBatchArchive(noteIds: string[]) {
  if (noteIds.length === 0) return;
  agentSync();
  const originalNotes = [...notes.value];

  notes.value = notes.value.map(n => noteIds.includes(n.id) ? { ...n, is_archived: 1, is_pinned: 0 } : n);
  sortNotes();

  // Optimistic count offset
  noteIds.forEach(id => {
    const n = originalNotes.find(item => item.id === id);
    if (n && n.folder_id && n.is_archived === 0) {
      updateFolderNoteCount(n.folder_id, -1);
    }
  });

  try {
    await Promise.all(noteIds.map(id => {
      const target = originalNotes.find(n => n.id === id);
      if (!target) return Promise.resolve();
      return updateNote(String(id), {
        title: target.title,
        content: target.content,
        category: target.category,
        is_pinned: 0,
        is_archived: 1,
        tags: target.tags
      });
    }));
    await loadFolders();
    showToast(`${noteIds.length} notes moved to archive`);
    agentIdle();
  } catch (err: any) {
    notes.value = originalNotes;
    sortNotes();
    await loadFolders();
    showToast('Failed to archive notes', 'error');
    agentIdle(0);
  }
}

async function handleBatchRestore(noteIds: string[]) {
  if (noteIds.length === 0) return;
  agentSync();
  const originalNotes = [...notes.value];

  notes.value = notes.value.map(n => noteIds.includes(n.id) ? { ...n, is_archived: 0 } : n);
  sortNotes();

  // Optimistic count offset
  noteIds.forEach(id => {
    const n = originalNotes.find(item => item.id === id);
    if (n && n.folder_id && n.is_archived === 1) {
      updateFolderNoteCount(n.folder_id, 1);
    }
  });

  try {
    await Promise.all(noteIds.map(id => {
      const target = originalNotes.find(n => n.id === id);
      if (!target) return Promise.resolve();
      return updateNote(String(id), {
        title: target.title,
        content: target.content,
        category: target.category,
        is_pinned: target.is_pinned,
        is_archived: 0,
        tags: target.tags
      });
    }));
    await loadFolders();
    showToast(`${noteIds.length} notes restored`);
    agentIdle();
  } catch (err: any) {
    notes.value = originalNotes;
    sortNotes();
    await loadFolders();
    showToast('Failed to restore notes', 'error');
    agentIdle(0);
  }
}

async function handleBatchDelete(noteIds: string[]) {
  if (noteIds.length === 0) return;
  agentSync();
  const originalNotes = [...notes.value];

  notes.value = notes.value.filter(n => !noteIds.includes(n.id));
  sortNotes();

  // Optimistic count offset
  noteIds.forEach(id => {
    const n = originalNotes.find(item => item.id === id);
    if (n && n.folder_id && n.is_archived === 0) {
      updateFolderNoteCount(n.folder_id, -1);
    }
  });

  try {
    await Promise.all(noteIds.map(id => deleteNote(String(id))));
    await loadFolders();
    showToast(`${noteIds.length} notes deleted permanently`);
    agentIdle();
  } catch (err: any) {
    notes.value = originalNotes;
    sortNotes();
    await loadFolders();
    showToast('Failed to delete notes', 'error');
    agentIdle(0);
  }
}

// ─── delete forever (optimistic) ──────────────────────────────
function openDeleteModal(note: Note) {
  noteToDelete.value = note;
  isDeleteModalOpen.value = true;
}

async function handleConfirmDelete() {
  if (isBatchDelete.value) {
    isDeleting.value = true;
    try {
      await handleBatchDelete(batchNoteIds.value);
      isDeleteModalOpen.value = false;
      batchNoteIds.value = [];
      isBatchDelete.value = false;
    } finally {
      isDeleting.value = false;
    }
    return;
  }

  if (!noteToDelete.value) return;
  isDeleting.value = true;
  agentSync();

  const target: Note = { ...noteToDelete.value };
  const targetIndex = notes.value.findIndex((n) => n.id === target.id);

  // optimistic remove
  notes.value = notes.value.filter((n) => n.id !== target.id);
  if (target.folder_id && target.is_archived === 0) {
    updateFolderNoteCount(target.folder_id, -1);
  }
  isDeleteModalOpen.value = false;
  noteToDelete.value = null;

  try {
    await deleteNote(target.id);
    await loadFolders();
    showToast('Note deleted permanently');
    agentIdle();
  } catch (err: any) {
    // revert
    if (targetIndex !== -1) {
      notes.value = [...notes.value];
      notes.value.splice(targetIndex, 0, target);
      sortNotes();
    }
    await loadFolders();
    showToast('Reverting...', 'error');
    agentIdle(0);
  } finally {
    isDeleting.value = false;
  }
}

function triggerBatchDelete(noteIds: string[]) {
  batchNoteIds.value = noteIds;
  isBatchDelete.value = true;
  isDeleteModalOpen.value = true;
}

function triggerBatchArchive(noteIds: string[]) {
  batchNoteIds.value = noteIds;
  isBatchArchive.value = true;
  isArchiveModalOpen.value = true;
}

function dismissConnectionError() { connectionError.value = null; }

// ─── move note to folder (drag-drop and batch) ─────────────────────
async function handleMoveNote(noteIdOrJson: string, targetFolderId: string | null) {
  let noteIds: string[] = [];
  try {
    if (noteIdOrJson.startsWith('[')) {
      noteIds = JSON.parse(noteIdOrJson);
    } else {
      noteIds = [noteIdOrJson];
    }
  } catch {
    noteIds = [noteIdOrJson];
  }

  if (noteIds.length === 0) return;
  agentSync();

  const originalNotes = JSON.parse(JSON.stringify(notes.value));

  // Filter notes that are not already in targetFolderId
  const targetsToMove = noteIds.filter(id => {
    const note = notes.value.find(n => n.id === id);
    return note && note.folder_id !== targetFolderId;
  });

  if (targetsToMove.length === 0) {
    agentIdle();
    return;
  }

  // Count offsets per folder for sidebars
  const oldFolderCounts: Record<string, number> = {};
  targetsToMove.forEach(id => {
    const note = notes.value.find(n => n.id === id);
    if (note) {
      const prevId = note.folder_id || 'none';
      oldFolderCounts[prevId] = (oldFolderCounts[prevId] || 0) + 1;
    }
  });

  // optimistic update
  notes.value = notes.value.map(n => targetsToMove.includes(n.id) ? { ...n, folder_id: targetFolderId } : n);
  
  // update sidebar count refs
  Object.entries(oldFolderCounts).forEach(([prevId, count]) => {
    if (prevId !== 'none') {
      updateFolderNoteCount(prevId, -count);
    }
  });
  updateFolderNoteCount(targetFolderId, targetsToMove.length);

  try {
    await Promise.all(targetsToMove.map(async (id) => {
      const note = originalNotes.find((n: Note) => n.id === id);
      if (note) {
        await updateNote(id, {
          title: note.title,
          content: note.content,
          folder_id: targetFolderId,
          category: note.category,
          is_pinned: note.is_pinned,
          is_archived: note.is_archived,
          tags: note.tags
        });
      }
    }));
    showToast(
      targetsToMove.length === 1
        ? (targetFolderId ? 'Note moved to folder' : 'Note moved to All Notes')
        : `${targetsToMove.length} notes moved successfully`
    );
    agentIdle();
  } catch {
    // revert
    notes.value = originalNotes;
    await loadFolders();
    showToast('Failed to move notes', 'error');
    agentIdle(0);
  }
}

async function handleBatchMoveFolder({ noteIds, folderId }: { noteIds: string[]; folderId: string | null }) {
  await handleMoveNote(JSON.stringify(noteIds), folderId);
}

// ─── lifecycle ────────────────────────────────────────────────
onMounted(() => {
  initTheme();
  document.addEventListener('keydown', handleGlobalKeydown);
  fetchNotes();
  loadFolders();
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleGlobalKeydown);
});
</script>

<template>
  <div class="h-screen flex flex-col font-sans overflow-hidden" style="background: var(--bg-base); color: var(--text-primary);">

    <!-- connection error banner -->
    <Transition
      enter-active-class="animate-slide-down"
      leave-active-class="transition-all duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0 -translate-y-full"
    >
      <div
        v-if="connectionError"
        class="fixed top-0 left-0 right-0 z-50 flex items-center justify-between gap-3 px-4 py-2.5 border-b"
        style="background: var(--bg-raised); border-color: #7f1d1d; backdrop-filter: blur(8px);"
      >
        <div class="flex items-center gap-2 text-xs" style="color: #fca5a5;">
          <AlertCircle class="h-3.5 w-3.5 shrink-0" style="color: #f87171;" />
          <span class="font-mono">// {{ connectionError }}</span>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <button
            class="font-mono text-[11px] px-2.5 py-1 border transition-colors"
            style="border-color: #7f1d1d; color: #fca5a5;"
            @click="fetchNotes"
          >retry</button>
          <button style="color: #f87171;" @click="dismissConnectionError">
            <X class="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </Transition>

    <!-- ─── header ─── -->
    <header
      class="sticky top-0 z-40 border-b"
      :style="{
        background: 'var(--bg-surface)',
        borderColor: 'var(--border)',
        backdropFilter: 'blur(12px)',
      }"
    >
      <div class="px-6 h-14 flex items-center justify-between w-full">
        <!-- logo -->
        <div class="flex items-center gap-3">
          <div
            class="p-1.5 border"
            style="background: var(--accent-glow); border-color: var(--accent); border-radius: 6px;"
          >
            <FileText class="h-4 w-4" style="color: var(--accent);" />
          </div>
          <div>
            <h1 class="text-xs font-bold tracking-widest uppercase" style="color: var(--text-primary);">
              SuDu Notes
            </h1>
            <p class="font-mono text-[10px] mt-0.5" style="color: var(--text-muted);">
              file management system
            </p>
          </div>
        </div>

        <!-- right badges -->
        <div class="flex items-center gap-2 font-mono text-[11px]">
          <!-- refresh workspace -->
          <button
            class="p-2 border transition-colors flex items-center justify-center shrink-0 cursor-pointer"
            :disabled="isLoading"
            :title="refreshState === 'success' ? 'Up to date' : refreshState === 'loading' ? 'Refreshing...' : 'Refresh workspace'"
            style="background: var(--bg-raised); border-color: var(--border); color: var(--text-secondary); width: 34px; height: 34px;"
            @click="handleRefresh"
          >
            <Loader2 v-if="refreshState === 'loading'" class="h-4 w-4 animate-spin text-emerald-400" />
            <Check v-else-if="refreshState === 'success'" class="h-4 w-4 text-emerald-400" />
            <RefreshCw v-else class="h-4 w-4" />
          </button>

          <!-- theme toggle -->
          <button
            class="p-2 border transition-colors cursor-pointer"
            :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
            style="background: var(--bg-raised); border-color: var(--border); color: var(--text-secondary); width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;"
            @click="toggleTheme"
          >
            <Sun v-if="isDark" class="h-4 w-4" />
            <Moon v-else class="h-4 w-4" />
          </button>

          <!-- shortcuts help button -->
          <button
            class="p-2 border transition-colors flex items-center justify-center font-bold cursor-pointer"
            title="Keyboard Shortcuts (?)"
            style="background: var(--bg-raised); border-color: var(--border); color: var(--text-secondary); width: 34px; height: 34px;"
            @click="isShortcutsOpen = true"
          >
            ?
          </button>
        </div>
      </div>
    </header>

    <!-- ─── main ─── -->
    <main class="flex flex-1 w-full overflow-hidden">
      <!-- Folder sidebar -->
      <FolderSidebar
        :notes="notes"
        @move-note="handleMoveNote"
      />
      <!-- Note list area -->
      <div class="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-7 flex flex-col">
        <NoteList
          :notes="notes"
          :is-loading="isLoading"
          :active-folder-id="activeFolderId"
          :active-folder-name="activeFolder?.name ?? null"
          @create="openCreateModal"
          @edit="openEditModal"
          @delete="openDeleteModal"
          @toggle-pin="handleTogglePin"
          @archive="openArchiveModal"
          @restore="handleRestoreNote"
          @batch-archive="triggerBatchArchive"
          @batch-restore="handleBatchRestore"
          @batch-delete="triggerBatchDelete"
          @batch-move-folder="handleBatchMoveFolder"
        />
      </div>
    </main>

    <!-- ─── footer ─── -->
    <footer
      class="border-t py-3 text-center font-mono text-[11px]"
      style="background: var(--bg-surface); border-color: var(--border); color: var(--text-muted);"
    >
      sudu.ai · file management system · aakash pai
    </footer>

    <!-- ─── modals ─── -->
    <NoteForm
      ref="noteFormRef"
      :is-open="isFormOpen"
      :note-to-edit="noteToEdit"
      :is-submitting="isSubmittingForm"
      :server-error="formError"
      @submit="handleFormSubmit"
      @autosave="handleAutoSave"
      @cancel="isFormOpen = false"
    />

    <ConfirmModal
      :is-open="isDeleteModalOpen"
      :title="deleteModalTitle"
      :message="deleteModalMessage"
      confirm-label="Delete Forever"
      confirm-variant="danger"
      :is-processing="isDeleting"
      @confirm="handleConfirmDelete"
      @cancel="isDeleteModalOpen = false; isBatchDelete = false;"
    />

    <ConfirmModal
      :is-open="isArchiveModalOpen"
      :title="archiveModalTitle"
      :message="archiveModalMessage"
      confirm-label="Move to Archive"
      confirm-variant="warning"
      :is-processing="isArchiving"
      @confirm="handleConfirmArchive"
      @cancel="isArchiveModalOpen = false; isBatchArchive = false;"
    />

    <!-- Keyboard Shortcuts Modal -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isShortcutsOpen"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        style="background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);"
        @click.self="isShortcutsOpen = false"
      >
        <div
          class="animate-scale-in w-full max-w-sm border"
          style="background: var(--bg-surface); border-color: var(--border);"
        >
          <div class="flex items-center justify-between border-b px-5 py-4" style="border-color: var(--border-subtle);">
            <div class="flex items-center gap-2">
              <Keyboard class="h-4 w-4" style="color: var(--accent);" />
              <h3 class="text-sm font-semibold" style="color: var(--text-primary);">Keyboard Shortcuts</h3>
            </div>
            <button
              type="button"
              class="transition-colors"
              style="color: var(--text-muted);"
              @click="isShortcutsOpen = false"
            >
              <X class="h-4 w-4" />
            </button>
          </div>
          <div class="p-5 space-y-3 font-mono text-xs">
            <div class="flex items-center justify-between py-1 border-b" style="border-color: var(--border-subtle);">
              <span style="color: var(--text-secondary);">Create Note</span>
              <span><kbd class="px-1.5 py-0.5 border rounded" style="border-color: var(--border); background: var(--bg-raised);">Alt</kbd> + <kbd class="px-1.5 py-0.5 border rounded" style="border-color: var(--border); background: var(--bg-raised);">N</kbd></span>
            </div>
            <div class="flex items-center justify-between py-1 border-b" style="border-color: var(--border-subtle);">
              <span style="color: var(--text-secondary);">Focus Search</span>
              <span><kbd class="px-1.5 py-0.5 border rounded" style="border-color: var(--border); background: var(--bg-raised);">Ctrl</kbd> + <kbd class="px-1.5 py-0.5 border rounded" style="border-color: var(--border); background: var(--bg-raised);">K</kbd> <span class="opacity-40">or</span> <kbd class="px-1.5 py-0.5 border rounded" style="border-color: var(--border); background: var(--bg-raised);">/</kbd></span>
            </div>
            <div class="flex items-center justify-between py-1 border-b" style="border-color: var(--border-subtle);">
              <span style="color: var(--text-secondary);">Save Note</span>
              <span><kbd class="px-1.5 py-0.5 border rounded" style="border-color: var(--border); background: var(--bg-raised);">Ctrl</kbd> + <kbd class="px-1.5 py-0.5 border rounded" style="border-color: var(--border); background: var(--bg-raised);">Enter</kbd></span>
            </div>
            <div class="flex items-center justify-between py-1 border-b" style="border-color: var(--border-subtle);">
              <span style="color: var(--text-secondary);">Refresh Workspace</span>
              <span><kbd class="px-1.5 py-0.5 border rounded" style="border-color: var(--border); background: var(--bg-raised);">Alt</kbd> + <kbd class="px-1.5 py-0.5 border rounded" style="border-color: var(--border); background: var(--bg-raised);">R</kbd></span>
            </div>
            <div class="flex items-center justify-between py-1">
              <span style="color: var(--text-secondary);">Shortcuts / Cancel</span>
              <span><kbd class="px-1.5 py-0.5 border rounded" style="border-color: var(--border); background: var(--bg-raised);">?</kbd> <span class="opacity-40">or</span> <kbd class="px-1.5 py-0.5 border rounded" style="border-color: var(--border); background: var(--bg-raised);">Esc</kbd></span>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ─── toast ─── -->
    <Transition
      enter-active-class="animate-slide-up-fade"
      leave-active-class="transition-all duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-2"
    >
      <div
        v-if="toastMessage"
        class="fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 text-xs border"
        :style="
          toastType === 'success'
            ? 'background: var(--bg-raised); border-color: var(--accent); color: var(--accent-light);'
            : 'background: var(--bg-raised); border-color: #7f1d1d; color: #fca5a5;'
        "
      >
        <CheckCircle2 v-if="toastType === 'success'" class="h-3.5 w-3.5 shrink-0" />
        <AlertCircle v-else class="h-3.5 w-3.5 shrink-0" />
        <span class="font-mono">{{ toastMessage }}</span>
        <button class="ml-1 opacity-60 hover:opacity-100 transition-opacity" @click="dismissToast">
          <X class="h-3 w-3" />
        </button>
      </div>
    </Transition>
  </div>
</template>
