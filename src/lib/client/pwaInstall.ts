const DISMISS_KEY = 'sc-pwa-install-dismissed';
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export interface BeforeInstallPromptEvent extends Event {
	prompt: () => Promise<void>;
	userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function isStandaloneDisplayMode(): boolean {
	return (
		window.matchMedia('(display-mode: standalone)').matches ||
		// iOS Safari
		(window.navigator as Navigator & { standalone?: boolean }).standalone === true
	);
}

export function isIosDevice(): boolean {
	return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

export function wasInstallPromptDismissed(): boolean {
	const dismissedAt = localStorage.getItem(DISMISS_KEY);
	if (!dismissedAt) return false;

	const dismissedTime = Number.parseInt(dismissedAt, 10);
	if (Number.isNaN(dismissedTime)) {
		localStorage.removeItem(DISMISS_KEY);
		return false;
	}

	if (Date.now() - dismissedTime < DISMISS_DURATION_MS) {
		return true;
	}

	localStorage.removeItem(DISMISS_KEY);
	return false;
}

export function dismissInstallPrompt(): void {
	localStorage.setItem(DISMISS_KEY, Date.now().toString());
}
