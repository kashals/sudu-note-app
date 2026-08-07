<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { FileText, AlertCircle, CheckCircle2, ShieldCheck, X } from '@lucide/vue';
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

// error/toast state
const connectionError = ref<string | null>(null);
const formError = ref<string | null>(null);
const toastMessage = ref<string | null>(null);
const toastType = ref<'success' | 'error'>('success');

let toastTimer: ReturnType<typeof setTimeout> | null = null;

// show toast with auto-dismiss
function showToast(message: string, type: 'success' | 'error' = 'success') {
  if (toastTimer) clearTimeout(toastTimer);
  toastMessage.value = message;
  toastType.value = type;
  toastTimer = setTimeout(() => {
    toastMessage.value = null;
  }, 4000);
}

// dismiss toast immediately
function dismissToast() {
  if (toastTimer) clearTimeout(toastTimer);
  toastMessage.value = null;
}

// load all notes
async function fetchNotes() {
  isLoading.value = true;
  connectionError.value = null;
  try {
    notes.value = await getNotes();
  } catch (err: any) {
    connectionError.value = err.message || 'failed to connect to backend service';
  } finally {
    isLoading.value = false;
  }
}

// open create form
function openCreateModal() {
  noteToEdit.value = null;
  formError.value = null;
  isFormOpen.value = true;
}

// open edit form
function openEditModal(note: Note) {
  noteToEdit.value = note;
  formError.value = null;
  isFormOpen.value = true;
}

// handle note create/update
async function handleFormSubmit(payload: CreateNoteDto) {
  isSubmittingForm.value = true;
  formError.value = null;
  try {
    if (noteToEdit.value) {
      const updated = await updateNote(noteToEdit.value.id, payload);
      const index = notes.value.findIndex((n) => n.id === updated.id);
      if (index !== -1) notes.value[index] = updated;
      showToast('note updated');
    } else {
      const created = await createNote(payload);
      notes.value.unshift(created);
      showToast('note created');
    }
    isFormOpen.value = false;
  } catch (err: any) {
    formError.value = err.message || 'failed to save note';
  } finally {
    isSubmittingForm.value = false;
  }
}

// open delete confirmation
function openDeleteModal(note: Note) {
  noteToDelete.value = note;
  isDeleteModalOpen.value = true;
}

// confirm delete
async function handleConfirmDelete() {
  if (!noteToDelete.value) return;
  isDeleting.value = true;
  try {
    await deleteNote(noteToDelete.value.id);
    notes.value = notes.value.filter((n) => n.id !== noteToDelete.value?.id);
    showToast('note deleted');
    isDeleteModalOpen.value = false;
    noteToDelete.value = null;
  } catch (err: any) {
    showToast(err.message || 'failed to delete note', 'error');
    isDeleteModalOpen.value = false;
  } finally {
    isDeleting.value = false;
  }
}

// dismiss connection error
function dismissConnectionError() {
  connectionError.value = null;
}

// initialize on mount
onMounted(() => {
  fetchNotes();
});
</script>

<template>
  <div class="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
    <!-- connection error banner — fixed top, no layout shift -->
    <div
      v-if="connectionError"
      class="fixed top-0 left-0 right-0 z-50 flex items-center justify-between gap-3 border-b border-red-900/60 bg-red-950/90 px-4 py-2.5 backdrop-blur-sm"
    >
      <div class="flex items-center gap-2 text-xs text-red-300">
        <AlertCircle class="h-3.5 w-3.5 shrink-0 text-red-400" />
        <span class="font-mono">// {{ connectionError }}</span>
      </div>
      <div class="flex items-center gap-3 shrink-0">
        <button
          type="button"
          class="font-mono text-[11px] text-red-400 border border-red-900 px-2.5 py-1 hover:border-red-700 hover:text-red-200 transition-colors"
          @click="fetchNotes"
        >
          retry
        </button>
        <button
          type="button"
          class="text-red-600 hover:text-red-300 transition-colors"
          @click="dismissConnectionError"
        >
          <X class="h-3.5 w-3.5" />
        </button>
      </div>
    </div>

    <!-- top header -->
    <header
      class="border-b border-zinc-800 bg-zinc-900/90 backdrop-blur-xs sticky z-40"
      :class="connectionError ? 'top-[41px]' : 'top-0'"
    >
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="p-1.5 border border-zinc-800 bg-zinc-900">
            <FileText class="h-4 w-4 text-zinc-300" />
          </div>
          <div>
            <h1 class="text-xs font-bold tracking-widest text-zinc-100 uppercase">
              SUDU File Management
            </h1>
            <p class="font-mono text-[10px] text-zinc-600 mt-0.5">
              note administration panel
            </p>
          </div>
        </div>

        <div class="flex items-center gap-3 font-mono text-[11px]">
          <div class="flex items-center gap-1.5 border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-zinc-500">
            <ShieldCheck class="h-3 w-3 text-emerald-500" />
            <span>sqlite</span>
          </div>
          <div class="border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-zinc-500">
            {{ notes.length }} records
          </div>
        </div>
      </div>
    </header>

    <!-- main content -->
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
    <footer class="border-t border-zinc-800 bg-zinc-900/40 py-3 text-center font-mono text-[11px] text-zinc-700">
      sudu full-stack pre-task · aakash pai
    </footer>

    <!-- create/edit modal -->
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
      title="confirm deletion"
      :message="`permanently delete '${noteToDelete?.title}'? this action cannot be undone.`"
      confirm-label="delete"
      :is-processing="isDeleting"
      @confirm="handleConfirmDelete"
      @cancel="isDeleteModalOpen = false"
    />

    <!-- fixed bottom-right toast -->
    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="opacity-0 translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-2"
    >
      <div
        v-if="toastMessage"
        class="fixed bottom-5 right-5 z-50 flex items-center gap-3 border px-4 py-3 text-xs backdrop-blur-sm"
        :class="
          toastType === 'success'
            ? 'border-emerald-900/60 bg-zinc-950/90 text-emerald-400'
            : 'border-red-900/60 bg-zinc-950/90 text-red-400'
        "
      >
        <CheckCircle2 v-if="toastType === 'success'" class="h-3.5 w-3.5 shrink-0" />
        <AlertCircle v-else class="h-3.5 w-3.5 shrink-0" />
        <span class="font-mono">{{ toastMessage }}</span>
        <button
          type="button"
          class="ml-1 opacity-60 hover:opacity-100 transition-opacity"
          @click="dismissToast"
        >
          <X class="h-3 w-3" />
        </button>
      </div>
    </Transition>
  </div>
</template>
