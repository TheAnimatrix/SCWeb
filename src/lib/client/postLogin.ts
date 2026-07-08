import { goto } from '$app/navigation';
import { sanitizePostLoginUrl } from '$lib/postLoginUrl';

const localStorageKey = 'postLoginURL';

export function gotoPostLogin(fallback: string, remove: boolean = true) {
	if (typeof window === 'undefined') {
		goto(fallback);
		return;
	}
	const raw = localStorage.getItem(localStorageKey);
	const url = sanitizePostLoginUrl(raw);
	if (url) {
		if (remove) {
			localStorage.removeItem(localStorageKey);
		}
		goto(url);
		return;
	}
	if (raw) {
		localStorage.removeItem(localStorageKey);
	}
	goto(fallback);
}

export function setPostLoginURL(url: string): boolean {
	if (typeof window === 'undefined') {
		return false;
	}
	const safe = sanitizePostLoginUrl(url);
	if (!safe) {
		return false;
	}
	localStorage.setItem(localStorageKey, safe);
	return true;
}

export function removePostLoginURL() {
	if (typeof window === 'undefined') {
		return;
	}
	localStorage.removeItem(localStorageKey);
}

export function readPostLoginURL(): string | null {
	if (typeof window === 'undefined') {
		return null;
	}
	const safe = sanitizePostLoginUrl(localStorage.getItem(localStorageKey));
	if (!safe) {
		localStorage.removeItem(localStorageKey);
	}
	return safe;
}
