import { writable, get } from 'svelte/store';
import {
	type BeforeInstallPromptEvent,
	dismissInstallPrompt,
	isIosDevice,
	isStandaloneDisplayMode
} from './pwaInstall';

export const installEvent = writable<BeforeInstallPromptEvent | null>(null);
export const installing = writable(false);

let initialized = false;

export function initPwaInstallState(): void {
	if (initialized || typeof window === 'undefined' || isStandaloneDisplayMode()) {
		return;
	}

	initialized = true;

	window.addEventListener('beforeinstallprompt', (event) => {
		event.preventDefault();
		installEvent.set(event as BeforeInstallPromptEvent);
	});
}

export async function promptPwaInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
	const event = get(installEvent);
	if (!event) return 'unavailable';

	installing.set(true);

	try {
		await event.prompt();
		const { outcome } = await event.userChoice;

		if (outcome === 'accepted') {
			installEvent.set(null);
		}

		return outcome;
	} finally {
		installing.set(false);
		installEvent.set(null);
	}
}

export { dismissInstallPrompt, isIosDevice, isStandaloneDisplayMode };

const VISIT_COUNT_KEY = 'sc-visit-count';
const VISIT_SESSION_KEY = 'sc-visit-counted';

/**
 * Counts visits (browser sessions, not page views) in localStorage and returns the
 * running total. Safe to call on every page: a session is only counted once.
 */
export function recordVisit(): number {
	try {
		const current = Number.parseInt(localStorage.getItem(VISIT_COUNT_KEY) ?? '0', 10);
		const count = Number.isNaN(current) ? 0 : current;
		if (sessionStorage.getItem(VISIT_SESSION_KEY)) return Math.max(count, 1);

		const next = count + 1;
		localStorage.setItem(VISIT_COUNT_KEY, String(next));
		sessionStorage.setItem(VISIT_SESSION_KEY, '1');
		return next;
	} catch {
		// Storage blocked (private mode, etc.): treat as a first visit so we never nag.
		return 1;
	}
}

/** The install prompt only appears from the second visit onward. */
export const INSTALL_PROMPT_MIN_VISITS = 2;

const NO_INSTALL_PROMPT_PATHS = [
	'/cart',
	'/checkout',
	'/summary',
	'/user/sign',
	'/user/forgot-password',
	'/user/reset-password',
	'/auth'
];

/** No install prompt where the buyer is paying or signing in. */
export function isInstallPromptAllowedOn(pathname: string): boolean {
	return !NO_INSTALL_PROMPT_PATHS.some(
		(prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
	);
}
