import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getPublicStorefront } from '$lib/client/makersApi';
import { parseHandleParam } from '$lib/utils/reservedUsernames';
import { absoluteUrl, DEFAULT_OG_IMAGE, getSiteUrl } from '$lib/seo/site';

function isAllowedOgRedirect(imageUrl: string, siteOrigin: string): boolean {
	try {
		const target = new URL(imageUrl, siteOrigin);
		const site = new URL(siteOrigin);
		if (target.origin === site.origin) return true;
		// Allow project storage only — never arbitrary maker-controlled hosts.
		if (
			target.hostname.endsWith('.supabase.co') &&
			target.pathname.includes('/storage/v1/object/')
		) {
			return true;
		}
		return false;
	} catch {
		return false;
	}
}

export const GET: RequestHandler = async ({ params, fetch, url }) => {
	const handle = parseHandleParam(params.handle ?? '');
	if (!handle) {
		throw error(404, 'Maker not found');
	}

	const result = await getPublicStorefront(fetch, handle);
	if (!result.ok) {
		throw error(404, 'Maker not found');
	}

	const storefront = result.data.storefront as {
		banner_url?: string | null;
		avatar_url?: string | null;
	};
	const origin = getSiteUrl(url.origin);
	const fallback = absoluteUrl(DEFAULT_OG_IMAGE, origin);
	const candidate = storefront.banner_url || storefront.avatar_url || fallback;
	const image = isAllowedOgRedirect(candidate, origin) ? candidate : fallback;
	throw redirect(302, image);
};
