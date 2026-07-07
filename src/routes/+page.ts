import type { Banner } from '$lib/client/banner';
import type { Product } from '$lib/types/product';
import type { PageLoad } from './$types';

const STATS_FALLBACK = { makers: 48, listings: 128, cities: 12 };

const PRODUCT_SELECT = '*, users(username)';

function parseProductIdFromUrl(url: string): string | null {
	const match = url.match(/item=([^&]+)/);
	return match?.[1] ?? null;
}

function getBannerProductIds(banners: Banner[] | undefined): string[] {
	if (!banners?.length) return [];

	const ids: string[] = [];
	for (const banner of banners) {
		const id = parseProductIdFromUrl(banner.url);
		if (id && !ids.includes(id)) ids.push(id);
	}
	return ids;
}

export const load: PageLoad = async ({ parent }) => {
	const { supabase_lt } = await parent();

	if (!supabase_lt) {
		return {
			recentProducts: [] as Product[],
			featuredProducts: [] as Product[],
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
	let featuredProducts: Product[] = [];

	const banners = bannersResult.data?.[0]?.value as Banner[] | undefined;
	const bannerProductIds = getBannerProductIds(banners);

	if (bannerProductIds.length > 0) {
		const featuredResult = await supabase_lt
			.from('products')
			.select(PRODUCT_SELECT)
			.in('id', bannerProductIds);

		if (featuredResult.data?.length) {
			const byId = new Map(
				(featuredResult.data as Product[]).map((product) => [product.id, product])
			);

			featuredProducts = bannerProductIds
				.map((id) => byId.get(id))
				.filter((product): product is Product => !!product);
		}
	}

	if (featuredProducts.length === 0 && recentProducts.length > 0) {
		featuredProducts = recentProducts.slice(0, 3);
	}

	if (featuredProducts.length === 0) {
		const fallbackResult = await supabase_lt
			.from('products')
			.select(PRODUCT_SELECT)
			.order('created_at', { ascending: false })
			.limit(3);

		featuredProducts = (fallbackResult.data ?? []) as Product[];
	}

	const stats = {
		makers: makersResult.count ?? STATS_FALLBACK.makers,
		listings: listingsResult.count ?? STATS_FALLBACK.listings,
		cities: STATS_FALLBACK.cities
	};

	return {
		recentProducts,
		featuredProducts,
		stats
	};
};
