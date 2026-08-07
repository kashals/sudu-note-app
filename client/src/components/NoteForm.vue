<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted, nextTick } from 'vue';
import {
  X, Check, Pin, FolderOpen, Hash, ChevronDown,
  User, Briefcase, Lightbulb, BookOpen, Users, Folder, Settings,
  Maximize2, Minimize2, Bold, Italic, Underline, AlignLeft,
  AlignCenter, AlignRight, AlignJustify, Outdent, Indent,
  List, ListOrdered, CheckSquare, Quote, PenTool, Layout, Menu,
  Undo, Redo, HelpCircle
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
  (e: 'autosave', payload: CreateNoteDto): void;
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

// Shortcuts modal state
const isShortcutsModalOpen = ref(false);

// Auto-save state
const autoSave = ref(localStorage.getItem('sudu_autosave') !== 'false');
const autoSaveStatus = ref<'idle' | 'saving' | 'saved'>('idle');
let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;

// Dirty flag — only true when the USER has actually changed something
// Never set by programmatic updates (load, noteToEdit prop change, etc.)
const isDirty = ref(false);

function markDirty() {
  isDirty.value = true;
}

function toggleAutoSave() {
  autoSave.value = !autoSave.value;
  localStorage.setItem('sudu_autosave', String(autoSave.value));
  if (!autoSave.value) {
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    autoSaveTimer = null;
    autoSaveStatus.value = 'idle';
  }
}

function triggerAutoSave() {
  if (!autoSave.value || !props.isOpen) return;
  if (!props.noteToEdit?.id) return;
  if (!isDirty.value) return;
  // Silently reset the debounce timer — NO status change while user is typing
  if (autoSaveTimer) clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => doAutoSave(), 3000);
}

function doAutoSave() {
  if (!isValid.value || props.isSubmitting) {
    autoSaveStatus.value = 'idle';
    return;
  }
  // Mark clean before emitting so any reactive side-effects don't re-trigger
  isDirty.value = false;
  autoSaveStatus.value = 'saving';
  const finalCategory = isCustomCategory.value ? customCategoryValue.value.trim() : category.value;
  emit('autosave', {
    title: title.value.trim(),
    content: content.value,
    category: finalCategory,
    is_pinned: isPinned.value ? 1 : 0,
    is_archived: props.noteToEdit?.is_archived ?? 0,
    tags: JSON.stringify(noteTags.value)
  });
  setTimeout(() => { autoSaveStatus.value = 'saved'; }, 600);
  setTimeout(() => { autoSaveStatus.value = 'idle'; }, 2400);
}

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

// Category watch — only handles isCustomCategory flag, no autosave
watch(category, (val) => {
  isCustomCategory.value = val === '__custom__';
  if (val !== '__custom__') customCategoryValue.value = '';
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
    showSidebar.value = false;
    // Reset dirty — this is a programmatic load, not a user change
    isDirty.value = false;
    if (autoSaveTimer) { clearTimeout(autoSaveTimer); autoSaveTimer = null; }
    autoSaveStatus.value = 'idle';

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
  markDirty();
  triggerAutoSave();
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
  // For block-level formats (headings, blockquote), toggle back to 'p' if already active
  if (command === 'formatBlock') {
    const currentBlock = document.queryCommandValue('formatBlock').toLowerCase();
    const target = value.toLowerCase();
    if (currentBlock === target) {
      document.execCommand('formatBlock', false, 'p');
    } else {
      document.execCommand('formatBlock', false, value);
    }
  } else {
    document.execCommand(command, false, value || undefined);
  }
  if (editorRef.value) {
    editorRef.value.focus();
    content.value = editorRef.value.innerHTML;
    updateActiveFormats();
  }
  markDirty();
  triggerAutoSave();
}

// Checkbox item creation — inserts a todo-item and keeps cursor on the same line
function insertCheckbox() {
  if (!editorRef.value) return;
  editorRef.value.focus();

  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return;

  const range = sel.getRangeAt(0);
  range.deleteContents();

  // Build the todo wrapper
  const wrapper = document.createElement('div');
  wrapper.className = 'todo-item';
  wrapper.setAttribute('data-todo', 'true');
  wrapper.style.cssText = 'display: flex; align-items: center; gap: 8px; margin: 4px 0;';

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.style.cssText = 'width: 14px; height: 14px; cursor: pointer; border-radius: 4px; flex-shrink: 0;';

  // Zero-width space anchors the caret inside the empty span reliably
  const ZWSP = '\u200b';
  const label = document.createElement('span');
  label.setAttribute('contenteditable', 'true');
  label.setAttribute('data-todo-label', 'true');
  label.style.cssText = 'outline: none; flex: 1;';
  label.textContent = ZWSP;

  wrapper.appendChild(checkbox);
  wrapper.appendChild(label);

  // Only insert the wrapper — NO afterPara yet; it's created on Enter
  range.insertNode(wrapper);

  // Place cursor at the start of the label (after the zero-width space anchor)
  const newRange = document.createRange();
  const textNode = label.firstChild!;
  newRange.setStart(textNode, 1); // position after the ZWSP
  newRange.collapse(true);
  sel.removeAllRanges();
  sel.addRange(newRange);

  content.value = editorRef.value.innerHTML;
  updateActiveFormats();
}

// Handle key inputs in rich text div
function handleEditorInput() {
  if (editorRef.value) {
    content.value = editorRef.value.innerHTML;
    touchedContent.value = true;
    updateActiveFormats();
    markDirty();
    triggerAutoSave();
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

  // ── Backspace inside a todo-item: delete the whole row in one keystroke ──
  if (e.key === 'Backspace') {
    const sel = window.getSelection();
    if (sel && sel.rangeCount && sel.isCollapsed) {
      let node: Node | null = sel.getRangeAt(0).startContainer;
      let todoWrapper: HTMLElement | null = null;
      while (node && node !== editorRef.value) {
        if (node instanceof HTMLElement && node.dataset.todo === 'true') {
          todoWrapper = node;
          break;
        }
        node = node.parentNode;
      }

      if (todoWrapper) {
        // Find the label span's actual text content (strip ZWSP)
        const labelEl = todoWrapper.querySelector('[data-todo-label]') as HTMLElement | null;
        const rawText = labelEl?.textContent?.replace(/\u200b/g, '') ?? '';
        const range = sel.getRangeAt(0);

        // Only intercept when: label is empty, OR cursor is at the very beginning of it
        const atStart = range.startOffset <= 1 && (range.startContainer === labelEl || range.startContainer === labelEl?.firstChild);
        if (rawText === '' || atStart) {
          e.preventDefault();
          // Place cursor on the previous sibling (or start of editor) before removing
          const prev = todoWrapper.previousSibling;
          todoWrapper.parentNode?.removeChild(todoWrapper);

          if (prev) {
            const newRange = document.createRange();
            newRange.selectNodeContents(prev);
            newRange.collapse(false); // collapse to end
            sel.removeAllRanges();
            sel.addRange(newRange);
          }
          if (editorRef.value) content.value = editorRef.value.innerHTML;
          return;
        }
      }
    }
  }

  // ── Enter inside a todo-item label: exit to paragraph after the wrapper ──
  if (e.key === 'Enter' && !e.shiftKey && !(e.metaKey || e.ctrlKey)) {
    const sel = window.getSelection();
    if (sel && sel.rangeCount) {
      let node: Node | null = sel.getRangeAt(0).startContainer;
      let todoWrapper: HTMLElement | null = null;
      while (node && node !== editorRef.value) {
        if (node instanceof HTMLElement && node.dataset.todo === 'true') {
          todoWrapper = node;
          break;
        }
        node = node.parentNode;
      }

      if (todoWrapper) {
        e.preventDefault();
        let after = todoWrapper.nextSibling;
        if (!after || (after instanceof HTMLElement && after.dataset.todo === 'true')) {
          const p = document.createElement('p');
          p.innerHTML = '<br>';
          todoWrapper.parentNode?.insertBefore(p, todoWrapper.nextSibling ?? null);
          after = p;
        }
        const range = document.createRange();
        range.setStart(after, 0);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
        if (editorRef.value) content.value = editorRef.value.innerHTML;
        return;
      }
    }
  }

  // Ctrl+Z / Ctrl+Y for Undo / Redo tracking
  if ((e.ctrlKey || e.metaKey) && ['z', 'y'].includes(e.key.toLowerCase())) {
    setTimeout(() => {
      if (editorRef.value) {
        content.value = editorRef.value.innerHTML;
        updateActiveFormats();
        markDirty();
        triggerAutoSave();
      }
    }, 10);
  }

  // Ctrl+Enter to submit
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    e.preventDefault();
    handleSubmit();
    return;
  }

  // Escape: close shortcuts modal, dismiss warning, or go through the close guard
  if (e.key === 'Escape') {
    e.preventDefault();
    if (isShortcutsModalOpen.value) {
      isShortcutsModalOpen.value = false;
    } else if (showUnsavedWarning.value) {
      dismissWarning();
    } else {
      requestClose();
    }
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
  markDirty();
  triggerAutoSave();
}

function removeTag(tag: string) {
  noteTags.value = noteTags.value.filter(t => t !== tag);
  tagError.value = null;
  markDirty();
  triggerAutoSave();
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
  markDirty();
  triggerAutoSave();
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

  isDirty.value = false;
  showUnsavedWarning.value = false;
  if (autoSaveTimer) { clearTimeout(autoSaveTimer); autoSaveTimer = null; }

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

// Unsaved changes guard
const showUnsavedWarning = ref(false);

function requestClose() {
  if (isDirty.value) {
    showUnsavedWarning.value = true;
  } else {
    emit('cancel');
  }
}

function confirmDiscard() {
  isDirty.value = false;
  showUnsavedWarning.value = false;
  if (autoSaveTimer) { clearTimeout(autoSaveTimer); autoSaveTimer = null; }
  autoSaveStatus.value = 'idle';
  emit('cancel');
}

function dismissWarning() {
  showUnsavedWarning.value = false;
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
  if (autoSaveTimer) clearTimeout(autoSaveTimer);
});

// Expose requestClose so App.vue's global Escape can delegate here
defineExpose({ requestClose });
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
      @click.self="requestClose()"
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
              <button
                type="button"
                class="hover:underline transition-colors cursor-pointer"
                style="color: var(--text-muted);"
                title="Return to Workspace"
                @click="requestClose()"
              >
                SuDu workspace
              </button>
              <span>/</span>
              <button
                type="button"
                class="hover:underline transition-colors cursor-pointer"
                style="color: var(--accent-light);"
                :title="`Return from ${category}`"
                @click="requestClose()"
              >
                {{ category === '__custom__' ? (customCategoryValue || 'Custom') : category }}
              </button>
              <span>/</span>
              <span class="truncate max-w-[200px]" style="color: var(--text-secondary);">{{ title || 'Untitled Note' }}</span>
            </div>
          </div>
          
          <div class="flex items-center gap-3">
            <PushButton variant="primary" :disabled="!isValid" @click="handleSubmit">
              <Check class="w-3.5 h-3.5" />
              Save &amp; Close
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

                <!-- Pin Note Toggle -->
                <div class="pt-4 border-t flex items-center justify-between" style="border-color: var(--border-subtle);">
                  <div>
                    <span class="block text-[11px] font-mono" style="color: var(--text-secondary);">// Pin Note</span>
                    <span class="block text-[10px] font-mono mt-0.5" style="color: var(--text-muted);">Keep note pinned at top</span>
                  </div>
                  <button
                    type="button"
                    class="autosave-toggle"
                    :class="{ 'autosave-toggle--on': isPinned }"
                    :title="isPinned ? 'Unpin Note' : 'Pin to Top'"
                    @click="isPinned = !isPinned; markDirty(); triggerAutoSave();"
                  >
                    <span class="autosave-thumb" />
                  </button>
                </div>

                <!-- Auto-Save Toggle -->
                <div class="pt-4 border-t flex items-center justify-between" style="border-color: var(--border-subtle);">
                  <div>
                    <span class="block text-[11px] font-mono" style="color: var(--text-secondary);">// Auto-Save</span>
                    <span class="block text-[10px] font-mono mt-0.5" style="color: var(--text-muted);">Saves 3s after typing stops</span>
                  </div>
                  <!-- Toggle switch -->
                  <button
                    type="button"
                    class="autosave-toggle"
                    :class="{ 'autosave-toggle--on': autoSave }"
                    :title="autoSave ? 'Auto-Save ON — click to disable' : 'Auto-Save OFF — click to enable'"
                    @click="toggleAutoSave()"
                  >
                    <span class="autosave-thumb" />
                  </button>
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

                <!-- Keyboard Shortcuts Button -->
                <div class="pt-4 border-t" style="border-color: var(--border-subtle);">
                  <button
                    type="button"
                    class="w-full px-3 py-2 text-xs font-mono border rounded flex items-center justify-between transition-colors hover:border-gray-500"
                    style="background: var(--bg-raised); border-color: var(--border); color: var(--text-secondary);"
                    @click="isShortcutsModalOpen = true"
                  >
                    <div class="flex items-center gap-2">
                      <HelpCircle class="w-3.5 h-3.5" style="color: var(--accent);" />
                      <span>Keyboard Shortcuts</span>
                    </div>
                    <span class="px-1.5 py-0.5 text-[9px] border rounded font-mono" style="background: var(--bg-surface); border-color: var(--border); color: var(--text-muted);">?</span>
                  </button>
                </div>
              </div>
            </aside>
          </Transition>

          <!-- Main Editor Column -->
          <div class="flex-1 flex flex-col min-w-0 bg-base relative" style="background: var(--bg-base);">
            
            <!-- Floating Glassmorphic Formatting Ribbon -->
            <div class="flex justify-center py-2 shrink-0 border-b select-none z-10 relative" style="background: var(--bg-surface); border-color: var(--border-subtle);">
              <div class="flex items-center gap-1.5 px-4 py-1.5 rounded-full border shadow-sm animate-scale-in" style="background: var(--bg-raised); border-color: var(--border);">
                
                <!-- Undo & Redo -->
                <button type="button" class="ribbon-btn" title="Undo (Ctrl+Z)" @click="format('undo')">
                  <Undo class="w-3.5 h-3.5" />
                </button>
                <button type="button" class="ribbon-btn" title="Redo (Ctrl+Y)" @click="format('redo')">
                  <Redo class="w-3.5 h-3.5" />
                </button>

                <div class="ribbon-separator"></div>

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
                  @input="markDirty(); triggerAutoSave()"
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
                <button
                  type="button"
                  class="flex items-center gap-1 hover:underline transition-colors"
                  style="color: var(--text-muted);"
                  @click="isShortcutsModalOpen = true"
                >
                  <HelpCircle class="w-3 h-3" style="color: var(--accent);" />
                  <span>KEYBOARD SHORTCUTS (?)</span>
                </button>
              </div>
            </footer>

            <!-- Fixed bottom-right autosave pill -->
            <Transition name="autosave-fade">
              <div
                v-if="autoSaveStatus !== 'idle'"
                class="autosave-corner-pill"
              >
                <span v-if="autoSaveStatus === 'saving'" class="autosave-spinner" />
                <svg v-else-if="autoSaveStatus === 'saved'" class="w-3.5 h-3.5" style="color: var(--accent);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                <span :style="autoSaveStatus === 'saved' ? 'color: var(--accent)' : ''">
                  {{ autoSaveStatus === 'saving' ? 'Autosaving...' : 'Autosaved' }}
                </span>
              </div>
            </Transition>

            <!-- Unsaved Changes Toast (bottom-center) -->
            <Transition name="warn-toast">
              <div
                v-if="showUnsavedWarning"
                class="unsaved-toast"
              >
                <div class="flex items-center gap-2" style="color: #fbbf24;">
                  <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  <span class="font-mono text-xs" style="color: var(--text-primary);">Unsaved changes</span>
                </div>
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    class="unsaved-toast-btn"
                    style="color: var(--text-secondary);"
                    @click="dismissWarning()"
                  >Keep Editing</button>
                  <button
                    type="button"
                    class="unsaved-toast-btn"
                    style="color: #f87171; border-color: rgba(239,68,68,0.35); background: rgba(239,68,68,0.07);"
                    @click="confirmDiscard()"
                  >Discard</button>
                  <button
                    type="button"
                    class="unsaved-toast-btn"
                    style="color: var(--accent-light); border-color: var(--accent); background: var(--accent-glow);"
                    :disabled="!isValid"
                    @click="handleSubmit()"
                  >Save &amp; Close</button>
                </div>
              </div>
            </Transition>

            <!-- Keyboard Shortcuts Modal -->
            <Transition name="fade-editor">
              <div
                v-if="isShortcutsModalOpen"
                class="fixed inset-0 z-[80] flex items-center justify-center p-4"
                style="background: rgba(0,0,0,0.65); backdrop-filter: blur(4px);"
                @click.self="isShortcutsModalOpen = false"
              >
                <div
                  class="w-full max-w-md border rounded-xl shadow-2xl p-6 space-y-4 animate-scale-in"
                  style="background: var(--bg-surface); border-color: var(--border);"
                >
                  <div class="flex items-center justify-between border-b pb-3" style="border-color: var(--border-subtle);">
                    <div class="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider" style="color: var(--text-primary);">
                      <HelpCircle class="w-4 h-4" style="color: var(--accent);" />
                      Keyboard Shortcuts
                    </div>
                    <button
                      type="button"
                      class="p-1 border rounded transition-colors"
                      style="background: var(--bg-raised); border-color: var(--border); color: var(--text-muted);"
                      @click="isShortcutsModalOpen = false"
                    >
                      <X class="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div class="grid grid-cols-1 gap-1.5 font-mono text-xs">
                    <div class="flex items-center justify-between py-1.5 border-b" style="border-color: var(--border-subtle);">
                      <span style="color: var(--text-secondary);">Undo</span>
                      <kbd class="px-2 py-0.5 border rounded text-[10px]" style="background: var(--bg-raised); border-color: var(--border); color: var(--text-primary);">Ctrl + Z</kbd>
                    </div>
                    <div class="flex items-center justify-between py-1.5 border-b" style="border-color: var(--border-subtle);">
                      <span style="color: var(--text-secondary);">Redo</span>
                      <kbd class="px-2 py-0.5 border rounded text-[10px]" style="background: var(--bg-raised); border-color: var(--border); color: var(--text-primary);">Ctrl + Y</kbd>
                    </div>
                    <div class="flex items-center justify-between py-1.5 border-b" style="border-color: var(--border-subtle);">
                      <span style="color: var(--text-secondary);">Bold Text</span>
                      <kbd class="px-2 py-0.5 border rounded text-[10px]" style="background: var(--bg-raised); border-color: var(--border); color: var(--text-primary);">Ctrl + B</kbd>
                    </div>
                    <div class="flex items-center justify-between py-1.5 border-b" style="border-color: var(--border-subtle);">
                      <span style="color: var(--text-secondary);">Italic Text</span>
                      <kbd class="px-2 py-0.5 border rounded text-[10px]" style="background: var(--bg-raised); border-color: var(--border); color: var(--text-primary);">Ctrl + I</kbd>
                    </div>
                    <div class="flex items-center justify-between py-1.5 border-b" style="border-color: var(--border-subtle);">
                      <span style="color: var(--text-secondary);">Underline Text</span>
                      <kbd class="px-2 py-0.5 border rounded text-[10px]" style="background: var(--bg-raised); border-color: var(--border); color: var(--text-primary);">Ctrl + U</kbd>
                    </div>
                    <div class="flex items-center justify-between py-1.5 border-b" style="border-color: var(--border-subtle);">
                      <span style="color: var(--text-secondary);">Save &amp; Close</span>
                      <kbd class="px-2 py-0.5 border rounded text-[10px]" style="background: var(--bg-raised); border-color: var(--border); color: var(--text-primary);">Ctrl + Enter</kbd>
                    </div>
                    <div class="flex items-center justify-between py-1.5" style="border-color: var(--border-subtle);">
                      <span style="color: var(--text-secondary);">Exit / Back</span>
                      <kbd class="px-2 py-0.5 border rounded text-[10px]" style="background: var(--bg-raised); border-color: var(--border); color: var(--text-primary);">Esc</kbd>
                    </div>
                  </div>
                </div>
              </div>
            </Transition>
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

/* ── Auto-save corner pill ── */
.autosave-corner-pill {
  position: fixed;
  bottom: 52px; /* sit just above the status bar */
  right: 20px;
  z-index: 60;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 6px 12px;
  border-radius: 99px;
  border: 1px solid var(--border);
  background: var(--bg-raised);
  font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
  font-size: 10px;
  color: var(--text-secondary);
  box-shadow: 0 4px 16px rgba(0,0,0,0.25);
  pointer-events: none;
  user-select: none;
}

/* ── Auto-save toggle switch ── */
.autosave-toggle {
  position: relative;
  width: 36px;
  height: 20px;
  border-radius: 99px;
  border: none;
  background: var(--border);
  cursor: pointer;
  transition: background 0.25s ease;
  flex-shrink: 0;
}

.autosave-toggle--on {
  background: var(--accent);
}

.autosave-thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #fff;
  transition: transform 0.25s cubic-bezier(0.19, 1, 0.22, 1);
  display: block;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}

.autosave-toggle--on .autosave-thumb {
  transform: translateX(16px);
}

/* ── Auto-save spinner ── */
.autosave-spinner {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 1.5px solid var(--border);
  border-top-color: var(--accent);
  animation: autosave-spin 0.7s linear infinite;
}

@keyframes autosave-spin {
  to { transform: rotate(360deg); }
}

/* ── Auto-save fade transition ── */
.autosave-fade-enter-active,
.autosave-fade-leave-active {
  transition: opacity 0.3s ease;
}
.autosave-fade-enter-from,
.autosave-fade-leave-to {
  opacity: 0;
}

/* ── Unsaved changes toast ── */
.unsaved-toast {
  position: fixed;
  bottom: 60px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 70;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 20px;
  border-radius: 12px;
  border: 1px solid rgba(245, 158, 11, 0.3);
  background: var(--bg-raised);
  box-shadow: 0 8px 32px rgba(0,0,0,0.35), 0 0 0 1px rgba(245,158,11,0.08);
  pointer-events: all;
  user-select: none;
  white-space: nowrap;
}

.unsaved-toast-btn {
  padding: 5px 12px;
  font-size: 10px;
  font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--bg-surface);
  cursor: pointer;
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.unsaved-toast-btn:hover {
  opacity: 0.85;
  transform: translateY(-1px);
}

.unsaved-toast-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
}

/* slide-up from bottom */
.warn-toast-enter-active,
.warn-toast-leave-active {
  transition: all 0.25s cubic-bezier(0.19, 1, 0.22, 1);
}
.warn-toast-enter-from,
.warn-toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(16px);
}
.warn-toast-enter-to,
.warn-toast-leave-from {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

/* ── Unsaved warning banner slide ── */
.warn-slide-enter-active,
.warn-slide-leave-active {
  transition: all 0.2s cubic-bezier(0.19, 1, 0.22, 1);
  overflow: hidden;
}
.warn-slide-enter-from,
.warn-slide-leave-to {
  max-height: 0;
  opacity: 0;
  padding-top: 0;
  padding-bottom: 0;
}
.warn-slide-enter-to,
.warn-slide-leave-from {
  max-height: 80px;
  opacity: 1;
}
</style>
