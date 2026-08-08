<script setup lang="ts">
import { SlidersHorizontal, X, RotateCcw, ArrowUpDown, Tag, Folder } from '@lucide/vue';
import type { SortOption } from '../../composables/useNoteFilter';

defineProps<{
  isOpen: boolean;
  sortOrder: SortOption;
  selectedCategories: string[];
  selectedTags: string[];
  availableCategories: string[];
  availableTags: string[];
  activeFilterCount: number;
  isFilterActive: boolean;
  matchCount: number;
}>();

const emit = defineEmits<{
  (e: 'update:sortOrder', val: SortOption): void;
  (e: 'toggle:category', category: string): void;
  (e: 'toggle:tag', tag: string): void;
  (e: 'reset'): void;
  (e: 'close'): void;
}>();

const CATEGORY_COLORS: Record<string, { dot: string }> = {
  Personal: { dot: '#3b82f6' },
  Work: { dot: '#a855f7' },
  Ideas: { dot: '#eab308' },
  Research: { dot: '#10b981' },
  Meeting: { dot: '#f97316' },
  Project: { dot: '#ec4899' },
};

const TAG_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  Important: { bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.25)', text: '#f87171' },
  Review: { bg: 'rgba(59, 130, 246, 0.1)', border: 'rgba(59, 130, 246, 0.25)', text: '#60a5fa' },
  Urgent: { bg: 'rgba(249, 115, 22, 0.1)', border: 'rgba(249, 115, 22, 0.25)', text: '#fb923c' },
  Later: { bg: 'rgba(168, 85, 247, 0.1)', border: 'rgba(168, 85, 247, 0.25)', text: '#c084fc' },
};
</script>

<template>
  <Transition
    enter-active-class="transition-all duration-200 ease-out"
    enter-from-class="opacity-0 -translate-y-2 scale-95"
    enter-to-class="opacity-100 translate-y-0 scale-100"
    leave-active-class="transition-all duration-150 ease-in"
    leave-from-class="opacity-100 translate-y-0 scale-100"
    leave-to-class="opacity-0 -translate-y-2 scale-95"
  >
    <div
      v-if="isOpen"
      class="absolute top-full right-0 mt-2 w-80 max-w-[calc(100vw-32px)] p-4 border rounded-xl shadow-2xl z-50 font-mono text-xs space-y-4 select-none"
      style="background: var(--bg-surface); border-color: var(--border); box-shadow: 0 16px 48px rgba(0,0,0,0.35);"
    >
      <!-- Header -->
      <div class="flex items-center justify-between border-b pb-2.5" style="border-color: var(--border-subtle);">
        <div class="flex items-center gap-2">
          <SlidersHorizontal class="w-4 h-4" style="color: var(--accent);" />
          <span class="font-bold text-xs uppercase tracking-wider" style="color: var(--text-primary);">Filter &amp; Sort</span>
          <span
            v-if="activeFilterCount > 0"
            class="px-1.5 py-0.5 text-[9px] font-bold rounded-full text-white leading-none"
            style="background: var(--accent);"
          >
            {{ activeFilterCount }}
          </span>
        </div>
        <button
          type="button"
          class="p-1 hover:text-white transition-colors cursor-pointer"
          style="color: var(--text-muted);"
          @click="emit('close')"
        >
          <X class="w-3.5 h-3.5" />
        </button>
      </div>

      <!-- Section 1: Sort Order -->
      <div>
        <label class="block text-[10px] uppercase font-bold tracking-wider mb-2 flex items-center gap-1.5" style="color: var(--text-muted);">
          <ArrowUpDown class="w-3 h-3" />
          <span>Sort Order</span>
        </label>
        <div class="grid grid-cols-2 gap-1.5">
          <button
            v-for="opt in [
              { label: 'Date: Newest', value: 'updated_desc' },
              { label: 'Date: Oldest', value: 'updated_asc' },
              { label: 'Title: A → Z', value: 'title_asc' },
              { label: 'Title: Z → A', value: 'title_desc' }
            ]"
            :key="opt.value"
            type="button"
            class="px-2.5 py-1.5 text-[10px] font-mono border rounded-md flex items-center justify-between transition-all cursor-pointer select-none"
            :style="sortOrder === opt.value
              ? 'background: var(--accent-glow); border-color: var(--accent); color: var(--accent-light); font-weight: 600;'
              : 'background: var(--bg-raised); border-color: var(--border); color: var(--text-muted);'"
            @click="emit('update:sortOrder', opt.value as SortOption)"
          >
            <span>{{ opt.label }}</span>
            <span v-if="sortOrder === opt.value" class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          </button>
        </div>
      </div>

      <!-- Section 2: Category Filter Chips (Multi-Select) -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-[10px] uppercase font-bold tracking-wider flex items-center gap-1.5" style="color: var(--text-muted);">
            <Folder class="w-3 h-3" />
            <span>Categories (Multi-Select)</span>
          </label>
          <span v-if="selectedCategories.length > 0" class="text-[9px] font-mono" style="color: var(--accent-light);">
            {{ selectedCategories.length }} selected
          </span>
        </div>
        <div class="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
          <button
            type="button"
            class="px-2.5 py-1 text-[10px] font-mono border rounded-md transition-all cursor-pointer select-none"
            :style="selectedCategories.length === 0
              ? 'background: var(--accent-glow); border-color: var(--accent); color: var(--accent-light); font-weight: 600;'
              : 'background: var(--bg-raised); border-color: var(--border); color: var(--text-muted);'"
            @click="emit('toggle:category', 'all')"
          >
            All Categories
          </button>

          <button
            v-for="cat in availableCategories"
            :key="cat"
            type="button"
            class="px-2.5 py-1 text-[10px] font-mono border rounded-md transition-all cursor-pointer select-none flex items-center gap-1.5"
            :style="selectedCategories.includes(cat)
              ? 'background: var(--accent-glow); border-color: var(--accent); color: var(--accent-light); font-weight: 600;'
              : 'background: var(--bg-raised); border-color: var(--border); color: var(--text-secondary);'"
            @click="emit('toggle:category', cat)"
          >
            <span
              class="w-1.5 h-1.5 rounded-full shrink-0"
              :style="{ background: CATEGORY_COLORS[cat]?.dot || 'var(--accent)' }"
            ></span>
            <span>{{ cat }}</span>
            <span v-if="selectedCategories.includes(cat)" class="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-0.5"></span>
          </button>
        </div>
      </div>

      <!-- Section 3: Tag Filter Chips (Multi-Select) -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-[10px] uppercase font-bold tracking-wider flex items-center gap-1.5" style="color: var(--text-muted);">
            <Tag class="w-3 h-3" />
            <span>Tags (Multi-Select)</span>
          </label>
          <span v-if="selectedTags.length > 0" class="text-[9px] font-mono" style="color: var(--accent-light);">
            {{ selectedTags.length }} selected
          </span>
        </div>
        <div class="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
          <button
            type="button"
            class="px-2.5 py-1 text-[10px] font-mono border rounded-md transition-all cursor-pointer select-none"
            :style="selectedTags.length === 0
              ? 'background: var(--accent-glow); border-color: var(--accent); color: var(--accent-light); font-weight: 600;'
              : 'background: var(--bg-raised); border-color: var(--border); color: var(--text-muted);'"
            @click="emit('toggle:tag', 'all')"
          >
            All Tags
          </button>

          <button
            v-for="t in availableTags"
            :key="t"
            type="button"
            class="px-2.5 py-1 text-[10px] font-mono border rounded-md transition-all cursor-pointer select-none flex items-center gap-1"
            :style="selectedTags.includes(t)
              ? 'background: var(--accent-glow); border-color: var(--accent); color: var(--accent-light); font-weight: 600;'
              : `background: ${TAG_COLORS[t]?.bg || 'var(--bg-raised)'}; border-color: ${TAG_COLORS[t]?.border || 'var(--border)'}; color: ${TAG_COLORS[t]?.text || 'var(--text-secondary)'};`"
            @click="emit('toggle:tag', t)"
          >
            <span class="opacity-70">#</span>
            <span>{{ t }}</span>
            <span v-if="selectedTags.includes(t)" class="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-0.5"></span>
          </button>
        </div>
      </div>

      <!-- Footer Stats & Reset -->
      <div class="pt-3 border-t flex items-center justify-between text-[10px]" style="border-color: var(--border-subtle);">
        <span style="color: var(--text-muted);">
          {{ matchCount }} note(s) match
        </span>
        <button
          v-if="isFilterActive"
          type="button"
          class="text-red-400 hover:underline cursor-pointer flex items-center gap-1 font-mono"
          @click="emit('reset')"
        >
          <RotateCcw class="w-3 h-3" />
          <span>Reset Filters</span>
        </button>
      </div>
    </div>
  </Transition>
</template>
