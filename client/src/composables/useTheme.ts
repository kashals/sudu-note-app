import { ref } from 'vue';

export function useTheme() {
  const isDark = ref(localStorage.getItem('sudu_theme') !== 'light');

  function applyTheme(dark: boolean) {
    if (dark) {
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
    }
  }

  function toggleTheme() {
    isDark.value = !isDark.value;
    applyTheme(isDark.value);
    localStorage.setItem('sudu_theme', isDark.value ? 'dark' : 'light');
  }

  function initTheme() {
    applyTheme(isDark.value);
  }

  return {
    isDark,
    toggleTheme,
    initTheme
  };
}
