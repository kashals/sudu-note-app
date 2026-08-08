<template>
  <!-- Mobile Backdrop Overlay -->
  <Transition name="fade-backdrop">
    <div
      v-if="isMobileOpen"
      class="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-xs"
      @click="emit('update:isMobileOpen', false)"
    />
  </Transition>

  <aside class="folder-sidebar" :class="{ 'mobile-open': isMobileOpen }">
    <!-- Header -->
    <div class="sidebar-header">
      <span class="sidebar-title">Workspace</span>
      <div class="flex items-center gap-1">
        <button class="new-folder-btn icon-only" @click="openCreateModal" title="New folder" aria-label="New folder">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
        <button
          v-if="isMobileOpen"
          type="button"
          class="md:hidden p-1 text-muted hover:text-primary transition-colors cursor-pointer"
          style="color: var(--text-muted);"
          title="Close Sidebar"
          @click="emit('update:isMobileOpen', false)"
        >
          <X class="h-4 w-4" />
        </button>
      </div>
    </div>

    <!-- All Notes entry -->
    <div
      class="all-notes-item"
      :class="{ active: activeFolderId === null && !showArchived }"
      @click="selectAllNotes"
      @dragover.prevent="allNotesDragOver = true"
      @dragleave="allNotesDragOver = false"
      @drop.prevent="handleDropToAllNotes"
      :style="allNotesDragOver ? { borderColor: 'rgba(137,180,250,0.4)', background: 'rgba(137,180,250,0.08)' } : {}"
    >
      <div class="all-notes-icon">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
      </div>
      <span class="all-notes-label">All Notes</span>
      <span class="folder-count">{{ totalNoteCount }}</span>
    </div>

    <!-- Archive entry -->
    <div
      class="all-notes-item mt-1"
      :class="{ active: showArchived }"
      @click="selectArchive"
    >
      <div class="all-notes-icon">
        <Archive class="w-3.5 h-3.5" style="color: #fb923c;" />
      </div>
      <span class="all-notes-label">Archive</span>
      <span class="folder-count">{{ archivedCount }}</span>
    </div>

    <!-- Divider -->
    <div class="sidebar-divider"></div>

    <!-- Folder list -->
    <div class="folder-list" ref="folderListEl">
      <TransitionGroup name="folder-list-anim" tag="div">
        <FolderItem
          v-for="folder in folders"
          :key="folder.id"
          :folder="folder"
          :isActive="activeFolderId === folder.id"
          :isUnlocked="unlockedFolderIds.has(folder.id)"
          @select="handleFolderSelect(folder)"
          @rename="startRename(folder)"
          @change-color="startColorChange(folder)"
          @lock="startLock(folder)"
          @remove-lock="handleRemoveLock(folder)"
          @delete="handleDelete(folder)"
          @drop-note="(noteId) => handleDropNote(noteId, folder.id)"
        />
      </TransitionGroup>

      <!-- Empty state -->
      <div v-if="folders.length === 0" class="no-folders">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" class="no-folders-icon">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
        </svg>
        <p>No folders yet</p>
      </div>
    </div>



    <!-- ── Modals ──────────────────────────────────────────────── -->
    <FolderModal
      v-model="showFolderModal"
      :isEdit="!!editingFolder"
      :initialName="editingFolder?.name ?? ''"
      :initialColor="editingFolder?.color ?? '#3b82f6'"
      @submit="handleFolderModalSubmit"
    />

    <PinModal
      v-model="showPinModal"
      :mode="pinMode"
      ref="pinModalRef"
      @confirm="handlePinConfirm"
      @forgot-pin="handleForgotPin"
    />

    <!-- Confirm delete -->
    <ConfirmModal
      :isOpen="showDeleteConfirm"
      title="Delete Folder"
      :message="`Are you sure you want to delete '${deletingFolder?.name}'? Notes inside will be moved to All Notes.`"
      confirm-label="Delete"
      confirm-variant="danger"
      @confirm="confirmDelete"
      @cancel="showDeleteConfirm = false"
    />

    <!-- Security Question Setup Modal -->
    <SecurityQuestionModal
      v-model="showSetupQuestionModal"
      mode="setup"
      @setup-complete="handleSetupQuestionComplete"
    />

    <!-- Forgot PIN Reset Modal -->
    <SecurityQuestionModal
      v-model="showForgotConfirm"
      mode="reset"
      :folder-id="forgotTargetFolder?.id ?? null"
      @reset-complete="handleResetComplete"
    />
  </aside>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { AlertTriangle, X, Archive } from '@lucide/vue';
import type { Folder } from '../../types/folder';
import { useFolderState } from '../../composables/useFolderState';
import FolderItem from './FolderItem.vue';
import FolderModal from '../ui/FolderModal.vue';
import PinModal from '../ui/PinModal.vue';
import ConfirmModal from '../ConfirmModal.vue';
import PushButton from '../PushButton.vue';
import SecurityQuestionModal from '../ui/SecurityQuestionModal.vue';

const props = defineProps<{
  notes: { folder_id: string | null; is_archived: number }[];
  isMobileOpen?: boolean;
  showArchived?: boolean;
}>();

const emit = defineEmits<{
  (e: 'move-note', noteId: string, folderId: string | null): void;
  (e: 'update:isMobileOpen', val: boolean): void;
  (e: 'update:showArchived', val: boolean): void;
}>();

const {
  folders,
  activeFolderId,
  unlockedFolderIds,
  isFolderAccessible,
  setActiveFolderId,
  createFolder,
  renameFolder,
  changeColor,
  lockFolder,
  unlockFolderPermanently,
  removeFolder,
  verifyPin,
  checkSecurityQuestion,
  setupSecurityQuestion,
  resetLockWithSecurityAnswer
} = useFolderState();

// ── total count (non-archived uncategorized notes in All Notes view) ────────────
const totalNoteCount = computed(
  () => props.notes.filter(n => n.is_archived === 0 && n.folder_id === null).length
);

// ── UI state ─────────────────────────────────────────────────────
const showFolderModal = ref(false);
const editingFolder = ref<Folder | null>(null);
const colorChangeFolder = ref<Folder | null>(null);

const showPinModal = ref(false);
const pinMode = ref<'set' | 'verify'>('verify');
const pinTargetFolder = ref<Folder | null>(null);
const pinModalRef = ref<InstanceType<typeof PinModal> | null>(null);

const showDeleteConfirm = ref(false);
const deletingFolder = ref<Folder | null>(null);

const allNotesDragOver = ref(false);

const archivedCount = computed(() => {
  return props.notes.filter(n => n.is_archived === 1).length;
});

// ── folder selection ──────────────────────────────────────────────
function selectAllNotes() {
  setActiveFolderId(null);
  emit('update:showArchived', false);
  if (props.isMobileOpen) emit('update:isMobileOpen', false);
}

function selectArchive() {
  setActiveFolderId(null);
  emit('update:showArchived', true);
  if (props.isMobileOpen) emit('update:isMobileOpen', false);
}

function handleFolderSelect(folder: Folder) {
  emit('update:showArchived', false);
  if (props.isMobileOpen) emit('update:isMobileOpen', false);
  if (folder.is_locked && !unlockedFolderIds.value.has(folder.id)) {
    // needs PIN
    pinTargetFolder.value = folder;
    pinMode.value = 'verify';
    showPinModal.value = true;
    return;
  }
  setActiveFolderId(folder.id);
}

// ── create / rename ───────────────────────────────────────────────
function openCreateModal() {
  editingFolder.value = null;
  colorChangeFolder.value = null;
  showFolderModal.value = true;
}

function startRename(folder: Folder) {
  editingFolder.value = folder;
  colorChangeFolder.value = null;
  showFolderModal.value = true;
}

function startColorChange(folder: Folder) {
  colorChangeFolder.value = folder;
  editingFolder.value = folder;
  showFolderModal.value = true;
}

async function handleFolderModalSubmit({ name, color }: { name: string; color: string }) {
  if (editingFolder.value) {
    if (editingFolder.value.name !== name) {
      await renameFolder(editingFolder.value.id, name);
    }
    if (editingFolder.value.color !== color) {
      await changeColor(editingFolder.value.id, color);
    }
  } else {
    await createFolder({ name, color });
  }
  editingFolder.value = null;
  colorChangeFolder.value = null;
}

// ── lock ──────────────────────────────────────────────────────────
async function startLock(folder: Folder) {
  const check = await checkSecurityQuestion();
  if (!check.configured) {
    pendingLockFolder.value = folder;
    showSetupQuestionModal.value = true;
    return;
  }
  // already configured, proceed to PIN setup modal
  pinTargetFolder.value = folder;
  pinMode.value = 'set';
  showPinModal.value = true;
}

async function handleRemoveLock(folder: Folder) {
  // Always verify PIN to remove a lock
  if (folder.is_locked) {
    pinTargetFolder.value = folder;
    pinMode.value = 'verify';
    _pendingRemoveLock.value = true;
    showPinModal.value = true;
    return;
  }
  await unlockFolderPermanently(folder.id);
}

const _pendingRemoveLock = ref(false);
const _pendingDeleteFolder = ref(false);

async function handlePinConfirm(pin: string) {
  const folder = pinTargetFolder.value;
  if (!folder) return;

  if (pinMode.value === 'set') {
    await lockFolder(folder.id, pin);
    showPinModal.value = false;
    pinTargetFolder.value = null;
    return;
  }

  // verify mode
  const ok = await verifyPin(folder.id, pin);
  if (!ok) {
    pinModalRef.value?.triggerError();
    return;
  }

  showPinModal.value = false;

  if (_pendingRemoveLock.value) {
    _pendingRemoveLock.value = false;
    await unlockFolderPermanently(folder.id);
  } else if (_pendingDeleteFolder.value) {
    _pendingDeleteFolder.value = false;
    deletingFolder.value = folder;
    showDeleteConfirm.value = true;
  } else {
    setActiveFolderId(folder.id);
  }
  pinTargetFolder.value = null;
}

// ── forgot PIN reset ──────────────────────────────────────────────
const showForgotConfirm = ref(false);
const forgotTargetFolder = ref<Folder | null>(null);
const showSetupQuestionModal = ref(false);
const pendingLockFolder = ref<Folder | null>(null);

function handleSetupQuestionComplete() {
  if (pendingLockFolder.value) {
    pinTargetFolder.value = pendingLockFolder.value;
    pinMode.value = 'set';
    showPinModal.value = true;
    pendingLockFolder.value = null;
  }
}

async function handleForgotPin() {
  forgotTargetFolder.value = pinTargetFolder.value;
  showPinModal.value = false;
  showForgotConfirm.value = true;
}

async function handleResetComplete(folderId: string) {
  await unlockFolderPermanently(folderId);
  showForgotConfirm.value = false;
  forgotTargetFolder.value = null;
}

// ── delete ────────────────────────────────────────────────────────
function handleDelete(folder: Folder) {
  // Verify PIN if folder is locked
  if (folder.is_locked) {
    pinTargetFolder.value = folder;
    pinMode.value = 'verify';
    _pendingDeleteFolder.value = true;
    showPinModal.value = true;
    return;
  }
  deletingFolder.value = folder;
  showDeleteConfirm.value = true;
}

async function confirmDelete() {
  if (!deletingFolder.value) return;
  await removeFolder(deletingFolder.value.id);
  showDeleteConfirm.value = false;
  deletingFolder.value = null;
}

// ── drag & drop ───────────────────────────────────────────────────
function handleDropNote(noteId: string, folderId: string) {
  emit('move-note', noteId, folderId);
}

function handleDropToAllNotes(e: DragEvent) {
  allNotesDragOver.value = false;
  const noteId = e.dataTransfer?.getData('text/plain');
  if (noteId) emit('move-note', noteId, null);
}
</script>

<style scoped>
.folder-sidebar {
  width: 260px;
  min-width: 260px;
  display: flex;
  flex-direction: column;
  background: var(--bg-surface);
  border-right: 1px solid var(--border);
  height: 100%;
  overflow: hidden;
  flex-shrink: 0;
}

@media (max-width: 767px) {
  .folder-sidebar {
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    z-index: 50;
    box-shadow: 0 0 32px rgba(0,0,0,0.5);
    transform: translateX(-100%);
    transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .folder-sidebar.mobile-open {
    transform: translateX(0);
  }
}

.fade-backdrop-enter-active, .fade-backdrop-leave-active { transition: opacity 0.2s ease; }
.fade-backdrop-enter-from, .fade-backdrop-leave-to { opacity: 0; }

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 14px 10px;
  flex-shrink: 0;
}

.sidebar-title {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-muted);
}

.new-folder-btn.icon-only {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 5px;
  border-radius: 7px;
  display: flex;
  transition: color 0.15s, background 0.15s;
}
.new-folder-btn.icon-only:hover {
  color: var(--text-primary);
  background: var(--bg-overlay);
}

/* All Notes entry */
.all-notes-item {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 8px;
  padding: 9px 10px;
  border-radius: 10px;
  cursor: pointer;
  border: 1.5px solid transparent;
  transition: background 0.15s, border-color 0.15s;
  user-select: none;
}
.all-notes-item:hover { background: var(--bg-overlay); }
.all-notes-item.active {
  background: var(--accent-glow);
  border-color: rgba(13, 185, 129, 0.15);
}

.all-notes-icon {
  width: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  flex-shrink: 0;
}
.all-notes-item.active .all-notes-icon { color: var(--accent-light); }

.all-notes-label {
  flex: 1;
  font-size: 0.855rem;
  font-weight: 500;
  color: var(--text-secondary);
  transition: color 0.15s;
}
.all-notes-item.active .all-notes-label { color: var(--accent-light); font-weight: 600; }

.folder-count {
  font-size: 0.72rem;
  color: var(--text-muted);
  background: var(--bg-base);
  border-radius: 20px;
  padding: 1px 7px;
  font-weight: 500;
  flex-shrink: 0;
}

.sidebar-divider {
  height: 1px;
  background: var(--border);
  margin: 10px 14px;
  flex-shrink: 0;
}

/* Folder list */
.folder-list {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 6px 8px;
  scrollbar-width: thin;
  scrollbar-color: var(--border) transparent;
}
.folder-list::-webkit-scrollbar { width: 4px; }
.folder-list::-webkit-scrollbar-track { background: transparent; }
.folder-list::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }

.no-folders {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 32px 16px;
  color: var(--text-muted);
  text-align: center;
}
.no-folders-icon { opacity: 0.4; }
.no-folders p { font-size: 0.78rem; margin: 0; }

/* New folder bottom button */
.new-folder-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 18px;
  background: none;
  border: none;
  border-top: 1px solid var(--border);
  color: var(--text-muted);
  font-size: 0.82rem;
  font-weight: 500;
  cursor: pointer;
  transition: color 0.15s, background 0.15s;
  width: 100%;
  font-family: inherit;
  flex-shrink: 0;
}
.new-folder-row:hover {
  color: var(--accent);
  background: var(--accent-glow);
}

/* folder list transitions */
.folder-list-anim-enter-active, .folder-list-anim-leave-active { transition: opacity 0.2s, transform 0.2s; }
.folder-list-anim-enter-from, .folder-list-anim-leave-to { opacity: 0; transform: translateX(-8px); }

/* delete confirm dialog */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1500;
}
.confirm-dialog {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 24px;
  width: 320px;
  max-width: calc(100vw - 32px);
  box-shadow: 0 20px 60px rgba(0,0,0,0.15);
}
.confirm-dialog h3 {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 8px;
}
.confirm-dialog p {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin: 0 0 20px;
}
.confirm-dialog strong { color: var(--text-secondary); }
.confirm-actions { display: flex; gap: 10px; }
.btn-cancel, .btn-danger {
  flex: 1;
  padding: 10px;
  border-radius: 10px;
  border: none;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
}
.btn-cancel { background: var(--bg-raised); color: var(--text-secondary); }
.btn-cancel:hover { background: var(--bg-overlay); }
.btn-danger { background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239,68,68,0.2); }
.btn-danger:hover { background: rgba(239, 68, 68, 0.2); }

.reset-input {
  width: 100%;
  background: var(--bg-base);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px 12px;
  color: var(--text-primary);
  font-size: 0.85rem;
  outline: none;
  margin-top: 10px;
}
.reset-input:focus {
  border-color: var(--accent);
}

.mt-4 {
  margin-top: 1rem;
}

/* transitions */
.modal-fade-enter-active, .modal-fade-leave-active {
  transition: opacity 0.24s ease;
}
.modal-fade-enter-from, .modal-fade-leave-to {
  opacity: 0;
}
.modal-fade-enter-active .confirm-dialog, .modal-fade-leave-active .confirm-dialog {
  transition: transform 0.24s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.modal-fade-enter-from .confirm-dialog, .modal-fade-leave-to .confirm-dialog {
  transform: scale(0.9) translateY(10px);
}
</style>
