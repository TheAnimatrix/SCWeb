export const ALLOWED_PROXY_PATH =
	/^(auth|cart|checkout|print-files|print-payments|print-requests|chats|catalog|constants|products)(\/|$)/;

const UPLOAD_TIMEOUT_MS = 60_000;
const DEFAULT_TIMEOUT_MS = 10_000;

export function getProxyTimeoutMs(path: string | undefined): number {
	if (path === 'print-files/upload') {
		return UPLOAD_TIMEOUT_MS;
	}

	return DEFAULT_TIMEOUT_MS;
}

const ALLOWED_METHODS = new Set(['GET', 'POST', 'PUT', 'DELETE']);

function containsDotDotSegment(path: string): boolean {
	const hasDotDot = (value: string) => value.split('/').some((segment) => segment === '..');

	if (hasDotDot(path)) {
		return true;
	}

	try {
		return hasDotDot(decodeURIComponent(path));
	} catch {
		return false;
	}
}

export function isAllowedProxyPath(path: string | undefined): boolean {
	if (!path) {
		return false;
	}

	if (containsDotDotSegment(path)) {
		return false;
	}

	return ALLOWED_PROXY_PATH.test(path);
}

export function buildProxyTargetUrl(apiOrigin: string, path: string, search: string): URL {
	const target = new URL(apiOrigin);
	target.pathname = `/${path}`;
	target.search = search;
	return target;
}

export function isAllowedProxyMethod(method: string): boolean {
	return ALLOWED_METHODS.has(method);
}

/** Public catalog reads — no auth token needed; skipping session lookup saves ~100–300ms. */
export function isPublicReadProxyPath(path: string | undefined, method: string): boolean {
	if (method !== 'GET' || !path) return false;
	return /^(catalog|constants|products)(\/|$)/.test(path);
}
