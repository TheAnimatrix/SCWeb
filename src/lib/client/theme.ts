import { browser } from '$app/environment';
import { writable } from 'svelte/store';

export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'sc-theme';

function readStoredTheme(): Theme {
	if (!browser) return 'dark';
	const stored = localStorage.getItem(STORAGE_KEY);
	return stored === 'light' ? 'light' : 'dark';
}

export function applyTheme(theme: Theme): void {
	if (!browser) return;

	const root = document.documentElement;
	root.classList.remove('light', 'dark');
	root.classList.add(theme);
	root.style.colorScheme = theme;
	localStorage.setItem(STORAGE_KEY, theme);
}

export const theme = writable<Theme>('dark');

export function initTheme(): Theme {
	const current = readStoredTheme();
	applyTheme(current);
	theme.set(current);
	return current;
}

export function setTheme(next: Theme): void {
	applyTheme(next);
	theme.set(next);
}

export function toggleTheme(): Theme {
	let next: Theme = 'dark';
	theme.update((current) => {
		next = current === 'dark' ? 'light' : 'dark';
		applyTheme(next);
		return next;
	});
	return next;
}
