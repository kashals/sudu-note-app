<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted, nextTick, toRef } from 'vue';
import { Menu, Check, HelpCircle, X } from '@lucide/vue';
import type { Note, CreateNoteDto } from '../types/note';
import PushButton from './PushButton.vue';
import CategoryBadge from './ui/CategoryBadge.vue';
import TagPill from './ui/TagPill.vue';
import ShortcutsModal from './ui/ShortcutsModal.vue';
import EditorRibbon from './editor/EditorRibbon.vue';
import NoteSidebar from './editor/NoteSidebar.vue';
import UnsavedToast from './editor/UnsavedToast.vue';
import { useAutoSave } from '../composables/useAutoSave';
import { useEditor } from '../composables/useEditor';
import { useFolderState } from '../composables/useFolderState';

const { folders } = useFolderState();

const props = defineProps<{
  isOpen: boolean;
  noteToEdit?: Note | null;
  isSubmitting?: boolean;
  serverError?: string | null;
}>();

const emit = defineEmits<{
  (e: 'submit', payload: CreateNoteDto): void;
  (e: 'autosave', payload: CreateNoteDto): void;
  (e: 'cancel'): void;
  (e: 'toggle-lock'): void;
}>();

// Form state
const title = ref('');
const content = ref('');
const category = ref('Personal');
const isPinned = ref(false);

const touchedTitle = ref(false);
const touchedContent = ref(false);

const maxTitleLength = 200;
const maxContentLength = 10000;
const baseCategories = ['Personal', 'Work', 'Ideas', 'Research', 'Meeting', 'Project'];

const isCustomCategory = ref(false);
const customCategoryValue = ref('');
const showSidebar = ref(false);
const isShortcutsModalOpen = ref(false);
const showUnsavedWarning = ref(false);

const noteTags = ref<string[]>([]);
const tagError = ref<string | null>(null);
const editorRef = ref<HTMLDivElement | null>(null);

const folderName = computed(() => {
  const folderId = props.noteToEdit?.folder_id;
  if (folderId) {
    const f = folders.value.find(item => item.id === folderId);
    return f ? f.name : null;
  }
  return null;
});

// Validation
const isValid = computed(() => {
  const rawText = (editorRef.value ? editorRef.value.textContent : content.value.replace(/<[^>]*>/g, '')) || '';
  const hasText = title.value.trim().length > 0 || rawText.trim().length > 0;
  return hasText &&
    title.value.length <= maxTitleLength &&
    rawText.length <= maxContentLength &&
    (!isCustomCategory.value || (customCategoryValue.value.trim().length > 0 && customCategoryValue.value.trim().length <= 25));
});

const customCategoryError = computed(() => {
  if (isCustomCategory.value && touchedTitle.value) {
    const val = customCategoryValue.value.trim();
    if (!val) return 'Custom category name is required';
    if (val.length > 25) return 'Custom category name is too long';
  }
  return null;
});

// Helper for autosave payload construction
function getFormData(): CreateNoteDto {
  const finalCategory = isCustomCategory.value ? customCategoryValue.value.trim() : category.value;
  return {
    title: title.value.trim(),
    content: content.value,
    category: finalCategory,
    is_pinned: isPinned.value ? 1 : 0,
    is_archived: props.noteToEdit?.is_archived ?? 0,
    tags: JSON.stringify(noteTags.value)
  };
}

// AutoSave Composable
const {
  autoSave,
  autoSaveStatus,
  isDirty,
  markDirty: rawMarkDirty,
  resetDirty: rawResetDirty,
  toggleAutoSave,
  triggerAutoSave,
  flushAutoSave,
  cleanupAutoSave
} = useAutoSave(
  toRef(props, 'isOpen'),
  () => props.noteToEdit?.id,
  isValid,
  toRef(props, 'isSubmitting'),
  (payload) => {
    clearDraftFromStorage();
    emit('autosave', payload);
  }
);

function markDirty() {
  rawMarkDirty();
  saveDraftToStorage();
}

function resetDirty() {
  rawResetDirty();
  clearDraftFromStorage();
}

function saveDraftToStorage() {
  if (!props.noteToEdit) {
    localStorage.setItem('sudu_new_note_draft', JSON.stringify({
      title: title.value,
      content: content.value,
      category: category.value,
      isCustomCategory: isCustomCategory.value,
      customCategoryValue: customCategoryValue.value,
      isPinned: isPinned.value,
      tags: noteTags.value
    }));
  }
}

function clearDraftFromStorage() {
  localStorage.removeItem('sudu_new_note_draft');
}

// Unsaved changes request close helper
function requestClose() {
  if (isDirty.value) {
    showUnsavedWarning.value = true;
  } else {
    emit('cancel');
  }
}

function confirmDiscard() {
  resetDirty();
  showUnsavedWarning.value = false;
  emit('cancel');
}

function dismissWarning() {
  showUnsavedWarning.value = false;
}

// Editor Composable
const {
  activeFormats,
  updateActiveFormats,
  format,
  insertCheckbox,
  handleEditorInput,
  handleEditorKeydown
} = useEditor(
  editorRef,
  content,
  touchedContent,
  markDirty,
  () => triggerAutoSave(getFormData),
  handleSubmit,
  requestClose,
  isShortcutsModalOpen,
  showUnsavedWarning,
  dismissWarning
);

// Submit handler
function handleSubmit() {
  touchedTitle.value = true;
  touchedContent.value = true;
  if (!isValid.value || props.isSubmitting) return;

  resetDirty();
  showUnsavedWarning.value = false;
  emit('submit', getFormData());
}

// Category selection watch
watch(category, (val) => {
  isCustomCategory.value = val === '__custom__';
  if (val !== '__custom__') customCategoryValue.value = '';
});

// Tags management
function addTag(cleanTag: string) {
  if (cleanTag.length > 15) {
    tagError.value = 'Tag name cannot exceed 15 characters';
    return;
  }
  if (noteTags.value.length >= 5) {
    tagError.value = 'Maximum of 5 tags allowed per note';
    return;
  }
  const lower = cleanTag.toLowerCase();
  if (noteTags.value.some(t => t.toLowerCase() === lower)) {
    tagError.value = `Tag "${cleanTag}" already exists`;
    return;
  }
  tagError.value = null;
  noteTags.value.push(cleanTag);
  markDirty();
  triggerAutoSave(getFormData);
}

function removeTag(tag: string) {
  noteTags.value = noteTags.value.filter(t => t !== tag);
  tagError.value = null;
  markDirty();
  triggerAutoSave(getFormData);
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
  triggerAutoSave(getFormData);
}

// Reset or populate state cleanly when opening or changing target note
function resetOrPopulateForm() {
  const newNote = props.noteToEdit;
  if (!newNote) {
    const savedDraft = localStorage.getItem('sudu_new_note_draft');
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        if (parsed.title || parsed.content) {
          title.value = parsed.title || '';
          content.value = parsed.content || '';
          category.value = parsed.category || 'Personal';
          isCustomCategory.value = Boolean(parsed.isCustomCategory);
          customCategoryValue.value = parsed.customCategoryValue || '';
          isPinned.value = Boolean(parsed.isPinned);
          noteTags.value = Array.isArray(parsed.tags) ? parsed.tags : [];
        } else {
          title.value = '';
          content.value = '';
          isPinned.value = false;
          noteTags.value = [];
        }
      } catch {
        clearDraftFromStorage();
        title.value = '';
        content.value = '';
        isPinned.value = false;
        noteTags.value = [];
      }
    } else {
      title.value = '';
      content.value = '';
      isPinned.value = false;
      noteTags.value = [];
    }
  } else {
    title.value = newNote.title ?? '';
    content.value = newNote.content ?? '';
    isPinned.value = newNote.is_pinned === 1;
    try {
      noteTags.value = JSON.parse(newNote.tags || '[]');
    } catch {
      noteTags.value = [];
    }
  }

  touchedTitle.value = false;
  touchedContent.value = false;
  tagError.value = null;

  const catVal = newNote?.category ?? category.value ?? 'Personal';
  if (catVal && !baseCategories.includes(catVal) && newNote) {
    category.value = '__custom__';
    customCategoryValue.value = catVal;
    isCustomCategory.value = true;
  } else if (!newNote && isCustomCategory.value) {
    // Keep custom category if present
  } else {
    category.value = catVal;
    customCategoryValue.value = '';
    isCustomCategory.value = false;
  }
  showSidebar.value = false;
  rawResetDirty();

  nextTick(() => {
    if (editorRef.value) {
      editorRef.value.innerHTML = content.value;
      updateActiveFormats();
    }
  });
}

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      resetOrPopulateForm();
      document.addEventListener('selectionchange', updateActiveFormats);
    } else {
      document.removeEventListener('selectionchange', updateActiveFormats);
    }
  },
  { immediate: true }
);

watch(
  () => props.noteToEdit,
  () => {
    if (props.isOpen) {
      resetOrPopulateForm();
    }
  }
);

watch(editorRef, (el) => {
  if (el) {
    el.innerHTML = content.value;
    el.focus();
    updateActiveFormats();
  }
});

// Dropdown click-outside listener
function closeDropdownOnOutsideClick(e: MouseEvent) {
  const target = e.target as HTMLElement;
  if (!target.closest('.dropdown-container')) {
    // Dropdown inside CategorySelect handles click outside if open
  }
}

function handleBeforeUnload(e: BeforeUnloadEvent) {
  if (isDirty.value) {
    flushAutoSave(getFormData);
    e.preventDefault();
    e.returnValue = '';
  }
}

onMounted(() => {
  document.addEventListener('click', closeDropdownOnOutsideClick);
  window.addEventListener('beforeunload', handleBeforeUnload);
});

onUnmounted(() => {
  document.removeEventListener('click', closeDropdownOnOutsideClick);
  window.removeEventListener('beforeunload', handleBeforeUnload);
  cleanupAutoSave();
});

// Word/Char counter
const charCount = computed(() => {
  if (!editorRef.value) return content.value.replace(/<[^>]*>/g, '').length;
  return editorRef.value.textContent?.length ?? 0;
});

const wordCount = computed(() => {
  const text = (editorRef.value ? editorRef.value.textContent : content.value.replace(/<[^>]*>/g, '')) || '';
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
});

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
        <header class="flex items-center justify-between border-b px-3 sm:px-6 py-3.5 shrink-0" style="background: var(--bg-surface); border-color: var(--border);">
          <div class="flex items-center gap-2 sm:gap-3 min-w-0">
            <!-- Sidebar Toggle Menu Button -->
            <button
              type="button"
              class="p-1.5 border transition-colors rounded shrink-0"
              :style="showSidebar ? 'background: var(--accent-glow); border-color: var(--accent); color: var(--accent);' : 'background: var(--bg-surface); border-color: var(--border); color: var(--text-secondary);'"
              title="Toggle Menu"
              @click="showSidebar = !showSidebar"
            >
              <Menu class="h-3.5 w-3.5" />
            </button>
            
            <!-- Clickable Breadcrumbs -->
            <div class="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-mono select-none min-w-0" style="color: var(--text-muted);">
              <button
                type="button"
                class="hover:underline transition-colors cursor-pointer shrink-0"
                style="color: var(--text-muted);"
                title="Return to Workspace"
                @click="requestClose()"
              >
                SuDu
              </button>
              
              <template v-if="folderName">
                <span>/</span>
                <button
                  type="button"
                  class="hover:underline transition-colors cursor-pointer truncate max-w-[70px] sm:max-w-[120px]"
                  style="color: var(--accent-light);"
                  :title="`Return from ${folderName}`"
                  @click="requestClose()"
                >
                  {{ folderName }}
                </button>
              </template>

              <span>/</span>
              <span class="truncate max-w-[90px] sm:max-w-[200px]" style="color: var(--text-secondary);">{{ title || 'Untitled Note' }}</span>
            </div>
          </div>
          
          <div class="flex items-center gap-1.5 sm:gap-3">
            <!-- Mobile Header Buttons -->
            <div class="flex items-center gap-1.5 sm:hidden">
              <PushButton variant="secondary" class="!px-2.5" title="Cancel" @click="requestClose">
                <X class="w-4 h-4" />
              </PushButton>
              <PushButton variant="primary" class="!px-2.5" :disabled="!isValid" title="Save & Close" @click="handleSubmit">
                <Check class="w-4 h-4" />
              </PushButton>
            </div>

            <!-- Desktop Header Buttons -->
            <div class="hidden sm:flex items-center gap-3">
              <PushButton variant="secondary" @click="requestClose">
                Cancel
              </PushButton>
              <PushButton variant="primary" :disabled="!isValid" @click="handleSubmit">
                <Check class="w-3.5 h-3.5" />
                <span>Save &amp; Close</span>
              </PushButton>
            </div>
          </div>
        </header>

        <!-- Main Layout Flex: Sidebar + Editor -->
        <div class="flex flex-1 min-h-0 relative">
          
          <!-- Slide-in Sidebar -->
          <NoteSidebar
            :show-sidebar="showSidebar"
            :category="category"
            :custom-category-value="customCategoryValue"
            :is-custom-category="isCustomCategory"
            :custom-category-error="customCategoryError"
            :base-categories="baseCategories"
            :tags="noteTags"
            :tag-error="tagError"
            :is-pinned="isPinned"
            :auto-save="autoSave"
            :is-locked="Boolean(noteToEdit?.is_locked)"
            @update:category="category = $event; markDirty(); triggerAutoSave(getFormData);"
            @update:custom-category-value="customCategoryValue = $event; markDirty(); triggerAutoSave(getFormData);"
            @add-tag="addTag"
            @remove-tag="removeTag"
            @toggle-quick-tag="toggleQuickTag"
            @toggle-pin="isPinned = !isPinned; markDirty(); triggerAutoSave(getFormData);"
            @toggle-autosave="toggleAutoSave"
            @toggle-lock="emit('toggle-lock')"
            @open-shortcuts="isShortcutsModalOpen = true"
            @close="showSidebar = false"
          />

          <!-- Main Editor Column -->
          <div class="flex-1 flex flex-col min-w-0 bg-base relative" style="background: var(--bg-base);">
            
            <!-- Floating Formatting Ribbon -->
            <EditorRibbon
              :active-formats="activeFormats"
              @format="format"
              @insert-checkbox="insertCheckbox"
            />

            <!-- Page Canvas Workspace -->
            <div class="flex-1 overflow-y-auto px-2 sm:px-6 py-4 sm:py-8 md:py-12 max-w-full overflow-x-hidden" style="background: var(--bg-base);">
              <div 
                class="w-full max-w-4xl mx-auto flex flex-col min-h-[600px] sm:min-h-[850px] shadow-md border rounded p-4 sm:p-12 md:p-[4rem_5rem] break-words overflow-wrap-anywhere word-break-break-word min-w-0" 
                style="background: var(--bg-surface); border-color: var(--border-subtle);"
              >
                <!-- Title input field -->
                <input
                  v-model="title"
                  type="text"
                  placeholder="Untitled Note"
                  class="w-full bg-transparent border-none text-2xl sm:text-4xl font-extrabold focus:outline-none tracking-tight mb-4 shrink-0 break-words overflow-wrap-anywhere"
                  style="color: var(--text-primary);"
                  @blur="touchedTitle = true"
                  @input="markDirty(); triggerAutoSave(getFormData);"
                />

                <!-- Category + Tag pills badges -->
                <div class="flex items-center flex-wrap gap-2 select-none mb-8 border-b pb-4 shrink-0 max-w-full overflow-hidden" style="border-color: var(--border-subtle);">
                  <CategoryBadge :category="category === '__custom__' ? customCategoryValue : category" class="shrink-0" />
                  
                  <div v-if="noteTags.length > 0" class="flex items-center flex-wrap gap-1.5 min-w-0 max-w-full">
                    <TagPill v-for="tag in noteTags" :key="tag" :tag="tag" class="shrink-0" />
                  </div>
                </div>

                <!-- ContentEditable Rich Text Area -->
                <div
                  ref="editorRef"
                  contenteditable="true"
                  placeholder="Start typing your thoughts distraction-free..."
                  class="editor-sheet flex-1 focus:outline-none leading-relaxed text-sm sm:text-base w-full max-w-full min-w-0 break-words overflow-wrap-anywhere word-break-break-word"
                  style="color: var(--text-primary);"
                  @input="handleEditorInput"
                  @keydown="handleEditorKeydown"
                ></div>
              </div>
            </div>

            <!-- Status bar footer -->
            <footer class="flex items-center justify-between border-t px-6 py-2 font-mono text-[9px] shrink-0 z-10 relative select-none" style="background: var(--bg-surface); border-color: var(--border); color: var(--text-muted);">
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
              <div v-if="autoSaveStatus !== 'idle'" class="autosave-corner-pill">
                <span v-if="autoSaveStatus === 'saving'" class="autosave-spinner" />
                <svg v-else-if="autoSaveStatus === 'saved'" class="w-3.5 h-3.5" style="color: var(--accent);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                <span :style="autoSaveStatus === 'saved' ? 'color: var(--accent)' : ''">
                  {{ autoSaveStatus === 'saving' ? 'Autosaving...' : 'Autosaved' }}
                </span>
              </div>
            </Transition>

            <!-- Unsaved Changes Toast -->
            <UnsavedToast
              :show="showUnsavedWarning"
              :is-valid="isValid"
              @keep-editing="dismissWarning"
              @discard="confirmDiscard"
              @save-and-close="handleSubmit"
            />

            <!-- Keyboard Shortcuts Modal -->
            <ShortcutsModal
              :is-open="isShortcutsModalOpen"
              @close="isShortcutsModalOpen = false"
            />
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
  max-width: 20rem;
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

.editor-sheet {
  overflow-wrap: anywhere;
  word-break: break-word;
}

.editor-sheet:empty:before {
  content: attr(placeholder);
  color: var(--text-muted);
  font-style: italic;
  cursor: text;
}

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

.autosave-corner-pill {
  position: fixed;
  bottom: 52px;
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

.autosave-fade-enter-active,
.autosave-fade-leave-active {
  transition: opacity 0.3s ease;
}
.autosave-fade-enter-from,
.autosave-fade-leave-to {
  opacity: 0;
}

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
</style>
