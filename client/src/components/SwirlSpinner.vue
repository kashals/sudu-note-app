<script setup lang="ts">
// swirling spinner — converted from react to vue
defineProps<{ spinning?: boolean }>();
</script>

<template>
  <svg
    viewBox="0 0 800 800"
    xmlns="http://www.w3.org/2000/svg"
    width="14"
    height="14"
  >
    <circle
      :class="{ 'swirl-circle': spinning }"
      cx="400"
      cy="400"
      r="200"
      fill="none"
      stroke="currentColor"
      stroke-linecap="round"
      stroke-width="50"
    />
  </svg>
</template>

<style scoped>
@keyframes swirl-spin {
  to { transform: rotate(360deg); }
}

@keyframes swirl-dash {
  0%   { stroke-dasharray: 1, 800;   stroke-dashoffset: 0; }
  50%  { stroke-dasharray: 400, 400; stroke-dashoffset: -200px; }
  100% { stroke-dasharray: 800, 1;   stroke-dashoffset: -800px; }
}

.swirl-circle {
  transform-origin: center;
  animation:
    swirl-dash 1.5s ease-in-out infinite alternate,
    swirl-spin 2s linear infinite;
}
</style>
