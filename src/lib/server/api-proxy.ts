export const ALLOWED_PROXY_PATH = /^(cart|checkout)(\/|$)/;

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
