<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { X, Check, Pin } from '@lucide/vue';
import type { Note, CreateNoteDto } from '../types/note';
import PushButton from './PushButton.vue';

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
const category = ref('Document');
const isPinned = ref(false);

const touchedTitle = ref(false);
const touchedContent = ref(false);

const maxTitleLength = 200;
const maxContentLength = 10000;

const categories = ['Document', 'Draft', 'Task', 'Archive'];

// populate on edit
watch(
  () => props.noteToEdit,
  (newNote) => {
    title.value = newNote?.title ?? '';
    content.value = newNote?.content ?? '';
    category.value = newNote?.category ?? 'Document';
    isPinned.value = newNote?.is_pinned === 1;
    touchedTitle.value = false;
    touchedContent.value = false;
  },
  { immediate: true }
);

// word count
function countWords(str: string): number {
  const t = str.trim();
  return t ? t.split(/\s+/).length : 0;
}

// title validation
const titleError = computed(() => {
  if (!touchedTitle.value) return null;
  if (!title.value.trim()) return 'Title is required';
  if (title.value.length > maxTitleLength) return `Title cannot exceed ${maxTitleLength} characters`;
  return null;
});

// content validation
const contentError = computed(() => {
  if (!touchedContent.value) return null;
  if (!content.value.trim()) return 'Content is required';
  if (content.value.length > maxContentLength) return `Content cannot exceed ${maxContentLength} characters`;
  return null;
});

// form validity
const isValid = computed(() =>
  title.value.trim().length > 0 &&
  title.value.length <= maxTitleLength &&
  content.value.trim().length > 0 &&
  content.value.length <= maxContentLength
);

const contentWordCount = computed(() => countWords(content.value));

// handle submit
function handleSubmit() {
  touchedTitle.value = true;
  touchedContent.value = true;
  if (!isValid.value || props.isSubmitting) return;
  emit('submit', {
    title: title.value.trim(),
    content: content.value.trim(),
    category: category.value,
    is_pinned: isPinned.value ? 1 : 0
  });
}

// Ctrl/Cmd+Enter to submit from anywhere in the form
function handleFormKeydown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    e.preventDefault();
    handleSubmit();
  }
}
</script>

<template>
  <Transition
    enter-active-class="transition-opacity duration-200"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition-opacity duration-150"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="isOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      style="background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);"
      @click.self="emit('cancel')"
    >
      <div
        class="animate-scale-in w-full max-w-2xl border"
        style="background: var(--bg-surface); border-color: var(--border);"
      >
        <!-- header -->
        <div class="flex items-center justify-between border-b px-6 py-4" style="border-color: var(--border);">
          <div class="flex items-center gap-2.5">
            <div
              class="w-1 h-5"
              style="background: var(--accent);"
            ></div>
            <h3 class="text-sm font-semibold" style="color: var(--text-primary);">
              {{ noteToEdit ? 'Edit Note' : 'Create Note' }}
            </h3>
          </div>
          <button
            type="button"
            class="transition-colors"
            style="color: var(--text-muted);"
            @click="emit('cancel')"
          >
            <X class="h-4 w-4" />
          </button>
        </div>

        <!-- server error -->
        <div
          v-if="serverError"
          class="mx-6 mt-4 px-3 py-2 text-xs font-mono border"
          style="background: rgba(127,29,29,0.15); border-color: #7f1d1d; color: #fca5a5;"
        >
          // {{ serverError }}
        </div>

        <form @submit.prevent="handleSubmit" @keydown="handleFormKeydown" class="px-6 py-4 space-y-5">
          <!-- title field -->
          <div>
            <div class="flex items-center justify-between pb-1.5">
              <label for="note-title" class="text-xs font-medium" style="color: var(--text-secondary);">
                Title <span style="color: var(--accent);">*</span>
              </label>
              <span
                class="font-mono text-[10px]"
                :style="title.length > maxTitleLength ? 'color: #f87171;' : 'color: var(--text-muted);'"
              >
                {{ title.length }}/{{ maxTitleLength }}
              </span>
            </div>
            <input
              id="note-title"
              v-model="title"
              type="text"
              placeholder="Enter note title"
              class="w-full px-3 py-2 text-sm border focus:outline-none transition-colors"
              :style="`
                background: var(--bg-raised);
                color: var(--text-primary);
                border-color: ${titleError ? '#7f1d1d' : 'var(--border)'};
              `"
              @focus="($el as HTMLInputElement).style.borderColor = titleError ? '#7f1d1d' : 'var(--accent)'"
              @blur="touchedTitle = true; ($el as HTMLInputElement).style.borderColor = titleError ? '#7f1d1d' : 'var(--border)'"
            />
            <p v-if="titleError" class="mt-1 font-mono text-[11px]" style="color: #f87171;">
              // {{ titleError }}
            </p>
          </div>

          <!-- content field -->
          <div>
            <div class="flex items-center justify-between pb-1.5">
              <label for="note-content" class="text-xs font-medium" style="color: var(--text-secondary);">
                Content <span style="color: var(--accent);">*</span>
              </label>
              <span
                class="font-mono text-[10px]"
                :style="content.length > maxContentLength ? 'color: #f87171;' : 'color: var(--text-muted);'"
              >
                {{ contentWordCount }} words · {{ content.length }}/{{ maxContentLength }}
              </span>
            </div>
            <textarea
              id="note-content"
              v-model="content"
              rows="7"
              placeholder="Enter note content..."
              class="w-full resize-y px-3 py-2 text-sm border focus:outline-none transition-colors leading-relaxed"
              :style="`
                background: var(--bg-raised);
                color: var(--text-primary);
                border-color: ${contentError ? '#7f1d1d' : 'var(--border)'};
              `"
              @focus="($el as HTMLTextAreaElement).style.borderColor = contentError ? '#7f1d1d' : 'var(--accent)'"
              @blur="touchedContent = true; ($el as HTMLTextAreaElement).style.borderColor = contentError ? '#7f1d1d' : 'var(--border)'"
            ></textarea>
            <p v-if="contentError" class="mt-1 font-mono text-[11px]" style="color: #f87171;">
              // {{ contentError }}
            </p>
          </div>

          <!-- properties grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <!-- category selector -->
            <div>
              <label for="note-category" class="block text-xs font-medium pb-1.5" style="color: var(--text-secondary);">
                Category
              </label>
              <select
                id="note-category"
                v-model="category"
                class="w-full px-3 py-2 text-sm border focus:outline-none transition-colors rounded"
                style="background: var(--bg-raised); border-color: var(--border); color: var(--text-primary);"
                @focus="($el as HTMLSelectElement).style.borderColor = 'var(--accent)'"
                @blur="($el as HTMLSelectElement).style.borderColor = 'var(--border)'"
              >
                <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
              </select>
            </div>

            <!-- pin toggle button -->
            <div class="flex flex-col justify-end">
              <label class="block text-xs font-medium pb-1.5" style="color: var(--text-secondary);">
                Pinning
              </label>
              <button
                type="button"
                class="flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-2 text-xs font-semibold border transition-all duration-200"
                style="border-radius: 6px;"
                :style="isPinned
                  ? 'background: var(--accent); border-color: var(--accent); color: #fff;'
                  : 'background: var(--bg-surface); border-color: var(--border); color: var(--text-secondary);'"
                @click="isPinned = !isPinned"
              >
                <Pin class="h-3.5 w-3.5" :style="{ fill: isPinned ? '#fff' : 'none' }" />
                <span>{{ isPinned ? 'Pinned to top' : 'Pin note' }}</span>
              </button>
            </div>
          </div>

          <!-- actions -->
          <div
            class="flex items-center justify-end gap-4 border-t pt-4"
            style="border-color: var(--border);"
          >
            <button
              type="button"
              class="px-4 py-2 text-xs font-medium border transition-colors disabled:opacity-40"
              style="background: var(--bg-raised); border-color: var(--border); color: var(--text-secondary);"
              :disabled="isSubmitting"
              @click="emit('cancel')"
            >
              Cancel
            </button>
            <PushButton
              type="submit"
              variant="primary"
              :disabled="!isValid || isSubmitting"
            >
              <Check class="h-3.5 w-3.5" />
              <span v-if="isSubmitting">Saving...</span>
              <span v-else>{{ noteToEdit ? 'Update Note' : 'Create Note' }}</span>
            </PushButton>
          </div>
        </form>
      </div>
    </div>
  </Transition>
</template>
