/** Reserved handles — keep in sync with api/src/lib/reserved-usernames.ts */
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

export function parseHandleParam(handle: string): string {
	return handle.trim().replace(/^@+/, '');
}

export function makerStorefrontPath(username: string): string {
	const handle = username.trim().replace(/^@+/, '');
	return `/maker/@${handle}`;
}
