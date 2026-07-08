import { getBrowseCatalog } from '$lib/client/catalogApi';
import type { TagGroup, TagOption } from '$lib/types/browse';
import type { Product } from '$lib/types/product';
import type { PageServerLoad } from './$types';

const emptyResult = {
	products: [] as Product[],
	totalCount: 0,
	currentPage: 1,
	totalPages: 0,
	filters: {
		filter: 'all' as const,
		q: '',
		tag: null,
		minPrice: null,
		maxPrice: null,
		inStock: false,
		sort: 'newest' as const,
		page: 1
	},
	categoryCounts: { all: 0, products: 0, spares: 0, flea_market: 0 },
	tagOptions: [] as TagOption[],
	tagGroups: [] as TagGroup[],
	standaloneTags: [] as TagOption[],
	allTagOptions: [] as TagOption[]
};

export const load: PageServerLoad = async ({ fetch, url }) => {
	const result = await getBrowseCatalog(fetch, url.searchParams);

	if (!result.ok) {
		console.error('[catalog] browse load failed:', result.error.message);
		return emptyResult;
	}

	return {
		products: result.data.products,
		totalCount: result.data.totalCount,
		currentPage: result.data.currentPage,
		totalPages: result.data.totalPages,
		filters: {
			filter: result.data.filters.filter,
			q: result.data.filters.q ?? '',
			tag: result.data.filters.tag ?? null,
			minPrice: result.data.filters.minPrice ?? null,
			maxPrice: result.data.filters.maxPrice ?? null,
			inStock: result.data.filters.inStock ?? false,
			sort: result.data.filters.sort,
			page: result.data.filters.page
		},
		categoryCounts: result.data.categoryCounts,
		tagOptions: result.data.allTagOptions,
		tagGroups: result.data.tagGroups,
		standaloneTags: result.data.standaloneTags,
		allTagOptions: result.data.allTagOptions
	};
};
