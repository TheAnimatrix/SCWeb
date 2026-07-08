import type { Banner } from '$lib/client/banner';
import type { Product } from '$lib/types/product';
import type { PageLoad } from './$types';
import type { SupabaseClient } from '@supabase/supabase-js';

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

async function loadRecentByType(
	supabase: SupabaseClient,
	type: string,
	limit = 6
): Promise<Product[]> {
	const result = await supabase
		.from('products')
		.select(PRODUCT_SELECT)
		.eq('type', type)
		.order('created_at', { ascending: false })
		.limit(limit);

	if (result.error) {
		return [];
	}

	return (result.data ?? []) as Product[];
}

export const load: PageLoad = async ({ parent }) => {
	const { supabase } = await parent();

	if (!supabase) {
		return {
			recentProducts: [] as Product[],
			recentSpares: [] as Product[],
			recentFleaMarket: [] as Product[],
			featuredProducts: [] as Product[],
			stats: STATS_FALLBACK
		};
	}

	const [
		recentProducts,
		recentSpares,
		recentFleaMarket,
		bannersResult,
		listingsResult,
		makersResult
	] = await Promise.all([
		loadRecentByType(supabase, 'product'),
		loadRecentByType(supabase, 'spare'),
		loadRecentByType(supabase, 'flea-market'),
		supabase.from('constants').select().eq('key', 'BANNERS'),
		supabase.from('products').select('id', { count: 'exact', head: true }),
		supabase.from('users').select('id', { count: 'exact', head: true })
	]);
	let featuredProducts: Product[] = [];

	const banners = bannersResult.data?.[0]?.value as Banner[] | undefined;
	const bannerProductIds = getBannerProductIds(banners);

	if (bannerProductIds.length > 0) {
		const featuredResult = await supabase
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
		const fallbackResult = await supabase
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
		recentSpares,
		recentFleaMarket,
		featuredProducts,
		stats
	};
};
