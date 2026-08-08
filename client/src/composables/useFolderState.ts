import { ref, computed } from 'vue';
import type { Folder, CreateFolderDto, UpdateFolderDto } from '../types/folder';
import {
  getFolders,
  createFolder as apiCreateFolder,
  updateFolder as apiUpdateFolder,
  deleteFolder as apiDeleteFolder,
  verifyFolderPin as apiVerifyPin,
  getSecurityQuestion,
  setSecurityQuestion,
  resetFolderPin
} from '../services/api';

// ─── module-level state (singleton) ──────────────────────────────
const folders = ref<Folder[]>([]);
const activeFolderId = ref<string | null>(null);
const unlockedFolderIds = ref<Set<string>>(new Set());
const isLoading = ref(false);

// ─── composable ───────────────────────────────────────────────────
export function useFolderState() {
  // A folder is accessible if it's not locked OR it has been unlocked this session
  const isFolderAccessible = (folder: Folder): boolean => {
    if (!folder.is_locked) return true;
    return unlockedFolderIds.value.has(folder.id);
  };

  const activeFolder = computed<Folder | null>(
    () => folders.value.find(f => f.id === activeFolderId.value) ?? null
  );

  // ── CRUD ──────────────────────────────────────────────────────
  async function loadFolders() {
    isLoading.value = true;
    try {
      folders.value = await getFolders();
    } finally {
      isLoading.value = false;
    }
  }

  async function createFolder(dto: CreateFolderDto): Promise<Folder> {
    const folder = await apiCreateFolder(dto);
    folders.value.push(folder);
    return folder;
  }

  async function renameFolder(id: string, name: string): Promise<void> {
    const updated = await apiUpdateFolder(id, { name });
    const idx = folders.value.findIndex(f => f.id === id);
    if (idx !== -1) folders.value[idx] = updated;
  }

  async function changeColor(id: string, color: string): Promise<void> {
    const updated = await apiUpdateFolder(id, { color });
    const idx = folders.value.findIndex(f => f.id === id);
    if (idx !== -1) folders.value[idx] = updated;
  }

  async function lockFolder(id: string, pin: string): Promise<void> {
    const updated = await apiUpdateFolder(id, { is_locked: 1, pin_hash: pin });
    const idx = folders.value.findIndex(f => f.id === id);
    if (idx !== -1) folders.value[idx] = updated;
    // Remove from unlocked set when locking
    unlockedFolderIds.value.delete(id);
  }

  async function unlockFolderPermanently(id: string): Promise<void> {
    // Remove lock entirely
    const updated = await apiUpdateFolder(id, { is_locked: 0, pin_hash: null });
    const idx = folders.value.findIndex(f => f.id === id);
    if (idx !== -1) folders.value[idx] = updated;
    unlockedFolderIds.value.delete(id);
  }

  async function removeFolder(id: string): Promise<void> {
    await apiDeleteFolder(id);
    folders.value = folders.value.filter(f => f.id !== id);
    if (activeFolderId.value === id) activeFolderId.value = null;
    unlockedFolderIds.value.delete(id);
  }

  async function verifyPin(id: string, pin: string): Promise<boolean> {
    const success = await apiVerifyPin(id, pin);
    if (success) {
      unlockedFolderIds.value = new Set([...unlockedFolderIds.value, id]);
    }
    return success;
  }

  // ── note count sync ───────────────────────────────────────────
  function updateFolderNoteCount(folderId: string | null, delta: number) {
    if (!folderId) return;
    const folder = folders.value.find(f => f.id === folderId);
    if (folder) folder.note_count = Math.max(0, folder.note_count + delta);
  }

  function setActiveFolderId(id: string | null) {
    activeFolderId.value = id;
  }

  // ── security question helpers ─────────────────────────────────
  async function checkSecurityQuestion() {
    return await getSecurityQuestion();
  }

  async function setupSecurityQuestion(question: string, answer: string) {
    await setSecurityQuestion(question, answer);
  }

  async function resetLockWithSecurityAnswer(id: string, answer: string): Promise<boolean> {
    const success = await resetFolderPin(id, answer);
    if (success) {
      // Remove lock from local state
      const idx = folders.value.findIndex(f => f.id === id);
      if (idx !== -1) {
        const folder = folders.value[idx];
        if (folder) {
          folder.is_locked = 0;
          folder.has_pin = false;
        }
      }
      unlockedFolderIds.value.delete(id);
    }
    return success;
  }

  return {
    folders,
    activeFolderId,
    activeFolder,
    isLoading,
    unlockedFolderIds,
    isFolderAccessible,
    loadFolders,
    createFolder,
    renameFolder,
    changeColor,
    lockFolder,
    unlockFolderPermanently,
    removeFolder,
    verifyPin,
    updateFolderNoteCount,
    setActiveFolderId,
    checkSecurityQuestion,
    setupSecurityQuestion,
    resetLockWithSecurityAnswer
  };
}
