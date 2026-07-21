import { error } from '@sveltejs/kit';
import { listMyListings } from '$lib/client/makersApi';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, fetch }) => {
	const { maker } = await parent();
	if (!maker.capabilities?.includes('physical_goods')) {
		throw error(403, 'Physical goods capability required');
	}

	const result = await listMyListings(fetch);
	return {
		listings: result.ok ? result.data.listings : [],
		error: result.ok ? null : result.error.message
	};
};
