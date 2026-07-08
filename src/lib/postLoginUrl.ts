/**
 * Accepts only same-origin relative paths for post-login redirects.
 * Rejects protocol-relative URLs, backslashes, and scheme-like path segments.
 */
export function sanitizePostLoginUrl(value: unknown): string | null {
	if (typeof value !== 'string') {
		return null;
	}

	const trimmed = value.trim();
	if (value !== trimmed) {
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
