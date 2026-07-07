import type { Banner } from '$lib/client/banner';
import type { Product } from '$lib/types/product';
import type { PageLoad } from './$types';

const STATS_FALLBACK = { makers: 48, listings: 128, cities: 12 };

const PRODUCT_SELECT = '*, users(username)';

function parseProductIdFromUrl(url: string): string | null {
	const match = url.match(/item=([^&]+)/);
	return match?.[1] ?? null;
}

export const load: PageLoad = async ({ parent }) => {
	const { supabase_lt } = await parent();

	if (!supabase_lt) {
		return {
			recentProducts: [] as Product[],
			featuredProduct: null as Product | null,
			stats: STATS_FALLBACK
		};
	}

	const [recentResult, bannersResult, listingsResult, makersResult] = await Promise.all([
		supabase_lt
			.from('products')
			.select(PRODUCT_SELECT)
			.order('created_at', { ascending: false })
			.limit(6),
		supabase_lt.from('constants').select().eq('key', 'BANNERS'),
		supabase_lt.from('products').select('id', { count: 'exact', head: true }),
		supabase_lt.from('users').select('id', { count: 'exact', head: true })
	]);

	let recentProducts = (recentResult.data ?? []) as Product[];

	if (recentResult.error) {
		console.error('Failed to load recent products with users join:', recentResult.error);
		const fallback = await supabase_lt
			.from('products')
			.select('*')
			.order('created_at', { ascending: false })
			.limit(6);
		recentProducts = (fallback.data ?? []) as Product[];
	}
	let featuredProduct: Product | null = null;

	const banners = bannersResult.data?.[0]?.value as Banner[] | undefined;
	const bannerProductId = banners?.[0]?.url ? parseProductIdFromUrl(banners[0].url) : null;

	if (bannerProductId) {
		const featuredResult = await supabase_lt
			.from('products')
			.select(PRODUCT_SELECT)
			.eq('id', bannerProductId)
			.maybeSingle();

		if (featuredResult.data) {
			featuredProduct = featuredResult.data as Product;
		}
	}

	if (!featuredProduct && recentProducts.length > 0) {
		featuredProduct = recentProducts[0];
	}

	if (!featuredProduct) {
		const fallbackResult = await supabase_lt
			.from('products')
			.select(PRODUCT_SELECT)
			.order('created_at', { ascending: false })
			.limit(1)
			.maybeSingle();

		if (fallbackResult.data) {
			featuredProduct = fallbackResult.data as Product;
		}
	}

	const stats = {
		makers: makersResult.count ?? STATS_FALLBACK.makers,
		listings: listingsResult.count ?? STATS_FALLBACK.listings,
		cities: STATS_FALLBACK.cities
	};

	return {
		recentProducts,
		featuredProduct,
		stats
	};
};
