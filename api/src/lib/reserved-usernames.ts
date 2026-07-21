/** Reserved handles that must not be used as public usernames / storefront paths. */
export const RESERVED_USERNAMES = new Set(
	[
		'admin',
		'administrator',
		'api',
		'apply',
		'auth',
		'cart',
		'checkout',
		'crafting',
		'crafts',
		'help',
		'login',
		'maker',
		'makers',
		'me',
		'null',
		'og',
		'portal',
		'policy',
		'root',
		'selfcrafted',
		'settings',
		'signin',
		'signup',
		'support',
		'system',
		'user',
		'users',
		'www',
		'3dp-portal',
		'3dp'
	].map((value) => value.toLowerCase())
);

export function normalizeUsername(username: string): string {
	return username.trim().replace(/^@+/, '').toLowerCase();
}

export function isReservedUsername(username: string): boolean {
	return RESERVED_USERNAMES.has(normalizeUsername(username));
}

export function isValidUsernameFormat(username: string): boolean {
	const normalized = normalizeUsername(username);
	return /^[a-zA-Z0-9_]{3,30}$/.test(normalized) && !isReservedUsername(normalized);
}

/** Strip leading @ from a storefront route param. */
export function parseHandleParam(handle: string): string {
	return handle.trim().replace(/^@+/, '');
}
