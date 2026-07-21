import { listMyListings } from '$lib/client/makersApi';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
	const result = await listMyListings(fetch);
	return {
		listings: result.ok ? result.data.listings : [],
		error: result.ok ? null : result.error.message
	};
};
