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
