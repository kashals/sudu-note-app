import { ref, type Ref } from 'vue';

export interface ActiveFormats {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  h1: boolean;
  h2: boolean;
  h3: boolean;
  quote: boolean;
  alignLeft: boolean;
  alignCenter: boolean;
  alignRight: boolean;
  alignJustify: boolean;
  list: boolean;
  listOrdered: boolean;
}

export function useEditor(
  editorRef: Ref<HTMLDivElement | null>,
  content: Ref<string>,
  touchedContent: Ref<boolean>,
  markDirty: () => void,
  triggerAutoSave: () => void,
  handleSubmit: () => void,
  requestClose: () => void,
  isShortcutsModalOpen: Ref<boolean>,
  showUnsavedWarning: Ref<boolean>,
  dismissWarning: () => void
) {
  const activeFormats = ref<ActiveFormats>({
    bold: false,
    italic: false,
    underline: false,
    h1: false,
    h2: false,
    h3: false,
    quote: false,
    alignLeft: false,
    alignCenter: false,
    alignRight: false,
    alignJustify: false,
    list: false,
    listOrdered: false
  });

  function updateActiveFormats() {
    if (!editorRef.value) return;
    activeFormats.value.bold = document.queryCommandState('bold');
    activeFormats.value.italic = document.queryCommandState('italic');
    activeFormats.value.underline = document.queryCommandState('underline');
    activeFormats.value.alignLeft = document.queryCommandState('justifyLeft');
    activeFormats.value.alignCenter = document.queryCommandState('justifyCenter');
    activeFormats.value.alignRight = document.queryCommandState('justifyRight');
    activeFormats.value.alignJustify = document.queryCommandState('justifyFull');
    activeFormats.value.list = document.queryCommandState('insertUnorderedList');
    activeFormats.value.listOrdered = document.queryCommandState('insertOrderedList');

    const block = document.queryCommandValue('formatBlock') || '';
    const blockLower = typeof block === 'string' ? block.toLowerCase() : '';
    activeFormats.value.h1 = blockLower === 'h1';
    activeFormats.value.h2 = blockLower === 'h2';
    activeFormats.value.h3 = blockLower === 'h3';
    activeFormats.value.quote = blockLower === 'blockquote';
  }

  function format(command: string, value: string = '') {
    if (command === 'formatBlock') {
      const currentBlock = document.queryCommandValue('formatBlock').toLowerCase();
      const target = value.toLowerCase();
      if (currentBlock === target) {
        document.execCommand('formatBlock', false, 'p');
      } else {
        document.execCommand('formatBlock', false, value);
      }
    } else {
      document.execCommand(command, false, value || undefined);
    }
    if (editorRef.value) {
      editorRef.value.focus();
      content.value = editorRef.value.innerHTML;
      updateActiveFormats();
    }
    markDirty();
    triggerAutoSave();
  }

  function insertCheckbox() {
    if (!editorRef.value) return;
    editorRef.value.focus();

    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;

    const range = sel.getRangeAt(0);
    range.deleteContents();

    const wrapper = document.createElement('div');
    wrapper.className = 'todo-item';
    wrapper.setAttribute('data-todo', 'true');
    wrapper.style.cssText = 'display: flex; align-items: center; gap: 8px; margin: 4px 0;';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.style.cssText = 'width: 14px; height: 14px; cursor: pointer; border-radius: 4px; flex-shrink: 0;';

    const ZWSP = '\u200b';
    const label = document.createElement('span');
    label.setAttribute('contenteditable', 'true');
    label.setAttribute('data-todo-label', 'true');
    label.style.cssText = 'outline: none; flex: 1;';
    label.textContent = ZWSP;

    wrapper.appendChild(checkbox);
    wrapper.appendChild(label);

    range.insertNode(wrapper);

    const newRange = document.createRange();
    const textNode = label.firstChild!;
    newRange.setStart(textNode, 1);
    newRange.collapse(true);
    sel.removeAllRanges();
    sel.addRange(newRange);

    content.value = editorRef.value.innerHTML;
    updateActiveFormats();
    markDirty();
    triggerAutoSave();
  }

  function handleEditorInput() {
    if (editorRef.value) {
      content.value = editorRef.value.innerHTML;
      touchedContent.value = true;
      updateActiveFormats();
      markDirty();
      triggerAutoSave();
    }
  }

  function handleEditorKeydown(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && ['b', 'i', 'u'].includes(e.key.toLowerCase())) {
      setTimeout(() => {
        if (editorRef.value) {
          content.value = editorRef.value.innerHTML;
          updateActiveFormats();
        }
      }, 10);
    }

    if (e.key === 'Backspace') {
      const sel = window.getSelection();
      if (sel && sel.rangeCount && sel.isCollapsed) {
        let node: Node | null = sel.getRangeAt(0).startContainer;
        let todoWrapper: HTMLElement | null = null;
        while (node && node !== editorRef.value) {
          if (node instanceof HTMLElement && node.dataset.todo === 'true') {
            todoWrapper = node;
            break;
          }
          node = node.parentNode;
        }

        if (todoWrapper) {
          const labelEl = todoWrapper.querySelector('[data-todo-label]') as HTMLElement | null;
          const rawText = labelEl?.textContent?.replace(/\u200b/g, '') ?? '';
          const range = sel.getRangeAt(0);

          const atStart = range.startOffset <= 1 && (range.startContainer === labelEl || range.startContainer === labelEl?.firstChild);
          if (rawText === '' || atStart) {
            e.preventDefault();
            const prev = todoWrapper.previousSibling;
            todoWrapper.parentNode?.removeChild(todoWrapper);

            if (prev) {
              const newRange = document.createRange();
              newRange.selectNodeContents(prev);
              newRange.collapse(false);
              sel.removeAllRanges();
              sel.addRange(newRange);
            }
            if (editorRef.value) content.value = editorRef.value.innerHTML;
            markDirty();
            triggerAutoSave();
            return;
          }
        }
      }
    }

    if (e.key === 'Enter' && !e.shiftKey && !(e.metaKey || e.ctrlKey)) {
      const sel = window.getSelection();
      if (sel && sel.rangeCount) {
        let node: Node | null = sel.getRangeAt(0).startContainer;
        let todoWrapper: HTMLElement | null = null;
        while (node && node !== editorRef.value) {
          if (node instanceof HTMLElement && node.dataset.todo === 'true') {
            todoWrapper = node;
            break;
          }
          node = node.parentNode;
        }

        if (todoWrapper) {
          e.preventDefault();
          let after = todoWrapper.nextSibling;
          if (!after || (after instanceof HTMLElement && after.dataset.todo === 'true')) {
            const p = document.createElement('p');
            p.innerHTML = '<br>';
            todoWrapper.parentNode?.insertBefore(p, todoWrapper.nextSibling ?? null);
            after = p;
          }
          const range = document.createRange();
          range.setStart(after, 0);
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
          if (editorRef.value) content.value = editorRef.value.innerHTML;
          markDirty();
          triggerAutoSave();
          return;
        }
      }
    }

    if ((e.ctrlKey || e.metaKey) && ['z', 'y'].includes(e.key.toLowerCase())) {
      setTimeout(() => {
        if (editorRef.value) {
          content.value = editorRef.value.innerHTML;
          updateActiveFormats();
          markDirty();
          triggerAutoSave();
        }
      }, 10);
    }

    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      if (isShortcutsModalOpen.value) {
        isShortcutsModalOpen.value = false;
      } else if (showUnsavedWarning.value) {
        dismissWarning();
      } else {
        requestClose();
      }
    }
  }

  return {
    activeFormats,
    updateActiveFormats,
    format,
    insertCheckbox,
    handleEditorInput,
    handleEditorKeydown
  };
}
