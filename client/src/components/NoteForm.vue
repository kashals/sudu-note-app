<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { X, Check } from '@lucide/vue';
import type { Note, CreateNoteDto } from '../types/note';

// component props
const props = defineProps<{
  isOpen: boolean;
  noteToEdit?: Note | null;
  isSubmitting?: boolean;
  serverError?: string | null;
}>();

// component emits
const emit = defineEmits<{
  (e: 'submit', payload: CreateNoteDto): void;
  (e: 'cancel'): void;
}>();

// local form state
const title = ref('');
const content = ref('');
const touchedTitle = ref(false);
const touchedContent = ref(false);

// character limits
const maxTitleLength = 200;
const maxContentLength = 10000;

// populate form when editing
watch(
  () => props.noteToEdit,
  (newNote) => {
    if (newNote) {
      title.value = newNote.title;
      content.value = newNote.content;
    } else {
      title.value = '';
      content.value = '';
    }
    touchedTitle.value = false;
    touchedContent.value = false;
  },
  { immediate: true }
);

// title validation
const titleError = computed(() => {
  if (!touchedTitle.value) return null;
  if (!title.value.trim()) return 'title is required';
  if (title.value.length > maxTitleLength) return `title cannot exceed ${maxTitleLength} characters`;
  return null;
});

// content validation
const contentError = computed(() => {
  if (!touchedContent.value) return null;
  if (!content.value.trim()) return 'content is required';
  if (content.value.length > maxContentLength) return `content cannot exceed ${maxContentLength} characters`;
  return null;
});

// check if form is valid
const isValid = computed(() => {
  return (
    title.value.trim().length > 0 &&
    title.value.length <= maxTitleLength &&
    content.value.trim().length > 0 &&
    content.value.length <= maxContentLength
  );
});

// handle form submission
function handleSubmit() {
  touchedTitle.value = true;
  touchedContent.value = true;

  if (!isValid.value || props.isSubmitting) return;

  emit('submit', {
    title: title.value.trim(),
    content: content.value.trim()
  });
}
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs"
    @click.self="emit('cancel')"
  >
    <div
      class="w-full max-w-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl transition-all"
    >
      <div class="flex items-center justify-between border-b border-zinc-800 pb-4">
        <h3 class="text-base font-semibold text-zinc-100">
          {{ noteToEdit ? 'edit note' : 'create new note' }}
        </h3>
        <button
          type="button"
          class="text-zinc-400 hover:text-zinc-100"
          @click="emit('cancel')"
        >
          <X class="h-4 w-4" />
        </button>
      </div>

      <!-- error message banner -->
      <div
        v-if="serverError"
        class="mt-4 border border-red-800 bg-red-950/40 p-3 text-xs text-red-300"
      >
        {{ serverError }}
      </div>

      <form @submit.prevent="handleSubmit" class="mt-4 space-y-4">
        <!-- title field -->
        <div>
          <div class="flex items-center justify-between pb-1">
            <label for="note-title" class="text-xs font-medium text-zinc-300">
              title <span class="text-red-400">*</span>
            </label>
            <span class="text-[10px] text-zinc-500">
              {{ title.length }}/{{ maxTitleLength }}
            </span>
          </div>
          <input
            id="note-title"
            v-model="title"
            type="text"
            placeholder="enter note title"
            class="w-full border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-zinc-500 focus:outline-none"
            :class="{ 'border-red-500': titleError }"
            @blur="touchedTitle = true"
          />
          <p v-if="titleError" class="mt-1 text-[11px] text-red-400">
            {{ titleError }}
          </p>
        </div>

        <!-- content field -->
        <div>
          <div class="flex items-center justify-between pb-1">
            <label for="note-content" class="text-xs font-medium text-zinc-300">
              content <span class="text-red-400">*</span>
            </label>
            <span class="text-[10px] text-zinc-500">
              {{ content.length }}/{{ maxContentLength }}
            </span>
          </div>
          <textarea
            id="note-content"
            v-model="content"
            rows="8"
            placeholder="enter note content..."
            class="w-full resize-y border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-zinc-500 focus:outline-none"
            :class="{ 'border-red-500': contentError }"
            @blur="touchedContent = true"
          ></textarea>
          <p v-if="contentError" class="mt-1 text-[11px] text-red-400">
            {{ contentError }}
          </p>
        </div>

        <!-- form actions -->
        <div class="flex items-center justify-end gap-3 border-t border-zinc-800 pt-4">
          <button
            type="button"
            class="border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-medium text-zinc-200 hover:bg-zinc-700"
            :disabled="isSubmitting"
            @click="emit('cancel')"
          >
            cancel
          </button>
          <button
            type="submit"
            class="flex items-center gap-2 border border-zinc-100 bg-zinc-100 px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-zinc-200 disabled:opacity-50"
            :disabled="!isValid || isSubmitting"
          >
            <Check class="h-3.5 w-3.5" />
            <span v-if="isSubmitting">saving...</span>
            <span v-else>{{ noteToEdit ? 'update note' : 'create note' }}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
