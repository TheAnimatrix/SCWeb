export const ALLOWED_PROXY_PATH = /^(cart|checkout|print-files|print-payments)(\/|$)/;

const UPLOAD_TIMEOUT_MS = 60_000;
const DEFAULT_TIMEOUT_MS = 10_000;

export function getProxyTimeoutMs(path: string | undefined): number {
	if (path === 'print-files/upload') {
		return UPLOAD_TIMEOUT_MS;
	}

	return DEFAULT_TIMEOUT_MS;
}

const ALLOWED_METHODS = new Set(['GET', 'POST', 'PUT', 'DELETE']);

export function isAllowedProxyPath(path: string | undefined): boolean {
	if (!path) {
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
