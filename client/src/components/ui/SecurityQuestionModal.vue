<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="modelValue" class="modal-backdrop" @click.self="handleBackdropClick">
        <div class="security-modal" role="dialog" :aria-label="mode === 'setup' ? 'Security Question Setup' : 'Reset PIN'">
          <!-- Header -->
          <div class="modal-header">
            <div class="shield-icon-wrap">
              <ShieldQuestion class="w-5 h-5 text-accent" />
            </div>
            <div>
              <h2 class="modal-title">
                {{ mode === 'setup' ? 'Security Question' : 'Security Recovery' }}
              </h2>
              <p class="modal-subtitle">
                {{ mode === 'setup' ? 'Set up recovery for locked folders & notes' : 'Answer your security question to reset PIN' }}
              </p>
            </div>
            <button class="modal-close" @click="$emit('update:modelValue', false)" aria-label="Close">
              <X class="w-4 h-4" />
            </button>
          </div>

          <!-- Body Form -->
          <form @submit.prevent="handleSubmit" class="modal-body">
            <!-- Setup Mode Question Selection -->
            <div v-if="mode === 'setup'" class="form-group">
              <label class="form-label">Select Security Question</label>
              <select v-model="selectedPreset" class="form-select" required>
                <option v-for="q in presetQuestions" :key="q" :value="q">
                  {{ q }}
                </option>
                <option value="__custom__">Type a custom question...</option>
              </select>

              <input
                v-if="selectedPreset === '__custom__'"
                v-model="customQuestion"
                type="text"
                class="form-input mt-2"
                placeholder="Enter your custom question..."
                required
              />
            </div>

            <!-- Recovery Mode Display Question -->
            <div v-else class="form-group">
              <label class="form-label">Your Security Question</label>
              <div class="question-box">
                {{ currentQuestion || 'Loading security question...' }}
              </div>
            </div>

            <!-- Security Answer Input -->
            <div class="form-group">
              <label class="form-label">Security Answer</label>
              <input
                v-model="answer"
                type="text"
                class="form-input"
                :class="{ 'border-red-500': hasError }"
                placeholder="Enter your answer..."
                required
                autocomplete="off"
              />
              <p v-if="hasError" class="error-text">
                {{ errorMessage || 'Incorrect answer. Please try again.' }}
              </p>
            </div>

            <!-- Footer Actions -->
            <div class="modal-footer">
              <PushButton variant="secondary" type="button" @click="$emit('update:modelValue', false)">
                Cancel
              </PushButton>
              <PushButton variant="primary" type="submit" :disabled="isSubmitting || !isValid">
                <Loader2 v-if="isSubmitting" class="w-3.5 h-3.5 animate-spin" />
                <span>{{ mode === 'setup' ? 'Save & Continue' : 'Unlock & Reset PIN' }}</span>
              </PushButton>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { ShieldQuestion, X, Loader2 } from '@lucide/vue';
import PushButton from '../PushButton.vue';
import { getSecurityQuestion, setSecurityQuestion, resetFolderPin } from '../../services/api';

const props = withDefaults(defineProps<{
  modelValue: boolean;
  mode?: 'setup' | 'reset';
  folderId?: string | null;
}>(), {
  mode: 'setup',
  folderId: null
});

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void;
  (e: 'setup-complete'): void;
  (e: 'reset-complete', folderId: string): void;
}>();

const presetQuestions = [
  "What was the name of your first pet?",
  "In what city were you born?",
  "What was your childhood nickname?",
  "What is your mother's maiden name?",
  "What was the name of your primary school?"
];

const selectedPreset = ref(presetQuestions[0]);
const customQuestion = ref('');
const answer = ref('');
const currentQuestion = ref('');
const isSubmitting = ref(false);
const hasError = ref(false);
const errorMessage = ref('');

const finalQuestion = computed(() => {
  if (selectedPreset.value === '__custom__') {
    return customQuestion.value.trim();
  }
  return selectedPreset.value;
});

const isValid = computed(() => {
  if (props.mode === 'setup') {
    return Boolean(finalQuestion.value && answer.value.trim());
  }
  return Boolean(answer.value.trim());
});

watch(() => props.modelValue, async (open) => {
  if (open) {
    answer.value = '';
    hasError.value = false;
    errorMessage.value = '';
    if (props.mode === 'reset') {
      try {
        const res = await getSecurityQuestion();
        if (res.configured && res.question) {
          currentQuestion.value = res.question;
        } else {
          currentQuestion.value = 'Security question not configured.';
        }
      } catch {
        currentQuestion.value = 'Failed to load security question.';
      }
    }
  }
});

async function handleSubmit() {
  if (!isValid.value || isSubmitting.value) return;
  isSubmitting.value = true;
  hasError.value = false;

  try {
    if (props.mode === 'setup') {
      await setSecurityQuestion(finalQuestion.value, answer.value.trim());
      emit('setup-complete');
      emit('update:modelValue', false);
    } else {
      if (!props.folderId) {
        throw new Error('No target folder specified for reset.');
      }
      const success = await resetFolderPin(props.folderId, answer.value.trim());
      if (success) {
        emit('reset-complete', props.folderId);
        emit('update:modelValue', false);
      } else {
        hasError.value = true;
        errorMessage.value = 'Incorrect security answer. Please try again.';
      }
    }
  } catch (err: any) {
    hasError.value = true;
    errorMessage.value = err.message || 'Operation failed. Try again.';
  } finally {
    isSubmitting.value = false;
  }
}

function handleBackdropClick() {
  emit('update:modelValue', false);
}
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1200;
}

.security-modal {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 20px;
  width: 400px;
  max-width: calc(100vw - 32px);
  box-shadow: 0 32px 80px rgba(0,0,0,0.6);
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 22px 20px 0;
}

.shield-icon-wrap {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: rgba(137, 180, 250, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.modal-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 3px;
}

.modal-subtitle {
  font-size: 0.78rem;
  color: var(--text-muted);
  margin: 0;
}

.modal-close {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  margin-left: auto;
  display: flex;
  transition: color 0.15s, background 0.15s;
}
.modal-close:hover {
  color: var(--text-primary);
  background: var(--border-subtle);
}

.modal-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.form-select, .form-input {
  width: 100%;
  padding: 9px 12px;
  background: var(--bg-raised);
  border: 1px solid var(--border);
  border-radius: 10px;
  color: var(--text-primary);
  font-size: 0.85rem;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
  font-family: inherit;
}

.form-select:focus, .form-input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-glow);
}

.question-box {
  padding: 10px 12px;
  background: var(--bg-raised);
  border: 1px solid var(--border);
  border-radius: 10px;
  font-size: 0.85rem;
  color: var(--accent);
  font-weight: 500;
}

.error-text {
  font-size: 0.75rem;
  color: #ef4444;
  margin: 0;
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 8px;
}

.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.24s ease; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
.modal-fade-enter-active .security-modal, .modal-fade-leave-active .security-modal {
  transition: transform 0.24s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.modal-fade-enter-from .security-modal, .modal-fade-leave-to .security-modal {
  transform: scale(0.9) translateY(10px);
}
</style>
