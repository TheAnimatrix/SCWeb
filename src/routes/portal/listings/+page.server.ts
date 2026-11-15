import { listMyListings } from '$lib/client/makersApi';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, fetch }) => {
	const { maker } = await parent();
	if (!maker.capabilities?.includes('physical_goods')) {
		// Shown as a plain page state instead of a bare 403.
		return { canSell: false, listings: [], error: null };
	}

	const result = await listMyListings(fetch);
	return {
		canSell: true,
		listings: result.ok ? result.data.listings : [],
		error: result.ok ? null : result.error.message
	};
};
