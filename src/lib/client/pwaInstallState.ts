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
