<script setup lang="ts">
import { ref } from 'vue';
import { ChevronDown, Settings, User, Briefcase, Lightbulb, BookOpen, Users, Folder } from '@lucide/vue';

const props = defineProps<{
  category: string;
  customCategoryValue: string;
  isCustomCategory: boolean;
  customCategoryError?: string | null;
  baseCategories: string[];
}>();

const emit = defineEmits<{
  (e: 'update:category', val: string): void;
  (e: 'update:customCategoryValue', val: string): void;
}>();

const isDropdownOpen = ref(false);

function getCategoryIcon(cat: string) {
  switch (cat) {
    case 'Personal': return User;
    case 'Work': return Briefcase;
    case 'Ideas': return Lightbulb;
    case 'Research': return BookOpen;
    case 'Meeting': return Users;
    case 'Project': return Folder;
    default: return Settings;
  }
}

function selectCategory(cat: string) {
  emit('update:category', cat);
  isDropdownOpen.value = false;
}
</script>

<template>
  <div class="flex flex-col gap-1.5 relative select-none">
    <label class="text-[11px] font-mono" style="color: var(--text-secondary);">// Category</label>
    
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
      :value="customCategoryValue"
      type="text"
      placeholder="Enter custom category"
      class="w-full px-3 py-2 mt-2 text-xs border focus:outline-none transition-all rounded font-mono animate-scale-in"
      style="background: var(--bg-raised); border-color: var(--border); color: var(--text-primary);"
      @input="emit('update:customCategoryValue', ($event.target as HTMLInputElement).value)"
    />
    <p v-if="customCategoryError" class="text-[10px] text-red-500 font-mono mt-0.5 animate-scale-in">
      // {{ customCategoryError }}
    </p>
  </div>
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
  border-color: var(--accent);
}
</style>
