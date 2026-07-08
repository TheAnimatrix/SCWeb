import { browser } from '$app/environment';
import { get, writable } from 'svelte/store';

export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'sc-theme';
const THEME_TRANSITION_MS = 450;

type ThemeOrigin = MouseEvent | { clientX: number; clientY: number };

interface ApplyThemeOptions {
	animate?: boolean;
	origin?: ThemeOrigin;
}

function readStoredTheme(): Theme {
	if (!browser) return 'dark';
	const stored = localStorage.getItem(STORAGE_KEY);
	return stored === 'light' ? 'light' : 'dark';
}

function prefersReducedMotion(): boolean {
	return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function setRevealOrigin(origin?: ThemeOrigin): void {
	const root = document.documentElement;
	const x = origin?.clientX ?? window.innerWidth / 2;
	const y = origin?.clientY ?? window.innerHeight / 2;

	root.style.setProperty('--theme-reveal-x', `${x}px`);
	root.style.setProperty('--theme-reveal-y', `${y}px`);
	root.style.setProperty('--theme-transition-duration', `${THEME_TRANSITION_MS}ms`);
}

function updateThemeClass(nextTheme: Theme): void {
	const root = document.documentElement;
	root.classList.remove('light', 'dark');
	root.classList.add(nextTheme);
	root.style.colorScheme = nextTheme;
	localStorage.setItem(STORAGE_KEY, nextTheme);
}

function commitTheme(nextTheme: Theme): void {
	updateThemeClass(nextTheme);
	theme.set(nextTheme);
}

function applyThemeWithCssFallback(nextTheme: Theme): void {
	const root = document.documentElement;
	root.classList.add('theme-transition');
	commitTheme(nextTheme);

	window.setTimeout(() => {
		root.classList.remove('theme-transition');
	}, THEME_TRANSITION_MS);
}

export function applyTheme(nextTheme: Theme, options: ApplyThemeOptions = {}): void {
	if (!browser) return;

	const shouldAnimate = options.animate !== false && !prefersReducedMotion();

	if (shouldAnimate) {
		setRevealOrigin(options.origin);
	}

	if (shouldAnimate && 'startViewTransition' in document) {
		document.startViewTransition(() => commitTheme(nextTheme));
		return;
	}

	if (shouldAnimate) {
		applyThemeWithCssFallback(nextTheme);
		return;
	}

	commitTheme(nextTheme);
}

export const theme = writable<Theme>('dark');

export function initTheme(): Theme {
	const current = readStoredTheme();
	applyTheme(current, { animate: false });
	return current;
}

export function setTheme(nextTheme: Theme, options: Omit<ApplyThemeOptions, 'animate'> = {}): void {
	applyTheme(nextTheme, options);
}

export function toggleTheme(origin?: ThemeOrigin): Theme {
	const nextTheme: Theme = get(theme) === 'dark' ? 'light' : 'dark';
	applyTheme(nextTheme, { origin });
	return nextTheme;
}
