const UPLOAD_TIMEOUT_MS = 60_000;
const DEFAULT_TIMEOUT_MS = 10_000;
export const UPLOAD_PROXY_PATH = 'print-files/upload';

export function isUploadProxyPath(path: string | undefined): boolean {
	return path === UPLOAD_PROXY_PATH;
}

export function getProxyTimeoutMs(path: string | undefined): number {
	if (isUploadProxyPath(path)) {
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

/** Reject empty or traversal paths. Everything else is forwarded to Hono. */
export function isAllowedProxyPath(path: string | undefined): boolean {
	if (!path) {
		return false;
	}

	return !containsDotDotSegment(path);
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
