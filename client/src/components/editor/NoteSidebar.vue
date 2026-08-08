<script setup lang="ts">
import { HelpCircle } from '@lucide/vue';
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
}>();

const emit = defineEmits<{
  (e: 'update:category', val: string): void;
  (e: 'update:customCategoryValue', val: string): void;
  (e: 'add-tag', tag: string): void;
  (e: 'remove-tag', tag: string): void;
  (e: 'toggle-quick-tag', tag: string): void;
  (e: 'toggle-pin'): void;
  (e: 'toggle-autosave'): void;
  (e: 'open-shortcuts'): void;
}>();
</script>

<template>
  <Transition name="sidebar-slide">
    <aside
      v-if="showSidebar"
      class="w-80 border-r flex flex-col overflow-y-auto shrink-0 shadow-lg z-10 relative"
      style="background: var(--bg-surface); border-color: var(--border);"
    >
      <div class="p-6 space-y-6">
        <h3 class="text-xs font-semibold tracking-wide uppercase font-mono mb-4 flex items-center gap-2 select-none" style="color: var(--text-primary);">
          <div class="w-1.5 h-4" style="background: var(--accent);"></div>
          Note Properties
        </h3>

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
</style>
