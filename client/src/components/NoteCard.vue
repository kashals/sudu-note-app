<script setup lang="ts">
import { computed } from 'vue';
import { Edit2, Trash2, Clock, Pin, FileText, Maximize2 } from '@lucide/vue';
import type { Note } from '../types/note';

// component props
const props = defineProps<{
  note: Note;
  viewMode?: 'grid' | 'list';
  indexNumber?: number; // to show NOTE-001 ID
}>();

// component emits
const emit = defineEmits<{
  (e: 'edit', note: Note): void;
  (e: 'delete', note: Note): void;
  (e: 'toggle-pin', note: Note): void;
}>();

// format timestamp
function formatDate(isoString: string): string {
  try {
    return new Date(isoString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return isoString;
  }
}

// category style helper
const categoryStyle = computed(() => {
  switch (props.note.category) {
    case 'Draft':
      return {
        background: 'var(--bg-raised)',
        borderColor: 'var(--border)',
        color: 'var(--text-secondary)'
      };
    case 'Task':
      return {
        background: 'rgba(16, 185, 129, 0.06)',
        borderColor: 'rgba(16, 185, 129, 0.25)',
        color: 'var(--accent-light)'
      };
    case 'Archive':
      return {
        background: 'rgba(161, 161, 170, 0.04)',
        borderColor: 'rgba(161, 161, 170, 0.2)',
        color: 'var(--text-muted)'
      };
    default: // Document
      return {
        background: 'rgba(37, 99, 235, 0.06)',
        borderColor: 'rgba(37, 99, 235, 0.25)',
        color: '#60a5fa'
      };
  }
});

// formatted ID (e.g. NOTE-005)
const noteIdFormatted = computed(() => {
  const num = props.indexNumber !== undefined ? props.indexNumber + 1 : 1;
  return `NOTE-${String(num).padStart(3, '0')}`;
});

const wordCount = computed(() => {
  const t = props.note.content.trim();
  return t ? t.split(/\s+/).length : 0;
});

const charCount = computed(() => props.note.content.length);
</script>

<template>
  <!-- ── list row layout ── -->
  <div
    v-if="viewMode === 'list'"
    class="group flex items-center justify-between gap-4 px-4 py-3 border transition-all duration-200 cursor-default"
    style="background: var(--bg-surface); border-color: var(--border); border-radius: 6px;"
    @mouseover="($el as HTMLElement).style.borderColor = 'var(--accent)'"
    @mouseleave="($el as HTMLElement).style.borderColor = 'var(--border)'"
  >
    <div class="flex items-center gap-3.5 min-w-0 flex-1">
      <!-- ID & Pin -->
      <div class="flex items-center gap-2 shrink-0">
        <button
          type="button"
          class="p-0.5 hover:scale-110 transition-transform"
          :title="note.is_pinned ? 'Unpin note' : 'Pin note'"
          @click.stop="emit('toggle-pin', note)"
        >
          <Pin
            class="h-3.5 w-3.5"
            :style="{
              color: note.is_pinned ? 'var(--accent)' : 'var(--text-muted)',
              fill: note.is_pinned ? 'var(--accent)' : 'none',
              opacity: note.is_pinned ? '1' : '0.3'
            }"
          />
        </button>
        <span class="font-mono text-[10px] select-none" style="color: var(--text-muted);">
          {{ noteIdFormatted }}
        </span>
      </div>

      <!-- Tag -->
      <span
        class="hidden sm:inline-block px-1.5 py-0.5 border text-[9px] font-mono rounded"
        :style="categoryStyle"
      >
        {{ note.category }}
      </span>

      <!-- Title & Preview -->
      <h4 class="text-sm font-semibold truncate max-w-[200px]" style="color: var(--text-primary);">
        {{ note.title }}
      </h4>
      <p class="hidden md:block text-xs truncate flex-1" style="color: var(--text-secondary);">
        {{ note.content }}
      </p>
    </div>

    <!-- Right meta & actions -->
    <div class="flex items-center gap-4 shrink-0">
      <span class="hidden md:block font-mono text-[10px]" style="color: var(--text-muted);">
        {{ formatDate(note.updated_at) }}
      </span>
      <div class="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <button
          type="button"
          class="p-1.5 transition-colors"
          style="color: var(--text-muted);"
          title="Edit Note"
          @mouseover="($el as HTMLElement).style.color = 'var(--accent)'"
          @mouseleave="($el as HTMLElement).style.color = 'var(--text-muted)'"
          @click="emit('edit', note)"
        >
          <Edit2 class="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          class="p-1.5 transition-colors"
          style="color: var(--text-muted);"
          title="Delete Note"
          @mouseover="($el as HTMLElement).style.color = '#f87171'"
          @mouseleave="($el as HTMLElement).style.color = 'var(--text-muted)'"
          @click="emit('delete', note)"
        >
          <Trash2 class="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  </div>

  <!-- ── grid card layout ── -->
  <div v-else class="main-card-layout">
    <!-- Stretchy background/border panel -->
    <div class="card-bg"></div>

    <!-- Content preview container -->
    <div class="card-content-preview" @click="emit('edit', note)">
      <div class="flex items-center justify-between min-w-0 gap-3">
        <!-- left: ID + Pin indicator -->
        <div class="flex items-center gap-2 min-w-0">
          <button
            type="button"
            class="p-0.5 hover:scale-110 transition-transform shrink-0"
            :title="note.is_pinned ? 'Unpin note' : 'Pin note'"
            @click.stop="emit('toggle-pin', note)"
          >
            <Pin
              class="h-3.5 w-3.5"
              :style="{
                color: note.is_pinned ? 'var(--accent)' : 'var(--text-muted)',
                fill: note.is_pinned ? 'var(--accent)' : 'none',
                opacity: note.is_pinned ? '1' : '0.3'
              }"
            />
          </button>
          <span class="font-mono text-[10px] shrink-0" style="color: var(--text-muted);">
            {{ noteIdFormatted }}
          </span>
          <span
            class="px-1.5 py-0.5 border text-[9px] font-mono rounded truncate uppercase"
            :style="categoryStyle"
          >
            {{ note.category }}
          </span>
        </div>

        <!-- right fullscreen zoom icon -->
        <div class="fl-action">
          <div class="fullscreen" title="Open Note">
            <Maximize2 class="fullscreen_svg" />
          </div>
        </div>
      </div>

      <!-- note content preview -->
      <div class="pt-2.5">
        <p class="preview-text text-xs leading-relaxed" style="color: var(--text-secondary);">
          {{ note.content }}
        </p>
      </div>
    </div>

    <!-- Data row: Icon + Title + Updated date (Visually outside at rest, inside on hover) -->
    <div class="card-meta-row" @click="emit('edit', note)">
      <div class="card-type-icon">
        <FileText class="w-4 h-4" style="color: var(--accent);" />
      </div>
      <div class="card-text-details">
        <div class="card-title truncate" :title="note.title">{{ note.title }}</div>
        <div class="card-subtitle">{{ formatDate(note.updated_at) }}</div>
      </div>
    </div>

    <!-- Actions / Stats row: slides up on hover -->
    <div class="card-action-metrics">
      <div class="metric-pill word-count" title="Word count">
        <span class="metric-text font-mono">{{ wordCount }} words</span>
      </div>
      <div class="metric-pill char-count" title="Character count">
        <span class="metric-text font-mono">{{ charCount }} chars</span>
      </div>
      <button class="action-icon edit" title="Edit Note" @click.stop="emit('edit', note)">
        <Edit2 class="w-3 h-3" />
      </button>
      <button class="action-icon delete" title="Delete Note" @click.stop="emit('delete', note)">
        <Trash2 class="w-3 h-3" />
      </button>
    </div>
  </div>
</template>

<style scoped>
/* Main wrapper container */
.main-card-layout {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 242px; /* Reserves layout space in the grid */
  cursor: pointer;
}

/* Stretchy background and border panel */
.card-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 135px; /* Rest height wraps only the preview */
  background-color: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  z-index: 1;
  transition: all 0.25s cubic-bezier(0.19, 1, 0.22, 1);
}

/* Hover: Stretches down to wrap metadata & actions, and lifts up */
.main-card-layout:hover .card-bg {
  height: 238px;
  transform: translateY(-6px);
  border-color: var(--accent);
  box-shadow: 0 10px 25px -10px var(--accent-glow);
}

/* Content preview container */
.card-content-preview {
  position: relative;
  z-index: 2;
  height: 135px;
  padding: 1rem 1.15rem;
  transition: transform 0.25s cubic-bezier(0.19, 1, 0.22, 1);
}

.main-card-layout:hover .card-content-preview {
  transform: translateY(-6px);
}

/* Full screen button in card */
.fl-action {
  display: flex;
  justify-content: flex-end;
  opacity: 0;
  transition: opacity 0.2s ease-in-out;
}

.fullscreen {
  width: 1.6em;
  height: 1.6em;
  border-radius: 5px;
  background-color: var(--bg-raised);
  border: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease-in-out;
}

.fullscreen:hover {
  transform: scale(1.1);
}

.fullscreen_svg {
  width: 11px;
  height: 11px;
  color: var(--text-secondary);
}

.main-card-layout:hover .fl-action {
  opacity: 1;
}

/* Card Content preview paragraph */
.preview-text {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  word-break: break-word;
}

/* Data row below card */
.card-meta-row {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-top: 0.75rem;
  padding: 0 0.5rem;
  cursor: pointer;
  transition: transform 0.25s cubic-bezier(0.19, 1, 0.22, 1);
}

.main-card-layout:hover .card-meta-row {
  transform: translateY(-6px);
}

.card-type-icon {
  width: 2.25em;
  height: 2.25em;
  background-color: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: border-color 0.25s cubic-bezier(0.19, 1, 0.22, 1);
}

.main-card-layout:hover .card-type-icon {
  border-color: var(--accent);
}

.card-text-details {
  display: flex;
  justify-content: center;
  flex-direction: column;
  margin-left: 0.5rem;
  min-width: 0;
  flex: 1;
}

.card-title {
  font-weight: bold;
  font-size: 0.85rem;
  color: var(--text-primary);
}

.card-subtitle {
  font-size: 0.7rem;
  color: var(--text-muted);
  font-family: monospace;
}

/* Actions & statistics row */
.card-action-metrics {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 0.5em;
  margin-top: 1rem;
  padding: 0 0.5rem;
  height: 24px;
  opacity: 0;
  transform: translateY(-6px);
  transition: all 0.25s cubic-bezier(0.19, 1, 0.22, 1);
}

.main-card-layout:hover .card-action-metrics {
  opacity: 1;
  transform: translateY(-8px);
}

.metric-pill {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 1.6em;
  padding: 0 0.6rem;
  border-radius: 4px;
  background-color: var(--bg-raised);
  border: 1px solid var(--border);
}

.metric-text {
  font-size: 0.7rem;
  color: var(--text-secondary);
}

.action-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  background-color: var(--bg-raised);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-icon.edit:hover {
  background-color: var(--accent-glow);
  border-color: var(--accent);
  color: var(--accent-light);
}

.action-icon.delete:hover {
  background-color: rgba(127, 29, 29, 0.15);
  border-color: #7f1d1d;
  color: #f87171;
}

/* list style resets */
button {
  background: transparent;
  border: none;
  cursor: pointer;
}
</style>
