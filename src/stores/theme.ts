import { computed, ref } from 'vue';
import { defineStore } from 'pinia';

export type ThemeMode = 'light' | 'dark';

const THEME_KEY = 'app_theme';

function getPreferredTheme(): ThemeMode {
	if (typeof window === 'undefined') return 'light';
	const cached = localStorage.getItem(THEME_KEY);
	if (cached === 'light' || cached === 'dark') return cached;
	return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyThemeClass(mode: ThemeMode) {
	const root = document.documentElement;
	root.classList.toggle('dark', mode === 'dark');
	root.style.colorScheme = mode;
}

export const useThemeStore = defineStore('theme', () => {
	const mode = ref<ThemeMode>('light');
	const isDark = computed(() => mode.value === 'dark');

	function setTheme(next: ThemeMode) {
		mode.value = next;
		localStorage.setItem(THEME_KEY, next);
		applyThemeClass(next);
	}

	function toggleTheme() {
		setTheme(mode.value === 'dark' ? 'light' : 'dark');
	}

	function initTheme() {
		const initial = getPreferredTheme();
		mode.value = initial;
		applyThemeClass(initial);
	}

	return { mode, isDark, setTheme, toggleTheme, initTheme };
});
