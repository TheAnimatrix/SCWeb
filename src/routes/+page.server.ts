import { getHomeCatalog } from '$lib/client/catalogApi';
import type { PageServerLoad } from './$types';

const STATS_FALLBACK = { makers: 48, listings: 128, cities: 12 };

export const load: PageServerLoad = async ({ fetch }) => {
	const result = await getHomeCatalog(fetch);

	if (!result.ok) {
		console.error('[catalog] home load failed:', result.error.message);
		return {
			pending: false,
			recentProducts: [],
			recentSpares: [],
			recentFleaMarket: [],
			featuredProducts: [],
			stats: STATS_FALLBACK
		};
	}

	return {
		pending: false,
		recentProducts: result.data.recentProducts,
		recentSpares: result.data.recentSpares,
		recentFleaMarket: result.data.recentFleaMarket,
		featuredProducts: result.data.featuredProducts,
		stats: result.data.stats
	};
};
