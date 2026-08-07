<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted } from 'vue';
import {
  X, Check, Pin, FolderOpen, Hash, ChevronDown,
  User, Briefcase, Lightbulb, BookOpen, Users, Folder, Settings
} from '@lucide/vue';
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
const category = ref('Personal');
const isPinned = ref(false);

const touchedTitle = ref(false);
const touchedContent = ref(false);

const maxTitleLength = 200;
const maxContentLength = 10000;

// base categories
const baseCategories = ['Personal', 'Work', 'Ideas', 'Research', 'Meeting', 'Project'];

// custom category tracking
const isCustomCategory = ref(false);
const customCategoryValue = ref('');

// simulated custom dropdown state
const isDropdownOpen = ref(false);

// tags tracking
const noteTags = ref<string[]>([]);
const newTagInput = ref('');
const tagError = ref<string | null>(null);

// populate on edit
watch(
  () => props.noteToEdit,
  (newNote) => {
    title.value = newNote?.title ?? '';
    content.value = newNote?.content ?? '';
    isPinned.value = newNote?.is_pinned === 1;
    touchedTitle.value = false;
    touchedContent.value = false;

    // parse tags
    try {
      noteTags.value = JSON.parse(newNote?.tags || '[]');
    } catch {
      noteTags.value = [];
    }
    newTagInput.value = '';
    tagError.value = null;

    // resolve category
    const catVal = newNote?.category ?? 'Personal';
    if (catVal && !baseCategories.includes(catVal) && newNote) {
      category.value = '__custom__';
      customCategoryValue.value = catVal;
      isCustomCategory.value = true;
    } else {
      category.value = catVal;
      customCategoryValue.value = '';
      isCustomCategory.value = false;
    }
    isDropdownOpen.value = false;
  },
  { immediate: true }
);

watch(category, (val) => {
  isCustomCategory.value = val === '__custom__';
  if (val !== '__custom__') {
    customCategoryValue.value = '';
  }
});

// Category Icon map helper
function getCategoryIcon(cat: string) {
  switch (cat) {
    case 'Personal': return User;
    case 'Work': return Briefcase;
    case 'Ideas': return Lightbulb;
    case 'Research': return BookOpen;
    case 'Meeting': return Users;
    case 'Project': return Folder;
    default: return Settings; // custom
  }
}

// Select options
function selectCategory(cat: string) {
  category.value = cat;
  isDropdownOpen.value = false;
}

// tags logic
function addTag() {
  const clean = newTagInput.value.trim().replace(/,/g, '');
  if (!clean) return;

  if (clean.length > 15) {
    tagError.value = 'Tag name cannot exceed 15 characters';
    return;
  }

  if (noteTags.value.length >= 5) {
    tagError.value = 'Maximum of 5 tags allowed per note';
    newTagInput.value = '';
    return;
  }

  const lower = clean.toLowerCase();
  const exists = noteTags.value.some(t => t.toLowerCase() === lower);
  if (exists) {
    tagError.value = `Tag "${clean}" already exists`;
    newTagInput.value = '';
    return;
  }

  tagError.value = null;
  newTagInput.value = '';
  noteTags.value.push(clean);
}

function removeTag(tag: string) {
  noteTags.value = noteTags.value.filter(t => t !== tag);
  tagError.value = null;
}

function toggleQuickTag(tag: string) {
  const index = noteTags.value.findIndex(t => t.toLowerCase() === tag.toLowerCase());
  if (index !== -1) {
    noteTags.value.splice(index, 1);
    tagError.value = null;
  } else {
    if (noteTags.value.length >= 5) {
      tagError.value = 'Maximum of 5 tags allowed per note';
      return;
    }
    tagError.value = null;
    noteTags.value.push(tag);
  }
}

function getTagStyle(tag: string) {
  const norm = tag.trim().toLowerCase();
  if (norm === 'important') {
    return { background: 'rgba(239, 68, 68, 0.08)', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#f87171' };
  }
  if (norm === 'urgent') {
    return { background: 'rgba(249, 115, 22, 0.08)', borderColor: 'rgba(249, 115, 22, 0.3)', color: '#fb923c' };
  }
  if (norm === 'review') {
    return { background: 'rgba(59, 130, 246, 0.08)', borderColor: 'rgba(59, 130, 246, 0.3)', color: '#60a5fa' };
  }
  if (norm === 'later') {
    return { background: 'rgba(168, 85, 247, 0.08)', borderColor: 'rgba(168, 85, 247, 0.3)', color: '#c084fc' };
  }
  return { background: 'rgba(16, 185, 129, 0.06)', borderColor: 'rgba(16, 185, 129, 0.25)', color: 'var(--accent-light)' };
}

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

// custom category validation
const customCategoryError = computed(() => {
  if (isCustomCategory.value && touchedTitle.value) {
    const val = customCategoryValue.value.trim();
    if (!val) return 'Custom category name is required';
    if (val.length > 25) return 'Custom category name is too long';
  }
  return null;
});

// form validity
const isValid = computed(() =>
  title.value.trim().length > 0 &&
  title.value.length <= maxTitleLength &&
  content.value.trim().length > 0 &&
  content.value.length <= maxContentLength &&
  (!isCustomCategory.value || (customCategoryValue.value.trim().length > 0 && customCategoryValue.value.trim().length <= 25))
);

const contentWordCount = computed(() => countWords(content.value));

// handle submit
function handleSubmit() {
  touchedTitle.value = true;
  touchedContent.value = true;
  if (!isValid.value || props.isSubmitting) return;

  const finalCategory = isCustomCategory.value ? customCategoryValue.value.trim() : category.value;
  
  emit('submit', {
    title: title.value.trim(),
    content: content.value.trim(),
    category: finalCategory,
    is_pinned: isPinned.value ? 1 : 0,
    is_archived: props.noteToEdit?.is_archived ?? 0,
    tags: JSON.stringify(noteTags.value)
  });
}

// Ctrl/Cmd+Enter to submit from anywhere in the form
function handleFormKeydown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    e.preventDefault();
    handleSubmit();
  }
}

// Click away dropdown listener
function closeDropdownOnOutsideClick(e: MouseEvent) {
  const target = e.target as HTMLElement;
  if (!target.closest('.dropdown-container')) {
    isDropdownOpen.value = false;
  }
}

onMounted(() => {
  document.addEventListener('click', closeDropdownOnOutsideClick);
});

onUnmounted(() => {
  document.removeEventListener('click', closeDropdownOnOutsideClick);
});
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
        style="background: var(--bg-surface); border-color: var(--border); border-radius: 8px;"
      >
        <!-- Header -->
        <div class="flex items-center justify-between border-b px-6 py-4" style="border-color: var(--border-subtle);">
          <div class="flex items-center gap-2.5">
            <div class="w-1 h-5" style="background: var(--accent);"></div>
            <h3 class="text-sm font-semibold tracking-wide text-[12px] uppercase font-mono" style="color: var(--text-primary);">
              {{ noteToEdit ? 'Edit Note' : 'Create Note' }}
            </h3>
          </div>
          <div class="flex items-center gap-2">
            <!-- Pin Button (Mini icon in corner) -->
            <button
              type="button"
              class="p-1.5 border transition-all duration-200 rounded"
              :style="isPinned
                ? 'background: var(--accent-glow); border-color: var(--accent); color: var(--accent-light);'
                : 'background: var(--bg-raised); border-color: var(--border); color: var(--text-muted);'"
              :title="isPinned ? 'Unpin Note' : 'Pin to Top'"
              @click="isPinned = !isPinned"
            >
              <Pin class="h-3.5 w-3.5" :style="{ fill: isPinned ? 'var(--accent)' : 'none' }" />
            </button>
            
            <!-- Close Button -->
            <button
              type="button"
              class="p-1.5 border transition-colors rounded"
              style="background: var(--bg-raised); border-color: var(--border); color: var(--text-muted);"
              @click="emit('cancel')"
            >
              <X class="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <!-- server error -->
        <div
          v-if="serverError"
          class="mx-6 mt-4 px-3 py-2 text-xs font-mono border"
          style="background: rgba(127,29,29,0.15); border-color: #7f1d1d; color: #fca5a5;"
        >
          // {{ serverError }}
        </div>

        <form @submit.prevent="handleSubmit" @keydown="handleFormKeydown" class="px-6 py-4 space-y-4">
          <!-- Properties Panel (Linear/Notion Style) -->
          <div class="p-4 border space-y-3.5" style="background: var(--bg-raised); border-color: var(--border); border-radius: 8px;">
            
            <!-- Custom Simulated Dropdown Category Selector -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 relative">
              <div class="flex items-center gap-2 text-xs" style="color: var(--text-secondary);">
                <FolderOpen class="w-3.5 h-3.5 text-muted" style="color: var(--text-muted);" />
                <span>Category</span>
              </div>
              
              <!-- Trigger button -->
              <div class="relative flex-1 max-w-xs w-full dropdown-container">
                <button
                  type="button"
                  class="dropdown-trigger text-xs font-mono flex items-center justify-between"
                  @click="isDropdownOpen = !isDropdownOpen"
                >
                  <div class="flex items-center gap-2">
                    <component :is="getCategoryIcon(category)" class="w-3.5 h-3.5" style="color: var(--accent);" />
                    <span>{{ category === '__custom__' ? '+ Custom Category' : category }}</span>
                  </div>
                  <ChevronDown class="w-3 h-3 text-muted transition-transform duration-200" :class="{ 'rotate-180': isDropdownOpen }" style="color: var(--text-muted);" />
                </button>

                <!-- Floating Dropdown Menu -->
                <Transition
                  enter-active-class="transition duration-100 ease-out"
                  enter-from-class="transform scale-95 opacity-0"
                  enter-to-class="transform scale-100 opacity-100"
                  leave-active-class="transition duration-75 ease-in"
                  leave-from-class="transform scale-100 opacity-100"
                  leave-to-class="transform scale-95 opacity-0"
                >
                  <div
                    v-if="isDropdownOpen"
                    class="absolute left-0 right-0 mt-1.5 z-50 border rounded shadow-lg overflow-hidden py-1"
                    style="background: var(--bg-surface); border-color: var(--border);"
                  >
                    <button
                      v-for="cat in [...baseCategories, '__custom__']"
                      :key="cat"
                      type="button"
                      class="dropdown-item w-full flex items-center justify-between px-3 py-2 text-xs font-mono transition-colors"
                      @click="selectCategory(cat)"
                    >
                      <div class="flex items-center gap-2">
                        <component :is="getCategoryIcon(cat)" class="w-3.5 h-3.5" :style="{ color: cat === category ? 'var(--accent)' : 'var(--text-muted)' }" />
                        <span>{{ cat === '__custom__' ? '+ Custom Category...' : cat }}</span>
                      </div>
                      <Check v-if="cat === category" class="w-3.5 h-3.5" style="color: var(--accent);" />
                    </button>
                  </div>
                </Transition>
              </div>
            </div>

            <!-- Custom Category Input -->
            <div v-if="isCustomCategory" class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t pt-2 border-dashed" style="border-color: var(--border);">
              <span class="text-[10px] font-mono" style="color: var(--text-muted);">// Custom category name:</span>
              <div class="flex-1 max-w-xs w-full">
                <input
                  v-model="customCategoryValue"
                  type="text"
                  placeholder="Enter category name"
                  class="custom-category-input text-xs font-mono w-full"
                />
                <p v-if="customCategoryError" class="mt-1 font-mono text-[9px]" style="color: #f87171;">
                  // {{ customCategoryError }}
                </p>
              </div>
            </div>

            <!-- Tags Selector -->
            <div class="flex flex-col gap-2.5 border-t pt-3" style="border-color: var(--border);">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div class="flex items-center gap-2 text-xs" style="color: var(--text-secondary);">
                  <Hash class="w-3.5 h-3.5 text-muted" style="color: var(--text-muted);" />
                  <span>Tags</span>
                </div>
                <!-- Quick Add -->
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span class="text-[9px] font-mono opacity-50 mr-1 select-none">// Quick add:</span>
                  <button
                    v-for="quick in ['Important', 'Urgent', 'Review', 'Later']"
                    :key="quick"
                    type="button"
                    class="quick-tag-btn font-mono text-[9px]"
                    :class="{ 'active': noteTags.includes(quick) }"
                    @click="toggleQuickTag(quick)"
                  >
                    {{ quick }}
                  </button>
                </div>
              </div>

              <!-- Tags container & typing input -->
              <div
                class="flex flex-wrap gap-2 p-2 border rounded min-h-[42px] items-center"
                style="background: var(--bg-surface); border-color: var(--border);"
              >
                <div
                  v-for="tag in noteTags"
                  :key="tag"
                  class="flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-mono border rounded select-none animate-scale-in"
                  :style="getTagStyle(tag)"
                >
                  <span>{{ tag }}</span>
                  <button
                    type="button"
                    class="transition-colors hover:text-white"
                    style="color: var(--text-muted);"
                    @click="removeTag(tag)"
                  >
                    <X class="w-2.5 h-2.5" />
                  </button>
                </div>

                <input
                  v-if="noteTags.length < 5"
                  v-model="newTagInput"
                  type="text"
                  placeholder="Type tag & press Enter..."
                  class="flex-1 bg-transparent text-xs outline-none border-none min-w-[120px]"
                  style="color: var(--text-primary);"
                  @keydown.enter.prevent="addTag"
                  @keydown.comma.prevent="addTag"
                  @blur="addTag"
                />
                <input
                  v-else
                  type="text"
                  placeholder="Maximum tags reached"
                  class="flex-1 bg-transparent text-xs outline-none border-none min-w-[120px] cursor-not-allowed"
                  style="color: var(--text-muted);"
                  disabled
                />
              </div>
              <p v-if="tagError" class="mt-1 font-mono text-[10px]" style="color: #f87171;">
                // {{ tagError }}
              </p>
            </div>
          </div>

          <!-- title field -->
          <div>
            <div class="flex items-center justify-between pb-1.5">
              <label for="note-title" class="text-xs font-semibold" style="color: var(--text-secondary);">
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
              class="w-full px-3 py-2 text-sm border focus:outline-none transition-all rounded"
              :style="`
                background: var(--bg-surface);
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
              <label for="note-content" class="text-xs font-semibold" style="color: var(--text-secondary);">
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
              rows="6"
              placeholder="Enter note content..."
              class="w-full resize-y px-3 py-2 text-sm border focus:outline-none transition-all leading-relaxed rounded"
              :style="`
                background: var(--bg-surface);
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

          <!-- actions -->
          <div
            class="flex items-center justify-end gap-4 border-t pt-4"
            style="border-color: var(--border-subtle);"
          >
            <button
              type="button"
              class="px-4 py-2 text-xs font-medium border transition-colors disabled:opacity-40 rounded"
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

<style scoped>
.dropdown-trigger {
  width: 100%;
  height: 36px;
  padding: 0 12px;
  border-radius: 6px;
  border: 1.5px solid var(--border);
  background: var(--bg-surface);
  color: var(--text-primary);
  outline: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.dropdown-trigger:hover {
  border-color: var(--text-muted);
}

.dropdown-trigger:focus {
  border-color: var(--accent);
}

.dropdown-item {
  background: transparent;
  border: none;
  color: var(--text-primary);
  cursor: pointer;
}

.dropdown-item:hover {
  background-color: var(--bg-raised);
}

.custom-category-input {
  height: 34px;
  padding: 0 12px;
  border-radius: 6px;
  border: 1.5px solid var(--border);
  background: var(--bg-surface);
  color: var(--text-primary);
  outline: none;
  transition: all 0.2s ease;
}

.custom-category-input:hover {
  border-color: var(--text-muted);
}

.custom-category-input:focus {
  border-color: var(--accent);
}

.quick-tag-btn {
  padding: 2.5px 8px;
  border-radius: 4px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
}

.quick-tag-btn:hover {
  border-color: var(--text-muted);
  color: var(--text-primary);
}

.quick-tag-btn.active {
  background: var(--accent-glow);
  border-color: var(--accent);
  color: var(--accent-light);
}
</style>
