<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="modelValue" class="modal-backdrop" @click.self="handleBackdropClick">
        <div class="pin-modal" role="dialog" :aria-label="mode === 'set' ? 'Set folder PIN' : 'Enter folder PIN'">
          <div class="modal-header">
            <div class="lock-icon-wrap">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <div>
              <h2 class="modal-title">{{ mode === 'set' ? 'Set Folder Lock' : 'Locked Folder' }}</h2>
              <p class="modal-subtitle">{{ subtitle }}</p>
            </div>
            <button class="modal-close" @click="$emit('update:modelValue', false)" aria-label="Close">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <div class="modal-body">
            <!-- PIN dots display -->
            <div class="pin-dots">
              <div
                v-for="i in 4"
                :key="i"
                class="pin-dot"
                :class="{ filled: pin.length >= i, shake: hasError }"
              ></div>
            </div>

            <!-- Error message -->
            <Transition name="error-fade">
              <p v-if="hasError" class="error-msg">Incorrect PIN. Try again.</p>
            </Transition>

            <!-- Forgot PIN link -->
            <button
              v-if="mode === 'verify'"
              type="button"
              class="forgot-pin-btn"
              @click="$emit('forgot-pin')"
            >
              Forgot PIN?
            </button>

            <!-- Confirm pin for set mode -->
            <p v-if="mode === 'set' && pin.length === 4 && !confirmMode" class="hint-text">
              Re-enter PIN to confirm
            </p>

            <!-- Numpad -->
            <div class="numpad">
              <button v-for="n in [1,2,3,4,5,6,7,8,9]" :key="n" class="num-btn" @click="pressDigit(String(n))">
                {{ n }}
              </button>
              <button class="num-btn ghost" disabled></button>
              <button class="num-btn" @click="pressDigit('0')">0</button>
              <button class="num-btn delete-btn" @click="deleteDigit" :disabled="pin.length === 0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/>
                  <line x1="18" y1="9" x2="12" y2="15"/>
                  <line x1="12" y1="9" x2="18" y2="15"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';

const props = withDefaults(defineProps<{
  modelValue: boolean;
  /** 'set' = choose a new pin, 'verify' = enter existing pin */
  mode: 'set' | 'verify';
}>(), {
  mode: 'verify'
});

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void;
  (e: 'confirm', pin: string): void;
  (e: 'forgot-pin'): void;
}>();

const pin = ref('');
const firstPin = ref('');
const confirmMode = ref(false);
const hasError = ref(false);

const subtitle = computed(() => {
  if (props.mode === 'set') {
    return confirmMode.value ? 'Confirm your 4-digit PIN' : 'Choose a 4-digit PIN';
  }
  return 'Enter the 4-digit PIN to unlock';
});

watch(() => props.modelValue, (open) => {
  if (open) reset();
});

function reset() {
  pin.value = '';
  firstPin.value = '';
  confirmMode.value = false;
  hasError.value = false;
}

function handleBackdropClick() {
  emit('update:modelValue', false);
}

function pressDigit(digit: string) {
  if (pin.value.length >= 4) return;
  hasError.value = false;
  pin.value += digit;

  if (pin.value.length === 4) {
    handleComplete();
  }
}

function deleteDigit() {
  pin.value = pin.value.slice(0, -1);
  hasError.value = false;
}

function handleComplete() {
  if (props.mode === 'verify') {
    emit('confirm', pin.value);
    return;
  }

  // set mode — need confirm step
  if (!confirmMode.value) {
    firstPin.value = pin.value;
    confirmMode.value = true;
    pin.value = '';
    return;
  }

  // confirm step
  if (pin.value === firstPin.value) {
    emit('confirm', pin.value);
    emit('update:modelValue', false);
  } else {
    triggerError();
  }
}

function triggerError() {
  hasError.value = true;
  pin.value = '';
  if (props.mode === 'set') {
    confirmMode.value = false;
    firstPin.value = '';
  }
  setTimeout(() => { hasError.value = false; }, 1500);
}

// expose for parent to trigger error (e.g. wrong PIN from server)
defineExpose({ triggerError, reset });
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
}

.pin-modal {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 20px;
  width: 320px;
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

.lock-icon-wrap {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: rgba(137, 180, 250, 0.12);
  color: var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2px;
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
  padding: 28px 20px 22px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

/* PIN dots */
.pin-dots {
  display: flex;
  gap: 14px;
}

.pin-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid var(--border);
  background: transparent;
  transition: background 0.15s, border-color 0.15s, transform 0.1s;
}

.pin-dot.filled {
  background: var(--accent);
  border-color: var(--accent);
  transform: scale(1.15);
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20%       { transform: translateX(-6px); }
  40%       { transform: translateX(6px); }
  60%       { transform: translateX(-4px); }
  80%       { transform: translateX(4px); }
}

.pin-dot.shake { animation: shake 0.4s ease; }

/* error */
.error-msg {
  font-size: 0.78rem;
  color: #f38ba8;
  margin: 0;
}

.hint-text {
  font-size: 0.78rem;
  color: var(--text-muted);
  margin: 0;
}

/* numpad */
.numpad {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  width: 100%;
}

.num-btn {
  background: var(--bg-raised);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  color: var(--text-primary);
  font-size: 1.2rem;
  font-weight: 600;
  height: 54px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.12s, transform 0.08s, border-color 0.12s;
  font-family: inherit;
}
.num-btn:hover:not(:disabled) {
  background: var(--border);
  border-color: var(--border);
  transform: scale(1.03);
}
.num-btn:active:not(:disabled) { transform: scale(0.96); }
.num-btn.ghost, .num-btn:disabled { opacity: 0; cursor: default; pointer-events: none; }
.delete-btn { color: var(--text-muted); opacity: 1 !important; pointer-events: all !important; }
.delete-btn:disabled { opacity: 0.3 !important; }

.forgot-pin-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 0.72rem;
  font-weight: 500;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: color 0.15s, background 0.15s;
  margin-top: -4px;
}
.forgot-pin-btn:hover {
  color: var(--accent);
  background: var(--accent-glow);
}

/* transitions */
.modal-fade-enter-active, .modal-fade-leave-active {
  transition: opacity 0.24s ease;
}
.modal-fade-enter-from, .modal-fade-leave-to {
  opacity: 0;
}
.modal-fade-enter-active .pin-modal, .modal-fade-leave-active .pin-modal {
  transition: transform 0.24s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.modal-fade-enter-from .pin-modal, .modal-fade-leave-to .pin-modal {
  transform: scale(0.9) translateY(10px);
}

.error-fade-enter-active, .error-fade-leave-active { transition: opacity 0.2s; }
.error-fade-enter-from, .error-fade-leave-to { opacity: 0; }
</style>
