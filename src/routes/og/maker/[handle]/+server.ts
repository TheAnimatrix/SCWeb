import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getPublicStorefront } from '$lib/client/makersApi';
import { parseHandleParam } from '$lib/utils/reservedUsernames';
import { absoluteUrl, DEFAULT_OG_IMAGE, getSiteUrl } from '$lib/seo/site';

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
	const image = storefront.banner_url || storefront.avatar_url || absoluteUrl(DEFAULT_OG_IMAGE, origin);
	throw redirect(302, image);
};
