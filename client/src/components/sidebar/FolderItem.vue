<template>
  <div class="folder-item" :class="{ active: isActive, locked: isLocked, 'drag-over': isDragOver }" @click="handleClick"
    @dragover.prevent="isDragOver = true" @dragleave="isDragOver = false" @drop.stop.prevent="handleDrop"
    :style="{ '--folder-color': folder.color, '--folder-color-glow': folder.color + '18' }">

    <!-- Color-coded folder icon -->
    <div class="folder-icon">
      <Folder class="h-4 w-4 shrink-0" :style="{ color: folder.color, fill: folder.color + '1a' }" />
    </div>

    <!-- Name only -->
    <div class="folder-content">
      <span class="folder-name">{{ folder.name }}</span>
    </div>

    <!-- Lock badge -->
    <div v-if="folder.is_locked" class="lock-badge" :title="isUnlocked ? 'Unlocked this session' : 'Locked'">
      <svg v-if="isUnlocked" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
        <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
      </svg>
      <svg v-else width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      </svg>
    </div>

    <!-- Context menu trigger (3 dots) -->
    <button ref="btnRef" class="ctx-btn" @click.stop="toggleMenu" aria-label="Folder options" tabindex="-1">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
      </svg>
    </button>

    <!-- Count indicator (on far right) -->
    <span class="folder-count">{{ folder.note_count }}</span>

    <!-- Context dropdown -->
    <Teleport to="body">
      <Transition name="ctx-fade">
        <div v-if="menuOpen" class="ctx-menu" :style="menuStyle" ref="ctxMenu">
          <button class="ctx-item" @click.stop="emit('rename'); closeMenu()">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            Rename
          </button>
          <button class="ctx-item" @click.stop="emit('change-color'); closeMenu()">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="13.5" cy="6.5" r="2.5"/><circle cx="19" cy="12" r="2.5"/>
              <circle cx="13.5" cy="17.5" r="2.5"/><circle cx="4.5" cy="12" r="2.5"/>
              <path d="M10 12a3.5 3.5 0 0 0 3.5 3.5"/>
            </svg>
            Change Color
          </button>
          <div class="ctx-divider"></div>
          <button v-if="!folder.is_locked" class="ctx-item" @click.stop="emit('lock'); closeMenu()">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            Lock Folder
          </button>
          <button v-else class="ctx-item" @click.stop="emit('remove-lock'); closeMenu()">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
            </svg>
            Remove Lock
          </button>
          <div class="ctx-divider"></div>
          <button class="ctx-item danger" @click.stop="emit('delete'); closeMenu()">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
            Delete Folder
          </button>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { Folder } from '@lucide/vue';
import type { Folder as FolderType } from '../../types/folder';

const props = defineProps<{
  folder: FolderType;
  isActive: boolean;
  isUnlocked: boolean;
}>();

const emit = defineEmits<{
  (e: 'select'): void;
  (e: 'rename'): void;
  (e: 'change-color'): void;
  (e: 'lock'): void;
  (e: 'remove-lock'): void;
  (e: 'delete'): void;
  (e: 'drop-note', noteId: string): void;
}>();

const isLocked = computed(() => props.folder.is_locked === 1 && !props.isUnlocked);
const menuOpen = ref(false);
const menuStyle = ref({});
const btnRef = ref<HTMLElement | null>(null);
const ctxMenu = ref<HTMLElement | null>(null);
const isDragOver = ref(false);

function handleClick() {
  emit('select');
}

function handleDrop(e: DragEvent) {
  isDragOver.value = false;
  const noteId = e.dataTransfer?.getData('text/plain');
  if (noteId) emit('drop-note', noteId);
}

async function toggleMenu() {
  menuOpen.value = !menuOpen.value;
  if (menuOpen.value) {
    await nextTick();
    positionMenu();
  }
}

function closeMenu() {
  menuOpen.value = false;
}

function positionMenu() {
  const el = ctxMenu.value;
  const btn = btnRef.value;
  if (!el || !btn) return;
  const rect = btn.getBoundingClientRect();
  const menuRect = el.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let top = rect.bottom;
  let left = rect.right - menuRect.width;

  // Viewport boundaries
  if (left + menuRect.width > vw) {
    left = vw - menuRect.width - 12;
  }
  if (left < 12) {
    left = 12;
  }
  if (top + menuRect.height > vh) {
    top = rect.top - menuRect.height;
  }

  menuStyle.value = {
    top: `${top}px`,
    left: `${left}px`
  };
}

function onClickOutside(e: MouseEvent) {
  if (menuOpen.value && ctxMenu.value && !ctxMenu.value.contains(e.target as Node)) {
    closeMenu();
  }
}

onMounted(() => document.addEventListener('mousedown', onClickOutside));
onUnmounted(() => document.removeEventListener('mousedown', onClickOutside));
</script>

<style scoped>
.folder-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 10px;
  margin: 2px 0;
  border-radius: 10px;
  cursor: pointer;
  position: relative;
  transition: background 0.15s, border-color 0.15s, transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
  user-select: none;
  border: 1.5px solid transparent;
}

.folder-item:hover { background: var(--bg-overlay); }
.folder-item.active {
  background: var(--folder-color-glow) !important;
  border-color: var(--folder-color) !important;
}
.folder-item.active .folder-name {
  color: var(--folder-color) !important;
  font-weight: 600;
}
.folder-item.locked { opacity: 0.8; }
.folder-item.drag-over {
  background: var(--folder-color-glow) !important;
  border-color: var(--folder-color) !important;
  transform: scale(1.02);
  z-index: 10;
}

.folder-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  flex-shrink: 0;
}

.folder-content {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
}

.folder-name {
  font-size: 0.855rem;
  font-weight: 500;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 0.15s;
}


.folder-count {
  font-size: 0.72rem;
  color: var(--text-muted);
  background: var(--bg-base);
  border-radius: 20px;
  padding: 1px 7px;
  font-weight: 500;
  flex-shrink: 0;
}

.lock-badge {
  color: var(--text-muted);
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

/* context button - only visible on hover */
.ctx-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 3px 4px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  opacity: 0;
  transition: opacity 0.15s, background 0.15s;
  flex-shrink: 0;
}
.folder-item:hover .ctx-btn { opacity: 1; }
.ctx-btn:hover { background: var(--bg-overlay); color: var(--text-primary); }

/* context menu */
.ctx-menu {
  position: fixed;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 5px;
  min-width: 160px;
  box-shadow: 0 12px 40px rgba(0,0,0,0.15);
  z-index: 2000;
  top: auto;
  left: auto;
}

.ctx-item {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  padding: 8px 10px;
  background: none;
  border: none;
  border-radius: 7px;
  color: var(--text-secondary);
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
  text-align: left;
  font-family: inherit;
}
.ctx-item:hover { background: var(--bg-overlay); color: var(--text-primary); }
.ctx-item.danger { color: #ef4444; }
.ctx-item.danger:hover { background: rgba(239, 68, 68, 0.1); }

.ctx-divider {
  height: 1px;
  background: var(--border);
  margin: 4px 0;
}

.ctx-fade-enter-active, .ctx-fade-leave-active { transition: opacity 0.12s, transform 0.12s; }
.ctx-fade-enter-from, .ctx-fade-leave-to { opacity: 0; transform: scale(0.94) translateY(-4px); }
</style>
