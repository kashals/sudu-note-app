import { ref, type Ref } from 'vue';
import type { CreateNoteDto } from '../types/note';

export function useAutoSave(
  isOpen: Ref<boolean>,
  noteToEditId: () => number | string | undefined,
  isValid: Ref<boolean>,
  isSubmitting: Ref<boolean | undefined>,
  onAutoSaveEmit: (payload: CreateNoteDto) => void
) {
  const autoSave = ref(localStorage.getItem('sudu_autosave') !== 'false');
  const autoSaveStatus = ref<'idle' | 'saving' | 'saved'>('idle');
  let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
  const isDirty = ref(false);

  function markDirty() {
    isDirty.value = true;
  }

  function resetDirty() {
    isDirty.value = false;
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
      autoSaveTimer = null;
    }
    autoSaveStatus.value = 'idle';
  }

  function toggleAutoSave() {
    autoSave.value = !autoSave.value;
    localStorage.setItem('sudu_autosave', String(autoSave.value));
    if (!autoSave.value) {
      if (autoSaveTimer) clearTimeout(autoSaveTimer);
      autoSaveTimer = null;
      autoSaveStatus.value = 'idle';
    }
  }

  function triggerAutoSave(getData: () => CreateNoteDto) {
    if (!autoSave.value || !isOpen.value) return;
    if (!noteToEditId()) return;
    if (!isDirty.value) return;

    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => doAutoSave(getData), 3000);
  }

  function doAutoSave(getData: () => CreateNoteDto) {
    if (!isValid.value || isSubmitting.value) {
      autoSaveStatus.value = 'idle';
      return;
    }
    isDirty.value = false;
    autoSaveStatus.value = 'saving';

    onAutoSaveEmit(getData());

    setTimeout(() => { autoSaveStatus.value = 'saved'; }, 600);
    setTimeout(() => { autoSaveStatus.value = 'idle'; }, 2400);
  }

  function cleanupAutoSave() {
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
  }

  return {
    autoSave,
    autoSaveStatus,
    isDirty,
    markDirty,
    resetDirty,
    toggleAutoSave,
    triggerAutoSave,
    cleanupAutoSave
  };
}
