<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { FileText, AlertCircle, CheckCircle2, ShieldCheck } from '@lucide/vue';
import type { Note, CreateNoteDto } from './types/note';
import { getNotes, createNote, updateNote, deleteNote } from './services/api';
import NoteList from './components/NoteList.vue';
import NoteForm from './components/NoteForm.vue';
import ConfirmModal from './components/ConfirmModal.vue';

// state variables
const notes = ref<Note[]>([]);
const isLoading = ref(false);
const isFormOpen = ref(false);
const noteToEdit = ref<Note | null>(null);
const isSubmittingForm = ref(false);

const isDeleteModalOpen = ref(false);
const noteToDelete = ref<Note | null>(null);
const isDeleting = ref(false);

const globalError = ref<string | null>(null);
const formError = ref<string | null>(null);
const toastMessage = ref<string | null>(null);

// auto dismiss toast
function showToast(message: string) {
  toastMessage.value = message;
  setTimeout(() => {
    if (toastMessage.value === message) {
      toastMessage.value = null;
    }
  }, 4000);
}

// load all notes
async function fetchNotes() {
  isLoading.value = true;
  globalError.value = null;
  try {
    notes.value = await getNotes();
  } catch (err: any) {
    globalError.value = err.message || 'failed to connect to backend service';
  } finally {
    isLoading.value = false;
  }
}

// open form for creation
function openCreateModal() {
  noteToEdit.value = null;
  formError.value = null;
  isFormOpen.value = true;
}

// open form for editing
function openEditModal(note: Note) {
  noteToEdit.value = note;
  formError.value = null;
  isFormOpen.value = true;
}

// handle form submit
async function handleFormSubmit(payload: CreateNoteDto) {
  isSubmittingForm.value = true;
  formError.value = null;
  try {
    if (noteToEdit.value) {
      const updated = await updateNote(noteToEdit.value.id, payload);
      const index = notes.value.findIndex((n) => n.id === updated.id);
      if (index !== -1) {
        notes.value[index] = updated;
      }
      showToast('note updated successfully');
    } else {
      const created = await createNote(payload);
      notes.value.unshift(created);
      showToast('note created successfully');
    }
    isFormOpen.value = false;
  } catch (err: any) {
    formError.value = err.message || 'failed to save note';
  } finally {
    isSubmittingForm.value = false;
  }
}

// open delete modal
function openDeleteModal(note: Note) {
  noteToDelete.value = note;
  isDeleteModalOpen.value = true;
}

// confirm delete execution
async function handleConfirmDelete() {
  if (!noteToDelete.value) return;
  isDeleting.value = true;
  try {
    await deleteNote(noteToDelete.value.id);
    notes.value = notes.value.filter((n) => n.id !== noteToDelete.value?.id);
    showToast('note deleted successfully');
    isDeleteModalOpen.value = false;
    noteToDelete.value = null;
  } catch (err: any) {
    globalError.value = err.message || 'failed to delete note';
  } finally {
    isDeleting.value = false;
  }
}

// initialize on mount
onMounted(() => {
  fetchNotes();
});
</script>

<template>
  <div class="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
    <!-- top header navbar -->
    <header class="border-b border-zinc-800 bg-zinc-900/90 backdrop-blur-xs sticky top-0 z-40">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="p-2 border border-zinc-700 bg-zinc-800">
            <FileText class="h-5 w-5 text-zinc-100" />
          </div>
          <div>
            <h1 class="text-sm font-bold tracking-wider text-zinc-100 uppercase">
              SUDU File Management System
            </h1>
            <p class="text-[11px] text-zinc-500 font-mono">
              note administration panel
            </p>
          </div>
        </div>

        <div class="flex items-center gap-4 text-xs font-mono">
          <div class="flex items-center gap-2 border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-zinc-400">
            <ShieldCheck class="h-3.5 w-3.5 text-emerald-400" />
            <span>SQLite Active</span>
          </div>
          <div class="border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-zinc-300">
            <span>{{ notes.length }} notes</span>
          </div>
        </div>
      </div>
    </header>

    <!-- main content container -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
      <!-- global error notification banner -->
      <div
        v-if="globalError"
        class="mb-6 flex items-center justify-between border border-red-800/80 bg-red-950/40 p-4 text-xs text-red-300"
      >
        <div class="flex items-center gap-2">
          <AlertCircle class="h-4 w-4 shrink-0 text-red-400" />
          <span>{{ globalError }}</span>
        </div>
        <button
          type="button"
          class="border border-red-700 px-3 py-1 text-[11px] font-mono hover:bg-red-900/50"
          @click="fetchNotes"
        >
          retry connection
        </button>
      </div>

      <!-- success toast notification -->
      <div
        v-if="toastMessage"
        class="mb-6 flex items-center gap-2 border border-emerald-800/80 bg-emerald-950/40 p-3 text-xs text-emerald-300 transition-all"
      >
        <CheckCircle2 class="h-4 w-4 shrink-0 text-emerald-400" />
        <span>{{ toastMessage }}</span>
      </div>

      <!-- note list component -->
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
    <footer class="border-t border-zinc-800 bg-zinc-900/40 py-4 text-center text-xs text-zinc-500 font-mono">
      <span>sudu full stack pre-task · built for Aakash Pai</span>
    </footer>

    <!-- create/edit form modal -->
    <NoteForm
      :is-open="isFormOpen"
      :note-to-edit="noteToEdit"
      :is-submitting="isSubmittingForm"
      :server-error="formError"
      @submit="handleFormSubmit"
      @cancel="isFormOpen = false"
    />

    <!-- delete confirmation modal -->
    <ConfirmModal
      :is-open="isDeleteModalOpen"
      title="confirm note deletion"
      :message="`are you sure you want to permanently delete '${noteToDelete?.title}'? this action cannot be undone.`"
      confirm-label="delete note"
      :is-processing="isDeleting"
      @confirm="handleConfirmDelete"
      @cancel="isDeleteModalOpen = false"
    />
  </div>
</template>
