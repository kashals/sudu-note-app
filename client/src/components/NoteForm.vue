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

// populate form on edit
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

// word count helper
function countWords(str: string): number {
  const trimmed = str.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

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

// form validity
const isValid = computed(() => {
  return (
    title.value.trim().length > 0 &&
    title.value.length <= maxTitleLength &&
    content.value.trim().length > 0 &&
    content.value.length <= maxContentLength
  );
});

// content word count
const contentWordCount = computed(() => countWords(content.value));

// handle submit
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
    <div class="w-full max-w-2xl border border-zinc-800 bg-zinc-900">
      <!-- modal header -->
      <div class="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
        <h3 class="text-sm font-semibold text-zinc-100 tracking-wide">
          {{ noteToEdit ? 'edit note' : 'create note' }}
        </h3>
        <button
          type="button"
          class="text-zinc-500 hover:text-zinc-100 transition-colors"
          @click="emit('cancel')"
        >
          <X class="h-4 w-4" />
        </button>
      </div>

      <!-- server error banner -->
      <div
        v-if="serverError"
        class="mx-6 mt-4 border border-red-900 bg-red-950/30 px-3 py-2 text-xs text-red-400 font-mono"
      >
        // {{ serverError }}
      </div>

      <form @submit.prevent="handleSubmit" class="px-6 py-4 space-y-5">
        <!-- title field -->
        <div>
          <div class="flex items-center justify-between pb-1.5">
            <label for="note-title" class="text-xs font-medium text-zinc-400 tracking-wide">
              title <span class="text-red-500">*</span>
            </label>
            <span
              class="font-mono text-[10px]"
              :class="title.length > maxTitleLength ? 'text-red-400' : 'text-zinc-600'"
            >
              {{ title.length }}/{{ maxTitleLength }}
            </span>
          </div>
          <input
            id="note-title"
            v-model="title"
            type="text"
            placeholder="enter note title"
            class="w-full border bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-700 focus:outline-none transition-colors"
            :class="titleError ? 'border-red-800 focus:border-red-600' : 'border-zinc-800 focus:border-zinc-600'"
            @blur="touchedTitle = true"
          />
          <p v-if="titleError" class="mt-1 font-mono text-[11px] text-red-400">
            // {{ titleError }}
          </p>
        </div>

        <!-- content field -->
        <div>
          <div class="flex items-center justify-between pb-1.5">
            <label for="note-content" class="text-xs font-medium text-zinc-400 tracking-wide">
              content <span class="text-red-500">*</span>
            </label>
            <span
              class="font-mono text-[10px]"
              :class="content.length > maxContentLength ? 'text-red-400' : 'text-zinc-600'"
            >
              {{ contentWordCount }} words · {{ content.length }}/{{ maxContentLength }}
            </span>
          </div>
          <textarea
            id="note-content"
            v-model="content"
            rows="9"
            placeholder="enter note content..."
            class="w-full resize-y border bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-700 focus:outline-none transition-colors leading-relaxed"
            :class="contentError ? 'border-red-800 focus:border-red-600' : 'border-zinc-800 focus:border-zinc-600'"
            @blur="touchedContent = true"
          ></textarea>
          <p v-if="contentError" class="mt-1 font-mono text-[11px] text-red-400">
            // {{ contentError }}
          </p>
        </div>

        <!-- form actions -->
        <div class="flex items-center justify-end gap-3 border-t border-zinc-800 pt-4">
          <button
            type="button"
            class="border border-zinc-800 bg-zinc-900 px-4 py-2 text-xs font-medium text-zinc-400 hover:border-zinc-700 hover:text-zinc-200 transition-colors disabled:opacity-40"
            :disabled="isSubmitting"
            @click="emit('cancel')"
          >
            cancel
          </button>
          <button
            type="submit"
            class="flex items-center gap-2 border border-zinc-100 bg-zinc-100 px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
