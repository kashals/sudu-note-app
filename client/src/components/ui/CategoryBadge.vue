<script setup lang="ts">
import { getTagStyle } from '../../utils/tagStyle';

defineProps<{
  category: string;
  size?: 'sm' | 'md';
}>();
</script>

<template>
  <span
    class="font-mono border rounded uppercase select-none"
    :class="size === 'sm' ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[9px]'"
    :style="getTagStyle(category)"
  >
    {{ category }}
  </span>
</template>
