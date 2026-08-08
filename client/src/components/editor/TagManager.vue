<script setup lang="ts">
import { ref } from 'vue';
import TagPill from '../ui/TagPill.vue';
import { getTagStyle } from '../../utils/tagStyle';

const props = defineProps<{
  tags: string[];
  tagError?: string | null;
}>();

const emit = defineEmits<{
  (e: 'add-tag', tag: string): void;
  (e: 'remove-tag', tag: string): void;
  (e: 'toggle-quick-tag', tag: string): void;
}>();

const newTagInput = ref('');

function handleAdd() {
  const clean = newTagInput.value.trim().replace(/,/g, '');
  if (!clean) return;
  emit('add-tag', clean);
  newTagInput.value = '';
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <!-- Tags Input -->
    <div class="flex flex-col gap-1.5">
      <label class="text-[11px] font-mono flex justify-between select-none" style="color: var(--text-secondary);">
        <span>// Tags (max 5)</span>
        <span style="color: var(--text-muted);">{{ tags.length }}/5</span>
      </label>
      <div class="flex gap-2">
        <input
          v-model="newTagInput"
          type="text"
          placeholder="Add tag and press Enter"
          class="flex-1 px-3 py-2 text-xs border focus:outline-none transition-all rounded font-mono"
          style="background: var(--bg-raised); border-color: var(--border); color: var(--text-primary);"
          @keydown.enter.prevent="handleAdd"
        />
      </div>
      <p v-if="tagError" class="text-[10px] text-red-500 font-mono mt-0.5 animate-scale-in">
        // {{ tagError }}
      </p>

      <div class="flex flex-wrap gap-1.5 mt-2">
        <TagPill
          v-for="tag in tags"
          :key="tag"
          :tag="tag"
          removable
          @remove="emit('remove-tag', $event)"
        />
      </div>
    </div>

    <!-- Fast Tag Suggestions -->
    <div class="pt-4 border-t" style="border-color: var(--border-subtle);">
      <span class="block text-[11px] font-mono mb-2 select-none" style="color: var(--text-secondary);">// Quick Add</span>
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="preset in ['Important', 'Review', 'Urgent', 'Later']"
          :key="preset"
          type="button"
          class="px-2 py-0.5 text-[9px] font-mono border rounded transition-all hover:-translate-y-px"
          :style="getTagStyle(preset)"
          @click="emit('toggle-quick-tag', preset)"
        >
          + {{ preset }}
        </button>
      </div>
    </div>
  </div>
</template>
