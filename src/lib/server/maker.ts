import { env } from '$env/dynamic/private';
import type { Cookies } from '@sveltejs/kit';

export type ResolvedMakerLocals = {
	id: string;
	display_name: string | null;
	approved_state: string;
	storefront_state: string;
	username: string | null;
	capabilities: string[];
	tagline?: string | null;
	bio?: string | null;
	avatar_url?: string | null;
	banner_url?: string | null;
	location?: string | null;
};

function getApiOrigin(): string {
	return (env.API_ORIGIN ?? 'http://localhost:3001').replace(/\/$/, '');
}

export function parseStaffUserIds(): string[] {
	return (env.STAFF_USER_IDS ?? '')
		.split(',')
		.map((id) => id.trim())
		.filter(Boolean);
}

export function isStaffUser(userId: string | null | undefined): boolean {
	if (!userId) return false;
	return parseStaffUserIds().includes(userId);
}

export async function fetchMakerMe(
	fetchFn: typeof fetch,
	accessToken: string | undefined
): Promise<ResolvedMakerLocals | null> {
	if (!accessToken) return null;

	try {
		const response = await fetchFn(`${getApiOrigin()}/makers/me`, {
			headers: {
				Authorization: `Bearer ${accessToken}`,
				Accept: 'application/json'
			}
		});
		if (!response.ok) return null;
		const body = (await response.json()) as { maker: ResolvedMakerLocals | null };
		return body.maker;
	} catch {
		return null;
	}
}

export function map3dpPortalRedirect(pathname: string): string | null {
	// Maker admin landing only — print-request detail routes stay under /3dp-portal/maker/[id]
	if (pathname === '/3dp-portal/maker' || pathname === '/3dp-portal/maker/') {
		return '/portal/printing';
	}
	return null;
}

/** Forward cookies for same-origin proxy-style API calls from hooks if needed later. */
export function cookieHeader(cookies: Cookies): string {
	return cookies
		.getAll()
		.map((cookie) => `${cookie.name}=${cookie.value}`)
		.join('; ');
}
