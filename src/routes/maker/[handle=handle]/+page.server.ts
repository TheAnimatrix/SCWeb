import { error } from '@sveltejs/kit';
import { getPublicStorefront } from '$lib/client/makersApi';
import { parseHandleParam } from '$lib/utils/reservedUsernames';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, fetch, url }) => {
	const handle = parseHandleParam(params.handle);
	const result = await getPublicStorefront(fetch, handle);
	if (!result.ok) {
		throw error(404, 'Maker storefront not found');
	}

	const tab = url.searchParams.get('tab') === 'details' ? 'details' : 'store';
	return {
		storefront: result.data.storefront,
		tab
	};
};
