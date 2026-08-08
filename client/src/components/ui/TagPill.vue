<script setup lang="ts">
import { Hash, X } from '@lucide/vue';
import { getTagStyle } from '../../utils/tagStyle';

defineProps<{
  tag: string;
  removable?: boolean;
  size?: 'sm' | 'md';
}>();

const emit = defineEmits<{
  (e: 'remove', tag: string): void;
}>();
</script>

<template>
  <span
    class="font-mono border rounded flex items-center gap-1 group animate-scale-in select-none"
    :class="size === 'sm' ? 'px-1.5 py-0.5 text-[8px]' : 'px-2 py-1 text-[10px]'"
    :style="getTagStyle(tag)"
  >
    <Hash class="opacity-50" :class="size === 'sm' ? 'w-2 h-2' : 'w-2.5 h-2.5'" />
    {{ tag }}
    <button
      v-if="removable"
      type="button"
      class="ml-1 opacity-50 hover:opacity-100 hover:text-red-500 focus:outline-none transition-opacity"
      @click.stop="emit('remove', tag)"
    >
      <X class="w-3 h-3" />
    </button>
  </span>
</template>
