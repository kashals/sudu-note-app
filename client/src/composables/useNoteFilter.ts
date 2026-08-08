import { ref, computed, type Ref } from 'vue';
import type { Note } from '../types/note';

export type SortOption =
  | 'updated_desc'
  | 'updated_asc'
  | 'title_asc'
  | 'title_desc';

export type DatePreset = 'any' | 'today' | '7days' | '30days' | 'year';

const BASE_CATEGORIES = ['Personal', 'Work', 'Ideas', 'Research', 'Meeting', 'Project'];
const BASE_TAGS = ['Important', 'Review', 'Urgent', 'Later'];

export function useNoteFilter(
  notes: Ref<Note[]>,
  showArchived: Ref<boolean>,
  searchQuery: Ref<string>
) {
  const sortOrder = ref<SortOption>('updated_desc');
  const selectedCategoryFilter = ref<string[]>([]);
  const selectedTagFilter = ref<string[]>([]);

  // ── Date Filter State ──
  const startDate = ref<string>('');
  const endDate = ref<string>('');
  const quickDatePreset = ref<DatePreset>('any');

  const availableCategories = computed(() => {
    const cats = new Set<string>(BASE_CATEGORIES);
    notes.value.forEach(n => { if (n.category) cats.add(n.category); });
    return Array.from(cats);
  });

  const availableTags = computed(() => {
    const tags = new Set<string>(BASE_TAGS);
    notes.value.forEach(n => {
      try {
        const parsed = JSON.parse(n.tags || '[]');
        if (Array.isArray(parsed)) parsed.forEach(t => tags.add(t));
      } catch {}
    });
    return Array.from(tags);
  });

  function toggleCategoryFilter(cat: string) {
    if (cat === 'all') {
      selectedCategoryFilter.value = [];
      return;
    }
    const idx = selectedCategoryFilter.value.indexOf(cat);
    if (idx > -1) {
      selectedCategoryFilter.value.splice(idx, 1);
    } else {
      selectedCategoryFilter.value.push(cat);
    }
  }

  function toggleTagFilter(tag: string) {
    if (tag === 'all') {
      selectedTagFilter.value = [];
      return;
    }
    const idx = selectedTagFilter.value.indexOf(tag);
    if (idx > -1) {
      selectedTagFilter.value.splice(idx, 1);
    } else {
      selectedTagFilter.value.push(tag);
    }
  }

  const isDateFilterActive = computed(() => {
    return startDate.value !== '' || endDate.value !== '' || quickDatePreset.value !== 'any';
  });

  const isFilterActive = computed(() => {
    return (
      sortOrder.value !== 'updated_desc' ||
      selectedCategoryFilter.value.length > 0 ||
      selectedTagFilter.value.length > 0 ||
      isDateFilterActive.value
    );
  });

  const activeFilterCount = computed(() => {
    let count = 0;
    if (sortOrder.value !== 'updated_desc') count++;
    if (selectedCategoryFilter.value.length > 0) count += selectedCategoryFilter.value.length;
    if (selectedTagFilter.value.length > 0) count += selectedTagFilter.value.length;
    if (isDateFilterActive.value) count++;
    return count;
  });

  function resetDateFilter() {
    startDate.value = '';
    endDate.value = '';
    quickDatePreset.value = 'any';
  }

  function resetFilters() {
    sortOrder.value = 'updated_desc';
    selectedCategoryFilter.value = [];
    selectedTagFilter.value = [];
    resetDateFilter();
  }

  const filteredNotes = computed(() => {
    const query = searchQuery.value.trim().toLowerCase();
    const targetStatus = showArchived.value ? 1 : 0;

    let list = notes.value.filter(n => (n.is_archived || 0) === targetStatus);

    // 1. Search Query Filter
    if (query) {
      list = list.filter(
        (n) =>
          n.title.toLowerCase().includes(query) ||
          n.content.toLowerCase().includes(query)
      );
    }

    // 2. Multi-Select Category Filter
    if (selectedCategoryFilter.value.length > 0) {
      list = list.filter(n => n.category && selectedCategoryFilter.value.includes(n.category));
    }

    // 3. Multi-Select Tag Filter
    if (selectedTagFilter.value.length > 0) {
      list = list.filter(n => {
        try {
          const tags: string[] = JSON.parse(n.tags || '[]');
          return selectedTagFilter.value.some(t => tags.includes(t));
        } catch {
          return false;
        }
      });
    }

    // 4. Date Range & Preset Filter
    if (startDate.value || endDate.value) {
      list = list.filter(n => {
        const noteDateStr = new Date(n.updated_at).toISOString().split('T')[0] ?? '';
        if (startDate.value && noteDateStr < startDate.value) return false;
        if (endDate.value && noteDateStr > endDate.value) return false;
        return true;
      });
    } else if (quickDatePreset.value !== 'any') {
      const now = new Date().getTime();
      const oneDay = 24 * 60 * 60 * 1000;
      list = list.filter(n => {
        const noteTime = new Date(n.updated_at).getTime();
        const diff = now - noteTime;
        if (quickDatePreset.value === 'today') return diff <= oneDay;
        if (quickDatePreset.value === '7days') return diff <= 7 * oneDay;
        if (quickDatePreset.value === '30days') return diff <= 30 * oneDay;
        if (quickDatePreset.value === 'year') return diff <= 365 * oneDay;
        return true;
      });
    }

    // 5. Sorting
    list = [...list].sort((a, b) => {
      if (sortOrder.value === 'updated_desc') {
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      } else if (sortOrder.value === 'updated_asc') {
        return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
      } else if (sortOrder.value === 'title_asc') {
        return a.title.localeCompare(b.title);
      } else if (sortOrder.value === 'title_desc') {
        return b.title.localeCompare(a.title);
      }
      return 0;
    });

    return list;
  });

  return {
    sortOrder,
    selectedCategoryFilter,
    selectedTagFilter,
    startDate,
    endDate,
    quickDatePreset,
    isDateFilterActive,
    availableCategories,
    availableTags,
    isFilterActive,
    activeFilterCount,
    toggleCategoryFilter,
    toggleTagFilter,
    resetDateFilter,
    resetFilters,
    filteredNotes
  };
}
