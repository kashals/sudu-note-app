<script setup lang="ts">
import { computed } from 'vue';
import { Edit2, Trash2, Clock, Pin, RotateCcw, CheckSquare, Square } from '@lucide/vue';
import type { Note } from '../types/note';
import TagPill from './ui/TagPill.vue';
import CategoryBadge from './ui/CategoryBadge.vue';
import { formatDate, stripHtml, formatNoteId } from '../utils/formatters';

const props = defineProps<{
  note: Note;
  viewMode?: 'grid' | 'list';
  indexNumber?: number;
  isSelectMode?: boolean;
  isSelected?: boolean;
}>();

const emit = defineEmits<{
  (e: 'edit', note: Note): void;
  (e: 'delete', note: Note): void;
  (e: 'toggle-pin', note: Note): void;
  (e: 'archive', note: Note): void;
  (e: 'restore', note: Note): void;
  (e: 'toggle-select', noteId: string): void;
}>();

const noteIdFormatted = computed(() => formatNoteId(props.indexNumber !== undefined ? props.indexNumber + 1 : 1));

const wordCount = computed(() => {
  const t = props.note.content.trim();
  return t ? t.split(/\s+/).length : 0;
});

const charCount = computed(() => props.note.content.length);

const parsedTags = computed<string[]>(() => {
  try {
    return JSON.parse(props.note.tags || '[]');
  } catch {
    return [];
  }
});

const plainContent = computed(() => stripHtml(props.note.content));

function handleCardClick() {
  if (props.isSelectMode) {
    emit('toggle-select', props.note.id);
  } else {
    emit('edit', props.note);
  }
}
</script>

<template>
  <!-- ── list row layout ── -->
  <div
    v-if="viewMode === 'list'"
    class="group flex items-center justify-between gap-4 px-4 py-3 border transition-all duration-200 cursor-pointer animate-fade-up select-none"
    :style="{
      background: isSelected ? 'var(--accent-glow)' : 'var(--bg-surface)',
      borderColor: isSelected ? 'var(--accent)' : 'var(--border)',
      borderRadius: '6px'
    }"
    @click="handleCardClick"
    @mouseover="($el as HTMLElement).style.borderColor = 'var(--accent)'"
    @mouseleave="($el as HTMLElement).style.borderColor = isSelected ? 'var(--accent)' : 'var(--border)'"
  >
    <div class="flex items-center gap-3.5 min-w-0 flex-1">
      <!-- Select Checkbox -->
      <button
        v-if="isSelectMode"
        type="button"
        class="p-0.5 transition-transform hover:scale-110 shrink-0"
        @click.stop="emit('toggle-select', note.id)"
      >
        <CheckSquare v-if="isSelected" class="h-4 w-4 text-emerald-400 fill-emerald-400/20" />
        <Square v-else class="h-4 w-4 text-gray-500" />
      </button>

      <!-- ID & Pin -->
      <div class="flex items-center gap-2 shrink-0">
        <button
          v-if="note.is_archived !== 1 && !isSelectMode"
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

      <!-- Category -->
      <CategoryBadge :category="note.category" size="sm" class="hidden sm:inline-block" />

      <!-- Note Tags -->
      <div v-if="parsedTags.length > 0" class="hidden md:flex items-center gap-1.5">
        <TagPill v-for="tag in parsedTags" :key="tag" :tag="tag" size="sm" />
      </div>

      <!-- Title & Preview -->
      <h4 class="text-sm font-semibold truncate max-w-[200px]" style="color: var(--text-primary);">
        {{ note.title || 'Untitled Note' }}
      </h4>
      <p
        class="hidden md:block text-xs truncate flex-1 font-mono"
        :class="!plainContent ? 'italic opacity-60' : 'opacity-80'"
        style="color: var(--text-secondary);"
      >
        {{ plainContent || 'No content added' }}
      </p>
    </div>

    <!-- Right meta & actions -->
    <div class="flex items-center gap-4 shrink-0">
      <span class="hidden md:block font-mono text-[10px]" style="color: var(--text-muted);">
        <span class="edited-time">{{ formatDate(note.updated_at) }}</span>
        <span class="created-time">Created: {{ formatDate(note.created_at) }}</span>
      </span>
      
      <div v-if="!isSelectMode" class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <!-- archived note actions -->
        <template v-if="note.is_archived === 1">
          <button
            type="button"
            class="p-1.5 transition-colors"
            style="color: var(--text-muted);"
            title="Restore Note"
            @mouseover="($el as HTMLElement).style.color = 'var(--accent)'"
            @mouseleave="($el as HTMLElement).style.color = 'var(--text-muted)'"
            @click.stop="emit('restore', note)"
          >
            <RotateCcw class="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            class="p-1.5 transition-colors"
            style="color: var(--text-muted);"
            title="Delete Forever"
            @mouseover="($el as HTMLElement).style.color = '#f87171'"
            @mouseleave="($el as HTMLElement).style.color = 'var(--text-muted)'"
            @click.stop="emit('delete', note)"
          >
            <Trash2 class="h-3.5 w-3.5" />
          </button>
        </template>

        <!-- active note actions -->
        <template v-else>
          <button
            type="button"
            class="p-1.5 transition-colors"
            style="color: var(--text-muted);"
            title="Edit Note"
            @mouseover="($el as HTMLElement).style.color = 'var(--accent-light)'"
            @mouseleave="($el as HTMLElement).style.color = 'var(--text-muted)'"
            @click.stop="emit('edit', note)"
          >
            <Edit2 class="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            class="p-1.5 transition-colors"
            style="color: var(--text-muted);"
            title="Archive Note"
            @mouseover="($el as HTMLElement).style.color = '#fb923c'"
            @mouseleave="($el as HTMLElement).style.color = 'var(--text-muted)'"
            @click.stop="emit('archive', note)"
          >
            <Clock class="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            class="p-1.5 transition-colors"
            style="color: var(--text-muted);"
            title="Delete Note"
            @mouseover="($el as HTMLElement).style.color = '#f87171'"
            @mouseleave="($el as HTMLElement).style.color = 'var(--text-muted)'"
            @click.stop="emit('delete', note)"
          >
            <Trash2 class="h-3.5 w-3.5" />
          </button>
        </template>
      </div>
    </div>
  </div>

  <!-- ── grid card layout ── -->
  <div
    v-else
    class="note-card group relative flex flex-col justify-between p-5 border transition-all duration-300 cursor-pointer overflow-hidden animate-scale-in select-none"
    :style="{
      background: isSelected ? 'var(--accent-glow)' : 'var(--bg-surface)',
      borderColor: isSelected ? 'var(--accent)' : 'var(--border)',
      borderRadius: '8px',
      minHeight: '220px'
    }"
    @click="handleCardClick"
    @mouseover="($el as HTMLElement).style.borderColor = 'var(--accent)'; ($el as HTMLElement).style.transform = 'translateY(-2px)'"
    @mouseleave="($el as HTMLElement).style.borderColor = isSelected ? 'var(--accent)' : 'var(--border)'; ($el as HTMLElement).style.transform = 'translateY(0)'"
  >
    <!-- top header: ID + pin + category -->
    <div>
      <div class="flex items-center justify-between gap-2 mb-3">
        <div class="flex items-center gap-2">
          <!-- Select Checkbox -->
          <button
            v-if="isSelectMode"
            type="button"
            class="p-0.5 transition-transform hover:scale-110 shrink-0"
            @click.stop="emit('toggle-select', note.id)"
          >
            <CheckSquare v-if="isSelected" class="h-4 w-4 text-emerald-400 fill-emerald-400/20" />
            <Square v-else class="h-4 w-4 text-gray-500" />
          </button>

          <button
            v-if="note.is_archived !== 1 && !isSelectMode"
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
          <span class="font-mono text-[10px]" style="color: var(--text-muted);">
            {{ noteIdFormatted }}
          </span>
        </div>

        <!-- category badge -->
        <CategoryBadge :category="note.category" />
      </div>

      <!-- note title -->
      <h3 class="text-base font-bold tracking-tight mb-2 line-clamp-1 group-hover:text-emerald-400 transition-colors" style="color: var(--text-primary);">
        {{ note.title || 'Untitled Note' }}
      </h3>

      <!-- content preview -->
      <p
        class="text-xs leading-relaxed line-clamp-3 mb-4 font-mono"
        :class="!plainContent ? 'italic opacity-60' : 'opacity-80'"
        style="color: var(--text-secondary);"
      >
        {{ plainContent || 'No content added' }}
      </p>

      <!-- tags preview list -->
      <div v-if="parsedTags.length > 0" class="flex flex-wrap gap-1 mb-4">
        <TagPill v-for="tag in parsedTags" :key="tag" :tag="tag" size="sm" />
      </div>
    </div>

    <!-- bottom footer: metadata + hover action toolbar -->
    <div class="pt-3 border-t flex items-center justify-between" style="border-color: var(--border-subtle);">
      <!-- stats -->
      <div class="flex items-center gap-3 font-mono text-[10px]" style="color: var(--text-muted);">
        <span>{{ wordCount }}w</span>
        <span>·</span>
        <span>{{ charCount }}c</span>
        <span>·</span>
        <span>{{ formatDate(note.updated_at) }}</span>
      </div>

      <!-- action buttons -->
      <div v-if="!isSelectMode" class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <!-- archived note actions -->
        <template v-if="note.is_archived === 1">
          <button
            type="button"
            class="p-1 transition-colors"
            style="color: var(--text-muted);"
            title="Restore Note"
            @mouseover="($el as HTMLElement).style.color = 'var(--accent)'"
            @mouseleave="($el as HTMLElement).style.color = 'var(--text-muted)'"
            @click.stop="emit('restore', note)"
          >
            <RotateCcw class="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            class="p-1 transition-colors"
            style="color: var(--text-muted);"
            title="Delete Forever"
            @mouseover="($el as HTMLElement).style.color = '#f87171'"
            @mouseleave="($el as HTMLElement).style.color = 'var(--text-muted)'"
            @click.stop="emit('delete', note)"
          >
            <Trash2 class="h-3.5 w-3.5" />
          </button>
        </template>

        <!-- active note actions -->
        <template v-else>
          <button
            type="button"
            class="p-1 transition-colors"
            style="color: var(--text-muted);"
            title="Edit Note"
            @mouseover="($el as HTMLElement).style.color = 'var(--accent-light)'"
            @mouseleave="($el as HTMLElement).style.color = 'var(--text-muted)'"
            @click.stop="emit('edit', note)"
          >
            <Edit2 class="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            class="p-1 transition-colors"
            style="color: var(--text-muted);"
            title="Archive Note"
            @mouseover="($el as HTMLElement).style.color = '#fb923c'"
            @mouseleave="($el as HTMLElement).style.color = 'var(--text-muted)'"
            @click.stop="emit('archive', note)"
          >
            <Clock class="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            class="p-1 transition-colors"
            style="color: var(--text-muted);"
            title="Delete Note"
            @mouseover="($el as HTMLElement).style.color = '#f87171'"
            @mouseleave="($el as HTMLElement).style.color = 'var(--text-muted)'"
            @click.stop="emit('delete', note)"
          >
            <Trash2 class="h-3.5 w-3.5" />
          </button>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.edited-time {
  display: inline;
}
.created-time {
  display: none;
}
.note-card:hover .edited-time {
  display: none;
}
.note-card:hover .created-time {
  display: inline;
}
</style>
