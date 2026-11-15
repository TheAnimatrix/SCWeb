/**
 * Accepts only same-origin relative paths for post-login redirects.
 * Rejects protocol-relative URLs, backslashes, and scheme-like path segments.
 */
const MAX_POST_LOGIN_URL_LENGTH = 2048;

function hasControlChars(value: string): boolean {
	for (let i = 0; i < value.length; i++) {
		const code = value.charCodeAt(i);
		if (code <= 0x1f || code === 0x7f) {
			return true;
		}
	}
	return false;
}

export function sanitizePostLoginUrl(value: unknown): string | null {
	if (typeof value !== 'string') {
		return null;
	}

	if (value.length > MAX_POST_LOGIN_URL_LENGTH) {
		return null;
	}

	const trimmed = value.trim();
	if (value !== trimmed) {
		return null;
	}

	if (hasControlChars(trimmed)) {
		return null;
	}

	if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.startsWith('/\\')) {
		return null;
	}

	if (trimmed.includes('\\')) {
		return null;
	}

	const lower = trimmed.toLowerCase();
	if (
		lower.startsWith('/javascript:') ||
		lower.startsWith('/data:') ||
		lower.startsWith('/vbscript:')
	) {
		return null;
	}

	try {
		const decoded = decodeURIComponent(trimmed);
		if (decoded !== trimmed) {
			return sanitizePostLoginUrl(decoded);
		}
	} catch {
		return null;
	}

	return trimmed;
}

/**
 * Reads the post-login target from a sign-in URL. `postLogin` is the canonical name;
 * `redirectTo` is accepted as a legacy alias.
 */
export function postLoginFromSearchParams(params: URLSearchParams): string | null {
	return (
		sanitizePostLoginUrl(params.get('postLogin')) ?? sanitizePostLoginUrl(params.get('redirectTo'))
	);
}

/** `/user/sign?postLogin=<path>` when `next` is a safe same-origin path, else `/user/sign`. */
export function signInPath(next: string | null | undefined): string {
	const safe = sanitizePostLoginUrl(next);
	return safe ? `/user/sign?postLogin=${encodeURIComponent(safe)}` : '/user/sign';
}

/**
 * OAuth `redirectTo`: `<origin>/auth/callback`, with `next` carried as a query parameter
 * only when it is a safe same-origin path.
 */
export function oauthCallbackUrl(origin: string, next: string | null | undefined): string {
	const base = `${origin.replace(/\/+$/, '')}/auth/callback`;
	const safe = sanitizePostLoginUrl(next);
	return safe ? `${base}?next=${encodeURIComponent(safe)}` : base;
}

/** Where `/auth/callback` sends the user after a successful code exchange. */
export function resolveAuthCallbackNext(next: string | null | undefined): string {
	const safe = sanitizePostLoginUrl(next);
	if (!safe || safe.startsWith('/auth/') || safe.startsWith('/user/sign')) return '/';
	return safe;
}
