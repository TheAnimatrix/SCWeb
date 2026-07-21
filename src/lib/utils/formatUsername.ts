/** Lowercase handles like `sc_adi` are shown as-is; display names like `Adithya_Angara` get spaces. */
const SNAKE_CASE_USERNAME_RE = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/;

/** Turns stored handles like `Adithya_Angara` into readable display text. */
export function formatUsernameDisplay(username: string): string {
	const trimmed = username.trim();
	if (SNAKE_CASE_USERNAME_RE.test(trimmed)) {
		return trimmed;
	}
	return formatSnakeCaseDisplay(trimmed);
}

/** Turns stored tag keys like `made_in_india` into readable display text. */
export function formatTagDisplayLabel(tag: string): string {
	const key = tag.trim().toLowerCase().replace(/[\s-]+/g, '_');
	if (key === 'made_in_india') return 'made in 🇮🇳';
	return formatSnakeCaseDisplay(tag);
}

function formatSnakeCaseDisplay(value: string): string {
	return value.replaceAll('_', ' ').replace(/\s+/g, ' ').trim();
}
