const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Short, copy-friendly order ref, upper case: "70EC41D8". Used on the success page, the
 * order list and (via `formatOrderRef` in api/src/services/email-templates/order-received.ts)
 * the order e-mails, so the ID a buyer quotes is the same everywhere.
 * Full id stays in `title` / keys.
 */
export function formatOrderDisplayId(id: string | number): string {
	const value = String(id).trim();

	if (UUID_RE.test(value)) {
		return value.slice(0, 8).toUpperCase();
	}

	const legacyMatch = /^legacy-(\d+)$/i.exec(value);
	if (legacyMatch) {
		return legacyMatch[1]!;
	}

	if (/^\d+$/.test(value)) {
		return value;
	}

	return (value.length > 8 ? value.slice(0, 8) : value).toUpperCase();
}
