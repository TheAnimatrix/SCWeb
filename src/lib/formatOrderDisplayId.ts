const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Short, copy-friendly order ref for lists. Full id stays in `title` / keys. */
export function formatOrderDisplayId(id: string | number): string {
	const value = String(id).trim();

	if (UUID_RE.test(value)) {
		return value.slice(0, 8).toLowerCase();
	}

	const legacyMatch = /^legacy-(\d+)$/i.exec(value);
	if (legacyMatch) {
		return legacyMatch[1]!;
	}

	if (/^\d+$/.test(value)) {
		return value;
	}

	return value.length > 8 ? value.slice(0, 8).toLowerCase() : value;
}
