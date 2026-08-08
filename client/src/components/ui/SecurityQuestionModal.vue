<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="modelValue" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);" @click.self="emit('cancel')">
        <div class="animate-scale-in w-full max-w-md border" style="background: var(--bg-surface); border-color: var(--border);">
          <!-- header -->
          <div class="flex items-center justify-between border-b px-5 py-4" style="border-color: var(--border);">
            <div class="flex items-center gap-2.5">
              <ShieldAlert class="h-4 w-4 shrink-0" style="color: var(--accent);" />
              <h3 class="text-sm font-semibold" style="color: var(--text-primary);">Configure Recovery Question</h3>
            </div>
            <button type="button" class="transition-colors" style="color: var(--text-muted);" @click="emit('cancel')">
              <X class="h-4 w-4" />
            </button>
          </div>

          <!-- body -->
          <div class="px-5 py-5 flex flex-col gap-4 text-xs" style="color: var(--text-secondary);">
            <p class="leading-relaxed opacity-80">
              Configure a system-wide security question. If you forget any folder PIN, you can answer this question to unlock it.
            </p>

            <div class="flex flex-col gap-2">
              <label class="font-semibold uppercase tracking-wider text-[10px]" style="color: var(--text-muted);">Choose a Question</label>
              <select v-model="selectedPreset" class="preset-select">
                <option v-for="q in PRESET_QUESTIONS" :key="q" :value="q">{{ q }}</option>
                <option value="custom">Write a custom question...</option>
              </select>
            </div>

            <div v-if="selectedPreset === 'custom'" class="flex flex-col gap-2">
              <label class="font-semibold uppercase tracking-wider text-[10px]" style="color: var(--text-muted);">Custom Question</label>
              <input
                v-model.trim="customQuestion"
                type="text"
                class="field-input"
                placeholder="Type your security question here..."
                maxlength="100"
              />
            </div>

            <div class="flex flex-col gap-2">
              <label class="font-semibold uppercase tracking-wider text-[10px]" style="color: var(--text-muted);">Your Answer</label>
              <input
                v-model.trim="answer"
                type="text"
                class="field-input"
                placeholder="Type the answer..."
                maxlength="100"
                @keydown.enter="submit"
              />
              <p class="text-[10px] opacity-50" style="color: var(--text-muted);">* Answers are case-insensitive when resetting.</p>
            </div>
          </div>

          <!-- actions -->
          <div class="flex items-center justify-end gap-2 border-t px-5 py-4" style="border-color: var(--border);">
            <button
              type="button"
              class="px-4 py-2 text-xs font-medium border transition-colors"
              style="background: var(--bg-raised); border-color: var(--border); color: var(--text-secondary);"
              @click="emit('cancel')"
            >
              Cancel
            </button>
            <PushButton
              variant="primary"
              :disabled="!isFormValid"
              @click="submit"
            >
              Configure Question
            </PushButton>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { ShieldAlert, X } from '@lucide/vue';
import PushButton from '../PushButton.vue';

const PRESET_QUESTIONS = [
  'What was the name of your first pet?',
  "What is your mother's maiden name?",
  'What city were you born in?',
  'What was the name of your first school?',
];

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void;
  (e: 'save', payload: { question: string; answer: string }): void;
  (e: 'cancel'): void;
}>();

const selectedPreset = ref<string>(PRESET_QUESTIONS[0] || 'custom');
const customQuestion = ref('');
const answer = ref('');

const isFormValid = computed(() => {
  const preset = selectedPreset.value || '';
  const q = preset === 'custom' ? customQuestion.value.trim() : preset.trim();
  return q.length > 5 && answer.value.trim().length > 1;
});

watch(() => props.modelValue, (open) => {
  if (open) {
    selectedPreset.value = PRESET_QUESTIONS[0] || 'custom';
    customQuestion.value = '';
    answer.value = '';
  }
});

function submit() {
  if (!isFormValid.value) return;
  const preset = selectedPreset.value || '';
  const q = preset === 'custom' ? customQuestion.value.trim() : preset.trim();
  emit('save', { question: q, answer: answer.value.trim() });
}
</script>

<style scoped>
.preset-select {
  width: 100%;
  background: var(--bg-raised);
  border: 1.5px solid var(--border);
  border-radius: 8px;
  padding: 10px 14px;
  color: var(--text-primary);
  font-size: 0.85rem;
  outline: none;
  font-family: inherit;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%237a9e8a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 14px center;
  background-size: 14px;
}
.preset-select option {
  background: var(--bg-surface);
  color: var(--text-primary);
}

.field-input {
  width: 100%;
  background: var(--bg-raised);
  border: 1.5px solid var(--border);
  border-radius: 8px;
  padding: 10px 14px;
  color: var(--text-primary);
  font-size: 0.85rem;
  outline: none;
  transition: border-color 0.2s;
  font-family: inherit;
}
.field-input::placeholder { color: var(--text-muted); }
.field-input:focus { border-color: var(--accent); }

/* transitions */
.modal-fade-enter-active, .modal-fade-leave-active {
  transition: opacity 0.24s ease;
}
.modal-fade-enter-from, .modal-fade-leave-to {
  opacity: 0;
}
.modal-fade-enter-active .animate-scale-in, .modal-fade-leave-active .animate-scale-in {
  transition: transform 0.24s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.modal-fade-enter-from .animate-scale-in, .modal-fade-leave-to .animate-scale-in {
  transform: scale(0.9) translateY(10px);
}
</style>
