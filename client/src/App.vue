<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { FileText, AlertCircle, CheckCircle2, ShieldCheck, X, Sun, Moon, Keyboard } from '@lucide/vue';
import type { Note, CreateNoteDto } from './types/note';
import { getNotes, createNote, updateNote, deleteNote } from './services/api';
import NoteList from './components/NoteList.vue';
import NoteForm from './components/NoteForm.vue';
import ConfirmModal from './components/ConfirmModal.vue';

// ─── note state ──────────────────────────────────────────────
const notes = ref<Note[]>([]);
const isLoading = ref(false);
const isFormOpen = ref(false);
const noteToEdit = ref<Note | null>(null);
const isSubmittingForm = ref(false);

// ─── delete state ─────────────────────────────────────────────
const isDeleteModalOpen = ref(false);
const noteToDelete = ref<Note | null>(null);
const isDeleting = ref(false);

// ─── feedback state ───────────────────────────────────────────
const connectionError = ref<string | null>(null);
const formError = ref<string | null>(null);
const toastMessage = ref<string | null>(null);
const toastType = ref<'success' | 'error'>('success');

// ─── agent + theme state ──────────────────────────────────────
const agentStatus = ref<'idle' | 'syncing'>('idle');
const isDark = ref(true);
const isShortcutsOpen = ref(false);

let toastTimer: ReturnType<typeof setTimeout> | null = null;
let agentTimer: ReturnType<typeof setTimeout> | null = null;

// ─── breadcrumb ───────────────────────────────────────────────
const breadcrumb = computed(() => {
  if (isFormOpen.value) {
    return ['System', 'Notes', noteToEdit.value ? 'Edit' : 'New'];
  }
  if (isDeleteModalOpen.value) return ['System', 'Notes', 'Delete'];
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

// ─── theme ────────────────────────────────────────────────────
function applyTheme(dark: boolean) {
  dark
    ? document.documentElement.classList.remove('light')
    : document.documentElement.classList.add('light');
}

function toggleTheme() {
  isDark.value = !isDark.value;
  applyTheme(isDark.value);
  localStorage.setItem('sudu_theme', isDark.value ? 'dark' : 'light');
}

// ─── toast ────────────────────────────────────────────────────
function showToast(message: string, type: 'success' | 'error' = 'success') {
  if (toastTimer) clearTimeout(toastTimer);
  toastMessage.value = message;
  toastType.value = type;
  toastTimer = setTimeout(() => { toastMessage.value = null; }, 4000);
}

function dismissToast() {
  if (toastTimer) clearTimeout(toastTimer);
  toastMessage.value = null;
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

  const mod = e.metaKey || e.ctrlKey;

  // Ctrl/Cmd+N → new note (only when no modal is open)
  if (mod && e.key === 'n' && !isFormOpen.value && !isDeleteModalOpen.value) {
    e.preventDefault();
    openCreateModal();
    return;
  }

  // Escape → close any open modal
  if (e.key === 'Escape') {
    if (isFormOpen.value)             isFormOpen.value = false;
    else if (isDeleteModalOpen.value) isDeleteModalOpen.value = false;
    else if (isShortcutsOpen.value)   isShortcutsOpen.value = false;
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
      category: payload.category ?? 'Document',
      is_pinned: payload.is_pinned ?? 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    notes.value = [tempNote, ...notes.value];
    sortNotes();
    isFormOpen.value = false;

    try {
      const created = await createNote(payload);
      const i = notes.value.findIndex((n) => n.id === tempId);
      if (i !== -1) {
        const updatedNotes = [...notes.value];
        updatedNotes[i] = created;
        notes.value = updatedNotes;
      }
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
      is_pinned: newPinned
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

// ─── delete (optimistic) ──────────────────────────────────────
function openDeleteModal(note: Note) {
  noteToDelete.value = note;
  isDeleteModalOpen.value = true;
}

async function handleConfirmDelete() {
  if (!noteToDelete.value) return;
  isDeleting.value = true;
  agentSync();

  const target: Note = { ...noteToDelete.value };
  const targetIndex = notes.value.findIndex((n) => n.id === target.id);

  // optimistic remove
  notes.value = notes.value.filter((n) => n.id !== target.id);
  isDeleteModalOpen.value = false;
  noteToDelete.value = null;

  try {
    await deleteNote(target.id);
    showToast('Note deleted');
    agentIdle();
  } catch (err: any) {
    // revert
    if (targetIndex !== -1) notes.value.splice(targetIndex, 0, target);
    sortNotes();
    showToast('Reverting...', 'error');
    agentIdle(0);
  } finally {
    isDeleting.value = false;
  }
}

function dismissConnectionError() { connectionError.value = null; }

// ─── lifecycle ────────────────────────────────────────────────
onMounted(() => {
  const saved = localStorage.getItem('sudu_theme');
  isDark.value = saved !== 'light';
  applyTheme(isDark.value);
  document.addEventListener('keydown', handleGlobalKeydown);
  fetchNotes();
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleGlobalKeydown);
});
</script>

<template>
  <div class="min-h-screen flex flex-col font-sans" style="background: var(--bg-base); color: var(--text-primary);">

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
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
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

        <!-- system health / AI agent status in center -->
        <div class="hidden md:flex items-center gap-2 font-mono text-[11px] px-3 py-1.5 border" style="background: var(--bg-raised); border-color: var(--border);">
          <span class="relative flex h-1.5 w-1.5">
            <span
              v-if="agentStatus === 'syncing'"
              class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
              style="background: var(--accent);"
            ></span>
            <span
              class="relative inline-flex rounded-full h-1.5 w-1.5 transition-colors duration-300"
              :style="agentStatus === 'syncing'
                ? 'background: var(--accent);'
                : 'background: var(--text-muted); opacity: 0.5;'"
            ></span>
          </span>
          <Transition name="fade" mode="out-in">
            <span
              :key="agentStatus"
              :style="agentStatus === 'syncing' ? 'color: var(--accent-light);' : 'color: var(--text-muted);'"
            >
              {{ agentStatus === 'syncing' ? 'AI Syncing...' : 'System Status: Active' }}
            </span>
          </Transition>
        </div>

        <!-- right badges -->
        <div class="flex items-center gap-2 font-mono text-[11px]">
          <!-- record count -->
          <div
            class="hidden sm:block px-2.5 py-1.5 border"
            style="background: var(--bg-raised); border-color: var(--border); color: var(--text-muted);"
          >
            {{ notes.length }} records
          </div>

          <!-- sqlite status -->
          <div
            class="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 border"
            style="background: var(--bg-raised); border-color: var(--border);"
          >
            <ShieldCheck class="h-3 w-3" style="color: var(--accent);" />
            <span style="color: var(--text-muted);">SQLite</span>
          </div>

          <!-- theme toggle -->
          <button
            class="p-2 border transition-colors"
            :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
            style="background: var(--bg-raised); border-color: var(--border); color: var(--text-secondary);"
            @click="toggleTheme"
          >
            <Sun v-if="isDark" class="h-4 w-4" />
            <Moon v-else class="h-4 w-4" />
          </button>

          <!-- shortcuts help button -->
          <button
            class="p-2 border transition-colors flex items-center justify-center font-bold"
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
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7 flex-1 w-full">
      <NoteList
        :notes="notes"
        :is-loading="isLoading"
        @create="openCreateModal"
        @edit="openEditModal"
        @delete="openDeleteModal"
        @toggle-pin="handleTogglePin"
        @refresh="fetchNotes"
      />
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
      :is-open="isFormOpen"
      :note-to-edit="noteToEdit"
      :is-submitting="isSubmittingForm"
      :server-error="formError"
      @submit="handleFormSubmit"
      @cancel="isFormOpen = false"
    />

    <ConfirmModal
      :is-open="isDeleteModalOpen"
      title="Confirm Deletion"
      :message="`Permanently delete '${noteToDelete?.title}'? This action cannot be undone.`"
      confirm-label="Delete"
      :is-processing="isDeleting"
      @confirm="handleConfirmDelete"
      @cancel="isDeleteModalOpen = false"
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
              <span><kbd class="px-1.5 py-0.5 border rounded" style="border-color: var(--border); background: var(--bg-raised);">Ctrl</kbd> + <kbd class="px-1.5 py-0.5 border rounded" style="border-color: var(--border); background: var(--bg-raised);">N</kbd></span>
            </div>
            <div class="flex items-center justify-between py-1 border-b" style="border-color: var(--border-subtle);">
              <span style="color: var(--text-secondary);">Save Note</span>
              <span><kbd class="px-1.5 py-0.5 border rounded" style="border-color: var(--border); background: var(--bg-raised);">Ctrl</kbd> + <kbd class="px-1.5 py-0.5 border rounded" style="border-color: var(--border); background: var(--bg-raised);">Enter</kbd></span>
            </div>
            <div class="flex items-center justify-between py-1 border-b" style="border-color: var(--border-subtle);">
              <span style="color: var(--text-secondary);">Close Modal</span>
              <span><kbd class="px-1.5 py-0.5 border rounded" style="border-color: var(--border); background: var(--bg-raised);">Esc</kbd></span>
            </div>
            <div class="flex items-center justify-between py-1">
              <span style="color: var(--text-secondary);">Shortcuts Menu</span>
              <span><kbd class="px-1.5 py-0.5 border rounded" style="border-color: var(--border); background: var(--bg-raised);">?</kbd></span>
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
