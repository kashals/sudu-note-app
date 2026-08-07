<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { FileText, AlertCircle, CheckCircle2, ShieldCheck, X, Sun, Moon } from '@lucide/vue';
import type { Note, CreateNoteDto } from './types/note';
import { getNotes, createNote, updateNote, deleteNote } from './services/api';
import NoteList from './components/NoteList.vue';
import NoteForm from './components/NoteForm.vue';
import ConfirmModal from './components/ConfirmModal.vue';

// note state
const notes = ref<Note[]>([]);
const isLoading = ref(false);
const isFormOpen = ref(false);
const noteToEdit = ref<Note | null>(null);
const isSubmittingForm = ref(false);

// delete state
const isDeleteModalOpen = ref(false);
const noteToDelete = ref<Note | null>(null);
const isDeleting = ref(false);

// feedback state
const connectionError = ref<string | null>(null);
const formError = ref<string | null>(null);
const toastMessage = ref<string | null>(null);
const toastType = ref<'success' | 'error'>('success');

// theme state
const isDark = ref(true);

let toastTimer: ReturnType<typeof setTimeout> | null = null;

// load persisted theme
onMounted(() => {
  const saved = localStorage.getItem('sudu_theme');
  isDark.value = saved !== 'light';
  applyTheme(isDark.value);
  fetchNotes();
});

// apply theme to root element
function applyTheme(dark: boolean) {
  if (dark) {
    document.documentElement.classList.remove('light');
  } else {
    document.documentElement.classList.add('light');
  }
}

// toggle theme
function toggleTheme() {
  isDark.value = !isDark.value;
  applyTheme(isDark.value);
  localStorage.setItem('sudu_theme', isDark.value ? 'dark' : 'light');
}

// show auto-dismiss toast
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

// fetch all notes
async function fetchNotes() {
  isLoading.value = true;
  connectionError.value = null;
  try {
    notes.value = await getNotes();
  } catch (err: any) {
    connectionError.value = err.message || 'Failed to connect to backend service';
  } finally {
    isLoading.value = false;
  }
}

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
  try {
    if (noteToEdit.value) {
      const updated = await updateNote(noteToEdit.value.id, payload);
      const index = notes.value.findIndex((n) => n.id === updated.id);
      if (index !== -1) notes.value[index] = updated;
      showToast('Note updated');
    } else {
      const created = await createNote(payload);
      notes.value.unshift(created);
      showToast('Note created');
    }
    isFormOpen.value = false;
  } catch (err: any) {
    formError.value = err.message || 'Failed to save note';
  } finally {
    isSubmittingForm.value = false;
  }
}

function openDeleteModal(note: Note) {
  noteToDelete.value = note;
  isDeleteModalOpen.value = true;
}

async function handleConfirmDelete() {
  if (!noteToDelete.value) return;
  isDeleting.value = true;
  try {
    await deleteNote(noteToDelete.value.id);
    notes.value = notes.value.filter((n) => n.id !== noteToDelete.value?.id);
    showToast('Note deleted');
    isDeleteModalOpen.value = false;
    noteToDelete.value = null;
  } catch (err: any) {
    showToast(err.message || 'Failed to delete note', 'error');
    isDeleteModalOpen.value = false;
  } finally {
    isDeleting.value = false;
  }
}

function dismissConnectionError() {
  connectionError.value = null;
}
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
          >
            retry
          </button>
          <button class="transition-colors" style="color: #f87171;" @click="dismissConnectionError">
            <X class="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </Transition>

    <!-- header -->
    <header
      class="sticky z-40 border-b"
      :style="{
        top: connectionError ? '41px' : '0',
        background: 'var(--bg-surface)',
        borderColor: 'var(--border)',
        backdropFilter: 'blur(12px)',
      }"
    >
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <!-- logo + title -->
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

        <!-- status badges + theme toggle -->
        <div class="flex items-center gap-2 font-mono text-[11px]">
          <div
            class="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 border"
            style="background: var(--bg-raised); border-color: var(--border);"
          >
            <span
              class="relative flex h-1.5 w-1.5"
            >
              <span
                class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                style="background: var(--accent);"
              ></span>
              <span
                class="relative inline-flex rounded-full h-1.5 w-1.5"
                style="background: var(--accent);"
              ></span>
            </span>
            <ShieldCheck class="h-3 w-3" style="color: var(--accent);" />
            <span style="color: var(--text-muted);">SQLite</span>
          </div>

          <div
            class="hidden sm:block px-2.5 py-1.5 border"
            style="background: var(--bg-raised); border-color: var(--border); color: var(--text-muted);"
          >
            {{ notes.length }} records
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
        </div>
      </div>
    </header>

    <!-- main -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7 flex-1 w-full">
      <NoteList
        :notes="notes"
        :is-loading="isLoading"
        @create="openCreateModal"
        @edit="openEditModal"
        @delete="openDeleteModal"
        @refresh="fetchNotes"
      />
    </main>

    <!-- footer -->
    <footer
      class="border-t py-3 text-center font-mono text-[11px]"
      style="background: var(--bg-surface); border-color: var(--border); color: var(--text-muted);"
    >
      sudu.ai · full-stack pre-task · aakash pai
    </footer>

    <!-- modals -->
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

    <!-- bottom-right toast -->
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
        <button
          class="ml-1 opacity-60 hover:opacity-100 transition-opacity"
          @click="dismissToast"
        >
          <X class="h-3 w-3" />
        </button>
      </div>
    </Transition>
  </div>
</template>
