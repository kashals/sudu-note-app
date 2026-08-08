<script setup lang="ts">
import { Calendar, X, RotateCcw, Clock } from '@lucide/vue';
import type { DatePreset } from '../../composables/useNoteFilter';

defineProps<{
  isOpen: boolean;
  startDate: string;
  endDate: string;
  quickDatePreset: DatePreset;
  isDateFilterActive: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:startDate', val: string): void;
  (e: 'update:endDate', val: string): void;
  (e: 'update:quickDatePreset', val: DatePreset): void;
  (e: 'reset'): void;
  (e: 'close'): void;
}>();
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
      class="absolute top-full right-0 mt-2 w-72 max-w-[calc(100vw-32px)] p-4 border rounded-xl shadow-2xl z-50 font-mono text-xs space-y-4 select-none"
      style="background: var(--bg-surface); border-color: var(--border); box-shadow: 0 16px 48px rgba(0,0,0,0.35);"
    >
      <!-- Header -->
      <div class="flex items-center justify-between border-b pb-2.5" style="border-color: var(--border-subtle);">
        <div class="flex items-center gap-2">
          <Calendar class="w-4 h-4" style="color: var(--accent);" />
          <span class="font-bold text-xs uppercase tracking-wider" style="color: var(--text-primary);">Filter by Date</span>
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

      <!-- Quick Presets -->
      <div>
        <label class="block text-[10px] uppercase font-bold tracking-wider mb-2 flex items-center gap-1.5" style="color: var(--text-muted);">
          <Clock class="w-3 h-3" />
          <span>Quick Presets</span>
        </label>
        <div class="grid grid-cols-3 gap-1.5">
          <button
            v-for="opt in [
              { label: 'Anytime', value: 'any' },
              { label: 'Today', value: 'today' },
              { label: 'Past 7 Days', value: '7days' },
              { label: '<30 Days', value: '30days' },
              { label: 'This Year', value: 'year' }
            ]"
            :key="opt.value"
            type="button"
            class="px-2 py-1 text-[10px] font-mono border rounded-md text-center transition-all cursor-pointer select-none"
            :style="quickDatePreset === opt.value && !startDate && !endDate
              ? 'background: var(--accent-glow); border-color: var(--accent); color: var(--accent-light); font-weight: 600;'
              : 'background: var(--bg-raised); border-color: var(--border); color: var(--text-muted);'"
            @click="emit('update:quickDatePreset', opt.value as DatePreset); emit('update:startDate', ''); emit('update:endDate', '');"
          >
            {{ opt.label }}
          </button>
        </div>
      </div>

      <!-- Custom Date Range -->
      <div>
        <label class="block text-[10px] uppercase font-bold tracking-wider mb-2 flex items-center gap-1.5" style="color: var(--text-muted);">
          <Calendar class="w-3 h-3" />
          <span>Custom Period</span>
        </label>
        <div class="space-y-2">
          <div>
            <span class="block text-[9px] uppercase mb-1" style="color: var(--text-muted);">From (Start Date)</span>
            <input
              type="date"
              :value="startDate"
              class="w-full px-2.5 py-1.5 border rounded-md text-xs font-mono focus:outline-none cursor-pointer"
              style="background: var(--bg-raised); border-color: var(--border); color: var(--text-primary);"
              @input="emit('update:startDate', ($event.target as HTMLInputElement).value); emit('update:quickDatePreset', 'any');"
            />
          </div>

          <div>
            <span class="block text-[9px] uppercase mb-1" style="color: var(--text-muted);">To (End Date)</span>
            <input
              type="date"
              :value="endDate"
              class="w-full px-2.5 py-1.5 border rounded-md text-xs font-mono focus:outline-none cursor-pointer"
              style="background: var(--bg-raised); border-color: var(--border); color: var(--text-primary);"
              @input="emit('update:endDate', ($event.target as HTMLInputElement).value); emit('update:quickDatePreset', 'any');"
            />
          </div>
        </div>
      </div>

      <!-- Footer Reset -->
      <div v-if="isDateFilterActive" class="pt-2 border-t flex justify-end" style="border-color: var(--border-subtle);">
        <button
          type="button"
          class="text-[10px] text-red-400 hover:underline cursor-pointer font-mono flex items-center gap-1"
          @click="emit('reset')"
        >
          <RotateCcw class="w-3 h-3" />
          <span>Clear Date Filter</span>
        </button>
      </div>
    </div>
  </Transition>
</template>
