import { getHomeCatalog } from '$lib/client/catalogApi';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
	const result = await getHomeCatalog(fetch);

	if (!result.ok) {
		console.error('[catalog] home load failed:', result.status, result.error.message);
		// `apiError` makes the page say "didn't load" instead of "no listings yet",
		// and `stats: null` hides the counters instead of showing zeros.
		return {
			pending: false,
			apiError: true,
			recentProducts: [],
			recentSpares: [],
			recentFleaMarket: [],
			featuredProducts: [],
			featuredIsCurated: false,
			stats: null
		};
	}

	return {
		pending: false,
		apiError: false,
		recentProducts: result.data.recentProducts,
		recentSpares: result.data.recentSpares,
		recentFleaMarket: result.data.recentFleaMarket,
		featuredProducts: result.data.featuredProducts,
		featuredIsCurated: result.data.featuredIsCurated ?? true,
		stats: result.data.stats
	};
};
