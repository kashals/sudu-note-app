<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted, nextTick } from 'vue';
import {
  X, Check, Pin, FolderOpen, Hash, ChevronDown,
  User, Briefcase, Lightbulb, BookOpen, Users, Folder, Settings,
  Maximize2, Minimize2, Bold, Italic, Underline, AlignLeft,
  AlignCenter, AlignRight, AlignJustify, Outdent, Indent,
  List, ListOrdered, CheckSquare, Quote, PenTool, Layout, Menu
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

// Sidebar toggle state
const showSidebar = ref(false);

// tags tracking
const noteTags = ref<string[]>([]);
const newTagInput = ref('');
const tagError = ref<string | null>(null);

// active text formats for ribbon highlighting
const activeFormats = ref({
  bold: false,
  italic: false,
  underline: false,
  h1: false,
  h2: false,
  h3: false,
  quote: false,
  alignLeft: false,
  alignCenter: false,
  alignRight: false,
  alignJustify: false,
  list: false,
  listOrdered: false
});

// editor element reference
const editorRef = ref<HTMLDivElement | null>(null);

// populate on edit
watch(
  () => props.noteToEdit,
  async (newNote) => {
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
    showSidebar.value = false; // Reset to hidden on load

    // sync content editable block
    await nextTick();
    if (editorRef.value) {
      editorRef.value.innerHTML = content.value;
    }
  },
  { immediate: true }
);

// sync when opening/closing
watch(
  () => props.isOpen,
  async (open) => {
    if (open) {
      showSidebar.value = false;
      document.addEventListener('selectionchange', updateActiveFormats);
      await nextTick();
      if (editorRef.value) {
        editorRef.value.innerHTML = content.value;
      }
    } else {
      document.removeEventListener('selectionchange', updateActiveFormats);
    }
  }
);

// Watch editorRef directly to handle Vue transition mount timing
watch(editorRef, (el) => {
  if (el) {
    el.innerHTML = content.value;
    el.focus();
    updateActiveFormats();
  }
});

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

// active text formats updater
function updateActiveFormats() {
  if (!editorRef.value) return;
  activeFormats.value.bold = document.queryCommandState('bold');
  activeFormats.value.italic = document.queryCommandState('italic');
  activeFormats.value.underline = document.queryCommandState('underline');
  
  // Alignments
  activeFormats.value.alignLeft = document.queryCommandState('justifyLeft');
  activeFormats.value.alignCenter = document.queryCommandState('justifyCenter');
  activeFormats.value.alignRight = document.queryCommandState('justifyRight');
  activeFormats.value.alignJustify = document.queryCommandState('justifyFull');
  
  // Lists
  activeFormats.value.list = document.queryCommandState('insertUnorderedList');
  activeFormats.value.listOrdered = document.queryCommandState('insertOrderedList');
  
  // Block formats
  const block = document.queryCommandValue('formatBlock') || '';
  const blockLower = typeof block === 'string' ? block.toLowerCase() : '';
  activeFormats.value.h1 = blockLower === 'h1';
  activeFormats.value.h2 = blockLower === 'h2';
  activeFormats.value.h3 = blockLower === 'h3';
  activeFormats.value.quote = blockLower === 'blockquote';
}

// Rich Text Formatting execution
function format(command: string, value: string = '') {
  document.execCommand(command, false, value);
  if (editorRef.value) {
    editorRef.value.focus();
    content.value = editorRef.value.innerHTML;
    updateActiveFormats();
  }
}

// Checkbox item creation
function insertCheckbox() {
  const html = `<div class="todo-item" style="display: flex; align-items: center; gap: 8px; margin: 4px 0;"><input type="checkbox" style="width: 14px; height: 14px; cursor: pointer; border-radius: 4px;">&nbsp;<span style="outline: none;" contenteditable="true">Task</span></div>`;
  format('insertHTML', html);
}

// Handle key inputs in rich text div
function handleEditorInput() {
  if (editorRef.value) {
    content.value = editorRef.value.innerHTML;
    touchedContent.value = true;
    updateActiveFormats();
  }
}

// Keyboard shortcuts inside full editor
function handleEditorKeydown(e: KeyboardEvent) {
  // Ctrl+B, Ctrl+I, Ctrl+U are handled natively but we intercept to update reactivity
  if ((e.ctrlKey || e.metaKey) && ['b', 'i', 'u'].includes(e.key.toLowerCase())) {
    setTimeout(() => {
      if (editorRef.value) {
        content.value = editorRef.value.innerHTML;
        updateActiveFormats();
      }
    }, 10);
  }
  
  // Ctrl+Enter to submit
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    e.preventDefault();
    handleSubmit();
  }
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

// count raw text characters
const charCount = computed(() => {
  if (!editorRef.value) return content.value.replace(/<[^>]*>/g, '').length;
  return editorRef.value.textContent?.length ?? 0;
});

// count raw words
const wordCount = computed(() => {
  const text = (editorRef.value ? editorRef.value.textContent : content.value.replace(/<[^>]*>/g, '')) || '';
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
});

// title validation
const titleError = computed(() => {
  if (!touchedTitle.value) return null;
  const rawText = (editorRef.value ? editorRef.value.textContent : content.value.replace(/<[^>]*>/g, '')) || '';
  if (!title.value.trim() && !rawText.trim()) return 'Title or content is required';
  if (title.value.length > maxTitleLength) return `Title cannot exceed ${maxTitleLength} characters`;
  return null;
});

// content validation
const contentError = computed(() => {
  if (!touchedContent.value) return null;
  const rawText = (editorRef.value ? editorRef.value.textContent : content.value.replace(/<[^>]*>/g, '')) || '';
  if (!title.value.trim() && !rawText.trim()) return 'Title or content is required';
  if (rawText.length > maxContentLength) return `Content cannot exceed ${maxContentLength} characters`;
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
const isValid = computed(() => {
  const rawText = (editorRef.value ? editorRef.value.textContent : content.value.replace(/<[^>]*>/g, '')) || '';
  const hasText = title.value.trim().length > 0 || rawText.trim().length > 0;
  return hasText &&
    title.value.length <= maxTitleLength &&
    rawText.length <= maxContentLength &&
    (!isCustomCategory.value || (customCategoryValue.value.trim().length > 0 && customCategoryValue.value.trim().length <= 25));
});

// strip preview helper
function stripPreview(html: string) {
  if (!html) return 'No content written';
  const raw = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return raw.length > 180 ? raw.slice(0, 180) + '...' : raw;
}

// handle submit
function handleSubmit() {
  touchedTitle.value = true;
  touchedContent.value = true;
  if (!isValid.value || props.isSubmitting) return;

  const finalCategory = isCustomCategory.value ? customCategoryValue.value.trim() : category.value;
  
  emit('submit', {
    title: title.value.trim(),
    content: content.value,
    category: finalCategory,
    is_pinned: isPinned.value ? 1 : 0,
    is_archived: props.noteToEdit?.is_archived ?? 0,
    tags: JSON.stringify(noteTags.value)
  });
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
      class="fixed inset-0 z-50 flex items-center justify-center p-0"
      style="background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);"
      @click.self="emit('cancel')"
    >
      <div class="fixed inset-0 w-screen h-screen flex flex-col z-50 animate-scale-in" style="background: var(--bg-base);">
        <!-- Sticky Minimalist Header -->
        <header class="flex items-center justify-between border-b px-6 py-3.5 shrink-0" style="background: var(--bg-surface); border-color: var(--border);">
          <div class="flex items-center gap-3">
            <!-- Toggle Info Panel Sidebar -->
            <button
              type="button"
              class="p-1.5 border transition-colors rounded"
              :style="showSidebar ? 'background: var(--accent-glow); border-color: var(--accent); color: var(--accent);' : 'background: var(--bg-surface); border-color: var(--border); color: var(--text-secondary);'"
              title="Toggle Menu"
              @click="showSidebar = !showSidebar"
            >
              <Menu class="h-3.5 w-3.5" />
            </button>
            
            <div class="flex items-center gap-2 text-xs font-mono select-none" style="color: var(--text-muted);">
              <span>SuDu workspace</span>
              <span>/</span>
              <span style="color: var(--accent-light);">{{ category }}</span>
              <span>/</span>
              <span class="truncate max-w-[200px]" style="color: var(--text-secondary);">{{ title || 'Untitled Note' }}</span>
            </div>
          </div>
          
          <div class="flex items-center gap-3">
            <!-- Close / Discard -->
            <button
              type="button"
              class="p-1.5 border transition-colors rounded"
              style="background: var(--bg-raised); border-color: var(--border); color: var(--text-muted);"
              title="Discard & Close"
              @click="emit('cancel')"
            >
              <X class="h-3.5 w-3.5" />
            </button>

            <!-- Pin Toggle -->
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

            <PushButton variant="primary" :disabled="!isValid" @click="handleSubmit">
              <Check class="w-3.5 h-3.5" />
              Save & Close
            </PushButton>
          </div>
        </header>

        <!-- Main Layout Flex: Sidebar + Editor -->
        <div class="flex flex-1 min-h-0 relative">
          <!-- Slide-in Sidebar for Metadata -->
          <Transition name="sidebar-slide">
            <aside
              v-if="showSidebar"
              class="w-80 border-r flex flex-col overflow-y-auto shrink-0 shadow-lg z-10 relative"
              style="background: var(--bg-surface); border-color: var(--border);"
            >
              <div class="p-6 space-y-6">
                <h3 class="text-xs font-semibold tracking-wide uppercase font-mono mb-4 flex items-center gap-2" style="color: var(--text-primary);">
                  <div class="w-1.5 h-4" style="background: var(--accent);"></div>
                  Note Properties
                </h3>

                <!-- Category Selector -->
                <div class="flex flex-col gap-1.5 relative">
                  <label class="text-[11px] font-mono" style="color: var(--text-secondary);">// Category</label>
                  
                  <!-- Trigger button -->
                  <div class="relative w-full dropdown-container">
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
                    <Transition enter-active-class="transition-all duration-200 ease-out" enter-from-class="opacity-0 -translate-y-2" enter-to-class="opacity-100 translate-y-0" leave-active-class="transition-all duration-150 ease-in" leave-from-class="opacity-100 translate-y-0" leave-to-class="opacity-0 -translate-y-2">
                      <div
                        v-if="isDropdownOpen"
                        class="absolute top-full left-0 w-full mt-1 border rounded shadow-xl z-50 overflow-hidden"
                        style="background: var(--bg-surface); border-color: var(--border);"
                      >
                        <div class="p-1">
                          <button
                            v-for="cat in baseCategories"
                            :key="cat"
                            type="button"
                            class="w-full text-left px-3 py-2 text-xs font-mono rounded flex items-center gap-2 hover:bg-black/5"
                            :style="{ color: category === cat ? 'var(--text-primary)' : 'var(--text-secondary)', background: category === cat ? 'var(--bg-raised)' : 'transparent' }"
                            @click="selectCategory(cat)"
                          >
                            <component :is="getCategoryIcon(cat)" class="w-3.5 h-3.5" :style="{ color: category === cat ? 'var(--accent)' : 'inherit' }" />
                            {{ cat }}
                          </button>
                          
                          <div class="my-1 border-t" style="border-color: var(--border-subtle);"></div>
                          
                          <button
                            type="button"
                            class="w-full text-left px-3 py-2 text-xs font-mono rounded flex items-center gap-2 hover:bg-black/5"
                            :style="{ color: category === '__custom__' ? 'var(--accent)' : 'var(--text-secondary)' }"
                            @click="selectCategory('__custom__')"
                          >
                            <Settings class="w-3.5 h-3.5" />
                            Custom Category...
                          </button>
                        </div>
                      </div>
                    </Transition>
                  </div>
                  <input
                    v-if="isCustomCategory"
                    v-model="customCategoryValue"
                    type="text"
                    placeholder="Enter custom category"
                    class="w-full px-3 py-2 mt-2 text-xs border focus:outline-none transition-all rounded font-mono animate-scale-in"
                    style="background: var(--bg-raised); border-color: var(--border); color: var(--text-primary);"
                  />
                  <p v-if="customCategoryError" class="text-[10px] text-red-500 font-mono mt-0.5 animate-scale-in">
                    // {{ customCategoryError }}
                  </p>
                </div>

                <!-- Tags Input -->
                <div class="flex flex-col gap-1.5">
                  <label class="text-[11px] font-mono flex justify-between" style="color: var(--text-secondary);">
                    <span>// Tags (max 5)</span>
                    <span style="color: var(--text-muted);">{{ noteTags.length }}/5</span>
                  </label>
                  <div class="flex gap-2">
                    <input
                      v-model="newTagInput"
                      type="text"
                      placeholder="Add tag and press Enter"
                      class="flex-1 px-3 py-2 text-xs border focus:outline-none transition-all rounded font-mono"
                      style="background: var(--bg-raised); border-color: var(--border); color: var(--text-primary);"
                      @keydown.enter.prevent="addTag"
                    />
                  </div>
                  <p v-if="tagError" class="text-[10px] text-red-500 font-mono mt-0.5 animate-scale-in">
                    // {{ tagError }}
                  </p>

                  <div class="flex flex-wrap gap-1.5 mt-2">
                    <span
                      v-for="tag in noteTags"
                      :key="tag"
                      class="px-2 py-1 text-[10px] font-mono border rounded flex items-center gap-1 group animate-scale-in"
                      :style="getTagStyle(tag)"
                    >
                      <Hash class="w-2.5 h-2.5 opacity-50" />
                      {{ tag }}
                      <button
                        type="button"
                        class="ml-1 opacity-50 hover:opacity-100 hover:text-red-500 focus:outline-none transition-opacity"
                        @click="removeTag(tag)"
                      >
                        <X class="w-3 h-3" />
                      </button>
                    </span>
                  </div>
                </div>

                <!-- Fast Tag Suggestions -->
                <div class="pt-4 border-t" style="border-color: var(--border-subtle);">
                  <span class="block text-[11px] font-mono mb-2" style="color: var(--text-secondary);">// Quick Add</span>
                  <div class="flex flex-wrap gap-1.5">
                    <button
                      v-for="preset in ['Important', 'Review', 'Urgent', 'Later']"
                      :key="preset"
                      type="button"
                      class="px-2 py-0.5 text-[9px] font-mono border rounded transition-all hover:-translate-y-px"
                      :style="getTagStyle(preset)"
                      @click="toggleQuickTag(preset)"
                    >
                      + {{ preset }}
                    </button>
                  </div>
                </div>
              </div>
            </aside>
          </Transition>

          <!-- Main Editor Column -->
          <div class="flex-1 flex flex-col min-w-0 bg-base relative" style="background: var(--bg-base);">
            
            <!-- Floating Glassmorphic Formatting Ribbon -->
            <div class="flex justify-center py-2 shrink-0 border-b select-none z-10 relative" style="background: var(--bg-surface); border-color: var(--border-subtle);">
              <div class="flex items-center gap-1.5 px-4 py-1.5 rounded-full border shadow-sm animate-scale-in" style="background: var(--bg-raised); border-color: var(--border);">
                
                <!-- Font Styles -->
                <button type="button" class="ribbon-btn" :class="{ 'active': activeFormats.bold }" title="Bold (Ctrl+B)" @click="format('bold')">
                  <Bold class="w-3.5 h-3.5" />
                </button>
                <button type="button" class="ribbon-btn" :class="{ 'active': activeFormats.italic }" title="Italic (Ctrl+I)" @click="format('italic')">
                  <Italic class="w-3.5 h-3.5" />
                </button>
                <button type="button" class="ribbon-btn" :class="{ 'active': activeFormats.underline }" title="Underline (Ctrl+U)" @click="format('underline')">
                  <Underline class="w-3.5 h-3.5" />
                </button>

                <div class="ribbon-separator"></div>

                <!-- Headings -->
                <button type="button" class="ribbon-btn font-bold font-mono text-[10px]" :class="{ 'active': activeFormats.h1 }" title="Heading 1" @click="format('formatBlock', 'H1')">H1</button>
                <button type="button" class="ribbon-btn font-bold font-mono text-[10px]" :class="{ 'active': activeFormats.h2 }" title="Heading 2" @click="format('formatBlock', 'H2')">H2</button>
                <button type="button" class="ribbon-btn font-bold font-mono text-[10px]" :class="{ 'active': activeFormats.h3 }" title="Heading 3" @click="format('formatBlock', 'H3')">H3</button>

                <div class="ribbon-separator"></div>

                <!-- Alignments -->
                <button type="button" class="ribbon-btn" :class="{ 'active': activeFormats.alignLeft }" title="Align Left" @click="format('justifyLeft')">
                  <AlignLeft class="w-3.5 h-3.5" />
                </button>
                <button type="button" class="ribbon-btn" :class="{ 'active': activeFormats.alignCenter }" title="Align Center" @click="format('justifyCenter')">
                  <AlignCenter class="w-3.5 h-3.5" />
                </button>
                <button type="button" class="ribbon-btn" :class="{ 'active': activeFormats.alignRight }" title="Align Right" @click="format('justifyRight')">
                  <AlignRight class="w-3.5 h-3.5" />
                </button>
                <button type="button" class="ribbon-btn" :class="{ 'active': activeFormats.alignJustify }" title="Align Justify" @click="format('justifyFull')">
                  <AlignJustify class="w-3.5 h-3.5" />
                </button>

                <div class="ribbon-separator"></div>

                <!-- Indents -->
                <button type="button" class="ribbon-btn" title="Outdent" @click="format('outdent')">
                  <Outdent class="w-3.5 h-3.5" />
                </button>
                <button type="button" class="ribbon-btn" title="Indent" @click="format('indent')">
                  <Indent class="w-3.5 h-3.5" />
                </button>

                <div class="ribbon-separator"></div>

                <!-- Lists & Blocks -->
                <button type="button" class="ribbon-btn" :class="{ 'active': activeFormats.list }" title="Bullet List" @click="format('insertUnorderedList')">
                  <List class="w-3.5 h-3.5" />
                </button>
                <button type="button" class="ribbon-btn" :class="{ 'active': activeFormats.listOrdered }" title="Numbered List" @click="format('insertOrderedList')">
                  <ListOrdered class="w-3.5 h-3.5" />
                </button>
                <button type="button" class="ribbon-btn" title="Checklist" @click="insertCheckbox()">
                  <CheckSquare class="w-3.5 h-3.5" />
                </button>
                <button type="button" class="ribbon-btn" :class="{ 'active': activeFormats.quote }" title="Blockquote" @click="format('formatBlock', 'blockquote')">
                  <Quote class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <!-- Page Canvas Workspace -->
            <div class="flex-1 overflow-y-auto px-6 py-8 md:py-12" style="background: var(--bg-base);">
              
              <!-- MS Word style "Piece of Paper" -->
              <div 
                class="max-w-4xl mx-auto flex flex-col min-h-[850px] shadow-md border rounded" 
                style="background: var(--bg-surface); border-color: var(--border-subtle); padding: 4rem 5rem;"
              >
                <!-- Title input field -->
                <input
                  v-model="title"
                  type="text"
                  placeholder="Untitled Note"
                  class="w-full bg-transparent border-none text-4xl font-extrabold focus:outline-none tracking-tight mb-4 shrink-0"
                  style="color: var(--text-primary);"
                  @blur="touchedTitle = true"
                />

                <!-- Note Category + Tag pills indicators block -->
                <div class="flex items-center gap-2 select-none mb-8 border-b pb-4 shrink-0" style="border-color: var(--border-subtle);">
                  <!-- category badge -->
                  <span class="px-2 py-0.5 border rounded font-mono text-[9px] uppercase" :style="getTagStyle(category)">
                    {{ category === '__custom__' ? customCategoryValue : category }}
                  </span>
                  
                  <!-- tags badges -->
                  <div v-if="noteTags.length > 0" class="flex items-center gap-1.5">
                    <span v-for="tag in noteTags" :key="tag" class="px-2 py-0.5 border rounded font-mono text-[9px]" :style="getTagStyle(tag)">
                      {{ tag }}
                    </span>
                  </div>
                </div>

                <!-- ContentEditable Notion Editor Core -->
                <div
                  ref="editorRef"
                  contenteditable="true"
                  placeholder="Start typing your thoughts distraction-free..."
                  class="editor-sheet flex-1 focus:outline-none leading-relaxed text-base w-full"
                  style="color: var(--text-primary);"
                  @input="handleEditorInput"
                  @keydown="handleEditorKeydown"
                ></div>
              </div>
            </div>

            <!-- Status bar footer -->
            <footer class="flex items-center justify-between border-t px-6 py-2 font-mono text-[9px] shrink-0 z-10 relative" style="background: var(--bg-surface); border-color: var(--border); color: var(--text-muted);">
              <div class="flex items-center gap-4">
                <span>{{ wordCount }} WORDS</span>
                <span>{{ charCount }} CHARACTERS</span>
              </div>
              <div class="flex items-center gap-2">
                <span>SHORTCUTS: CTRL+B (BOLD) · CTRL+I (ITALIC) · CTRL+ENTER (SAVE)</span>
              </div>
            </footer>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>

.sidebar-slide-enter-active,
.sidebar-slide-leave-active {
  transition: all 0.25s cubic-bezier(0.19, 1, 0.22, 1);
  overflow: hidden;
}
.sidebar-slide-enter-from,
.sidebar-slide-leave-to {
  max-width: 0 !important;
  min-width: 0 !important;
  opacity: 0;
  padding-left: 0;
  padding-right: 0;
  border-left-width: 0;
  border-right-width: 0;
}
.sidebar-slide-enter-to,
.sidebar-slide-leave-from {
  max-width: 20rem; /* 320px */
  opacity: 1;
}

.fade-editor-enter-from {
  opacity: 0;
  transform: scale(0.98) translateY(6px);
}

.fade-editor-leave-to {
  opacity: 0;
  transform: scale(0.98) translateY(-6px);
}

/* Ribbon button styled formatting shapes */
.ribbon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: transparent;
  border: 1px solid transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.19, 1, 0.22, 1);
}

.ribbon-btn:hover {
  background-color: var(--bg-surface);
  border-color: var(--border);
  color: var(--text-primary);
  transform: translateY(-1px);
}

.ribbon-btn:active, .ribbon-btn.active {
  background-color: var(--accent-glow);
  border-color: var(--accent);
  color: var(--accent);
  transform: translateY(0);
}

.ribbon-separator {
  width: 1px;
  height: 16px;
  background-color: var(--border);
  margin: 0 5px;
}

/* Custom Dropdown Trigger */
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

/* Custom placeholder for contenteditable */
.editor-sheet:empty:before {
  content: attr(placeholder);
  color: var(--text-muted);
  font-style: italic;
  cursor: text;
}

/* Scoped rich styles for editable output */
.editor-sheet :deep(h1) {
  font-size: 1.65rem;
  font-weight: 800;
  color: var(--text-primary);
  margin-top: 1.5rem;
  margin-bottom: 0.6rem;
  line-height: 1.2;
}

.editor-sheet :deep(h2) {
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-top: 1.2rem;
  margin-bottom: 0.5rem;
  line-height: 1.25;
}

.editor-sheet :deep(h3) {
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-top: 1rem;
  margin-bottom: 0.4rem;
  line-height: 1.3;
}

.editor-sheet :deep(blockquote) {
  border-left: 3px solid var(--accent);
  padding-left: 1rem;
  color: var(--text-secondary);
  font-style: italic;
  margin: 1.2rem 0;
}

.editor-sheet :deep(ul) {
  list-style-type: disc;
  padding-left: 1.5rem;
  margin: 0.6rem 0;
}

.editor-sheet :deep(ol) {
  list-style-type: decimal;
  padding-left: 1.5rem;
  margin: 0.6rem 0;
}

.editor-sheet :deep(b), .editor-sheet :deep(strong) {
  font-weight: bold;
}

.editor-sheet :deep(i), .editor-sheet :deep(em) {
  font-style: italic;
}

.editor-sheet :deep(u) {
  text-decoration: underline;
}

.editor-sheet :deep(div.todo-item) {
  margin: 6px 0;
}
</style>
