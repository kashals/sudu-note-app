import { ref } from 'vue';

export function useToast() {
  const toastMessage = ref<string | null>(null);
  const toastType = ref<'success' | 'error'>('success');
  let toastTimer: ReturnType<typeof setTimeout> | null = null;

  function showToast(message: string, type: 'success' | 'error' = 'success') {
    if (toastTimer) clearTimeout(toastTimer);
    toastMessage.value = message;
    toastType.value = type;
    toastTimer = setTimeout(() => { toastMessage.value = null; }, 4000);
  }

  function dismissToast() {
    if (toastTimer) clearTimeout(toastTimer);
    toastMessage.value = null;
  }

  return {
    toastMessage,
    toastType,
    showToast,
    dismissToast
  };
}
