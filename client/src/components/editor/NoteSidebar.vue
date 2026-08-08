<script setup lang="ts">
import { HelpCircle, X, Lock, Unlock } from '@lucide/vue';
import CategorySelect from './CategorySelect.vue';
import TagManager from './TagManager.vue';

const props = defineProps<{
  showSidebar: boolean;
  category: string;
  customCategoryValue: string;
  isCustomCategory: boolean;
  customCategoryError?: string | null;
  baseCategories: string[];
  tags: string[];
  tagError?: string | null;
  isPinned: boolean;
  autoSave: boolean;
  isLocked?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:category', val: string): void;
  (e: 'update:customCategoryValue', val: string): void;
  (e: 'add-tag', tag: string): void;
  (e: 'remove-tag', tag: string): void;
  (e: 'toggle-quick-tag', tag: string): void;
  (e: 'toggle-pin'): void;
  (e: 'toggle-autosave'): void;
  (e: 'toggle-lock'): void;
  (e: 'open-shortcuts'): void;
  (e: 'close'): void;
}>();
</script>

<template>
  <!-- Mobile Backdrop Overlay -->
  <Transition name="fade-backdrop">
    <div
      v-if="showSidebar"
      class="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-xs"
      @click="emit('close')"
    />
  </Transition>

  <Transition name="sidebar-slide">
    <aside
      v-if="showSidebar"
      class="max-md:fixed max-md:top-0 max-md:bottom-0 max-md:left-0 max-md:z-50 max-md:w-80 max-md:shadow-2xl md:relative md:w-80 md:border-r flex flex-col overflow-y-auto shrink-0 md:shadow-lg md:z-10"
      style="background: var(--bg-surface); border-color: var(--border);"
    >
      <div class="p-6 space-y-6">
        <div class="flex items-center justify-between border-b pb-3 mb-2" style="border-color: var(--border-subtle);">
          <h3 class="text-xs font-semibold tracking-wide uppercase font-mono flex items-center gap-2 select-none" style="color: var(--text-primary);">
            <div class="w-1.5 h-4" style="background: var(--accent);"></div>
            Note Properties
          </h3>
          <button
            type="button"
            class="md:hidden p-1 text-muted hover:text-primary transition-colors cursor-pointer"
            style="color: var(--text-muted);"
            title="Close Properties"
            @click="emit('close')"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <!-- Category Selector -->
        <CategorySelect
          :category="category"
          :custom-category-value="customCategoryValue"
          :is-custom-category="isCustomCategory"
          :custom-category-error="customCategoryError"
          :base-categories="baseCategories"
          @update:category="emit('update:category', $event)"
          @update:custom-category-value="emit('update:customCategoryValue', $event)"
        />

        <!-- Tags Manager -->
        <TagManager
          :tags="tags"
          :tag-error="tagError"
          @add-tag="emit('add-tag', $event)"
          @remove-tag="emit('remove-tag', $event)"
          @toggle-quick-tag="emit('toggle-quick-tag', $event)"
        />

        <!-- Pin Note Toggle -->
        <div class="pt-4 border-t flex items-center justify-between select-none" style="border-color: var(--border-subtle);">
          <div>
            <span class="block text-[11px] font-mono" style="color: var(--text-secondary);">// Pin Note</span>
            <span class="block text-[10px] font-mono mt-0.5" style="color: var(--text-muted);">Keep note pinned at top</span>
          </div>
          <button
            type="button"
            class="autosave-toggle"
            :class="{ 'autosave-toggle--on': isPinned }"
            :title="isPinned ? 'Unpin Note' : 'Pin to Top'"
            @click="emit('toggle-pin')"
          >
            <span class="autosave-thumb" />
          </button>
        </div>

        <!-- Auto-Save Toggle -->
        <div class="pt-4 border-t flex items-center justify-between select-none" style="border-color: var(--border-subtle);">
          <div>
            <span class="block text-[11px] font-mono" style="color: var(--text-secondary);">// Auto-Save</span>
            <span class="block text-[10px] font-mono mt-0.5" style="color: var(--text-muted);">Saves 3s after typing stops</span>
          </div>
          <button
            type="button"
            class="autosave-toggle"
            :class="{ 'autosave-toggle--on': autoSave }"
            :title="autoSave ? 'Auto-Save ON — click to disable' : 'Auto-Save OFF — click to enable'"
            @click="emit('toggle-autosave')"
          >
            <span class="autosave-thumb" />
          </button>
        </div>

        <!-- Lock Note Toggle -->
        <div class="pt-4 border-t flex items-center justify-between select-none" style="border-color: var(--border-subtle);">
          <div>
            <span class="block text-[11px] font-mono flex items-center gap-1.5" style="color: var(--text-secondary);">
              <Lock v-if="isLocked" class="w-3.5 h-3.5 text-amber-400" />
              <Unlock v-else class="w-3.5 h-3.5" style="color: var(--accent);" />
              <span>// Lock Note</span>
            </span>
            <span class="block text-[10px] font-mono mt-0.5" style="color: var(--text-muted);">
              {{ isLocked ? 'Note is password protected' : 'Protect note with 4-digit PIN' }}
            </span>
          </div>
          <button
            type="button"
            class="autosave-toggle"
            :class="{ 'autosave-toggle--on': isLocked }"
            :title="isLocked ? 'Note is locked — click to remove PIN' : 'Note is unlocked — click to set PIN'"
            @click="emit('toggle-lock')"
          >
            <span class="autosave-thumb" />
          </button>
        </div>

        <!-- Keyboard Shortcuts Button -->
        <div class="pt-4 border-t" style="border-color: var(--border-subtle);">
          <button
            type="button"
            class="w-full px-3 py-2 text-xs font-mono border rounded flex items-center justify-between transition-colors hover:border-gray-500 select-none"
            style="background: var(--bg-raised); border-color: var(--border); color: var(--text-secondary);"
            @click="emit('open-shortcuts')"
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
</template>

<style scoped>
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

/* ─── Sidebar Slide Transition ─── */
.sidebar-slide-enter-active,
.sidebar-slide-leave-active {
  transition: all 0.28s cubic-bezier(0.19, 1, 0.22, 1);
  overflow: hidden;
}

.sidebar-slide-enter-from,
.sidebar-slide-leave-to {
  max-width: 0 !important;
  opacity: 0;
  transform: translateX(-100%);
  padding-left: 0 !important;
  padding-right: 0 !important;
}

.sidebar-slide-enter-to,
.sidebar-slide-leave-from {
  max-width: 20rem;
  opacity: 1;
  transform: translateX(0);
}

.fade-backdrop-enter-active,
.fade-backdrop-leave-active {
  transition: opacity 0.2s ease;
}
.fade-backdrop-enter-from,
.fade-backdrop-leave-to {
  opacity: 0;
}
</style>
