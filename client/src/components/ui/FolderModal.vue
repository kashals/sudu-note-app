<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="modelValue" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);" @click.self="$emit('update:modelValue', false)">
        <div class="folder-modal animate-scale-in w-full max-w-md border" role="dialog" :aria-label="isEdit ? 'Rename folder' : 'New folder'" style="background: var(--bg-surface); border-color: var(--border); border-radius: 8px; overflow: hidden;">
          
          <!-- header -->
          <div class="flex items-center justify-between border-b px-5 py-4" style="border-color: var(--border);">
            <div class="flex items-center gap-2.5">
              <FolderPlus v-if="!isEdit" class="h-4 w-4 shrink-0" style="color: var(--accent);" />
              <Folder v-else class="h-4 w-4 shrink-0" style="color: var(--accent);" />
              <h3 class="text-sm font-semibold" style="color: var(--text-primary);">{{ isEdit ? 'Rename Folder' : 'New Folder' }}</h3>
            </div>
            <button type="button" class="transition-colors" style="color: var(--text-muted);" @click="$emit('update:modelValue', false)">
              <X class="h-4 w-4" />
            </button>
          </div>

          <!-- body -->
          <div class="px-5 py-5 flex flex-col gap-4 text-xs">
            <div class="field">
              <label class="field-label" for="folder-name-input">Folder Name</label>
              <input
                id="folder-name-input"
                ref="nameInput"
                v-model.trim="localName"
                type="text"
                class="field-input"
                placeholder="e.g. Work, Ideas, Personal..."
                maxlength="50"
                @keydown.enter="submit"
                @keydown.escape="$emit('update:modelValue', false)"
              />
            </div>

            <div class="field">
              <label class="field-label">Color</label>
              <div class="color-grid">
                <button
                  v-for="color in FOLDER_COLORS"
                  :key="color.value"
                  class="color-swatch"
                  :class="{ active: localColor === color.value }"
                  :style="{ background: color.value }"
                  :title="color.name"
                  @click="localColor = color.value"
                >
                  <svg v-if="localColor === color.value" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </button>
              </div>
            </div>

            <!-- Preview -->
            <div class="folder-preview">
              <Folder class="h-4 w-4 shrink-0" :style="{ color: localColor, fill: localColor + '1a' }" />
              <span class="preview-name">{{ localName || 'Folder Name' }}</span>
            </div>
          </div>

          <!-- actions -->
          <div class="flex items-center justify-end gap-2 border-t px-5 py-4" style="border-color: var(--border);">
            <button
              type="button"
              class="px-4 py-2 text-xs font-medium border transition-colors"
              style="background: var(--bg-raised); border-color: var(--border); color: var(--text-secondary);"
              @click="$emit('update:modelValue', false)"
            >
              Cancel
            </button>
            <PushButton
              variant="primary"
              :disabled="!localName"
              @click="submit"
            >
              {{ isEdit ? 'Rename' : 'Create Folder' }}
            </PushButton>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import { FolderPlus, Folder, X } from '@lucide/vue';
import PushButton from '../PushButton.vue';

const FOLDER_COLORS = [
  { name: 'Blue',    value: '#3b82f6' },
  { name: 'Purple',  value: '#a855f7' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Orange',  value: '#f97316' },
  { name: 'Pink',    value: '#ec4899' },
  { name: 'Yellow',  value: '#eab308' },
  { name: 'Red',     value: '#ef4444' },
];

const props = withDefaults(defineProps<{
  modelValue: boolean;
  isEdit?: boolean;
  initialName?: string;
  initialColor?: string;
}>(), {
  isEdit: false,
  initialName: '',
  initialColor: '#3b82f6'
});

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void;
  (e: 'submit', payload: { name: string; color: string }): void;
}>();

const nameInput = ref<HTMLInputElement | null>(null);
const localName = ref(props.initialName);
const localColor = ref(props.initialColor);

watch(() => props.modelValue, async (open) => {
  if (open) {
    localName.value = props.initialName;
    localColor.value = props.initialColor;
    await nextTick();
    nameInput.value?.focus();
  }
});

function submit() {
  if (!localName.value) return;
  emit('submit', { name: localName.value, color: localColor.value });
  emit('update:modelValue', false);
}
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.folder-modal {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  width: 360px;
  max-width: calc(100vw - 32px);
  box-shadow: 0 24px 64px rgba(0,0,0,0.5);
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 20px 0;
}

.modal-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.modal-close {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
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
  gap: 18px;
}

.field { display: flex; flex-direction: column; gap: 8px; }

.field-label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
}

.field-input {
  background: var(--bg-raised);
  border: 1.5px solid var(--border);
  border-radius: 10px;
  padding: 10px 14px;
  color: var(--text-primary);
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.2s;
  font-family: inherit;
}
.field-input::placeholder { color: var(--text-muted); }
.field-input:focus { border-color: var(--accent); }

.color-grid {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.color-swatch {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.15s, border-color 0.15s, box-shadow 0.15s;
}
.color-swatch:hover { transform: scale(1.15); }
.color-swatch.active {
  border-color: white;
  box-shadow: 0 0 0 2px rgba(255,255,255,0.3);
  transform: scale(1.1);
}

.folder-preview {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  background: var(--bg-raised);
  border-radius: 10px;
  border: 1px dashed var(--border);
}

.preview-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  transition: background 0.2s;
}

.preview-name {
  font-size: 0.875rem;
  color: var(--text-secondary);
  font-weight: 500;
}



/* transitions */
.modal-fade-enter-active, .modal-fade-leave-active {
  transition: opacity 0.24s ease;
}
.modal-fade-enter-from, .modal-fade-leave-to {
  opacity: 0;
}
.modal-fade-enter-active .folder-modal, .modal-fade-leave-active .folder-modal {
  transition: transform 0.24s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.modal-fade-enter-from .folder-modal, .modal-fade-leave-to .folder-modal {
  transform: scale(0.9) translateY(10px);
}
</style>
