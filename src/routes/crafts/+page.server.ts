import { getBrowseCatalog } from '$lib/client/catalogApi';
import type { BrowseCategory, BrowseSort, TagGroup, TagOption } from '$lib/types/browse';
import type { Product } from '$lib/types/product';
import type { PageServerLoad } from './$types';
import { sanitizeBrowseParams } from './browseParams';

export const load: PageServerLoad = async ({ fetch, url }) => {
	const params = sanitizeBrowseParams(url.searchParams);
	const result = await getBrowseCatalog(fetch, params);

	if (!result.ok) {
		console.error('[catalog] browse load failed:', result.status, result.error.message);
		const sort = params.get('sort') as BrowseSort | null;
		return {
			apiError: true,
			products: [] as Product[],
			totalCount: 0,
			currentPage: 1,
			totalPages: 0,
			// Keep what the buyer asked for, so the search box and chips don't empty out.
			filters: {
				filter: (params.get('filter') as BrowseCategory | null) ?? 'all',
				q: params.get('q') ?? '',
				tag: params.get('tag'),
				minPrice: params.has('minPrice') ? Number(params.get('minPrice')) : null,
				maxPrice: params.has('maxPrice') ? Number(params.get('maxPrice')) : null,
				inStock: params.get('inStock') === 'true',
				sort: sort ?? 'newest',
				page: Number(params.get('page') ?? 1)
			},
			categoryCounts: null,
			tagOptions: [] as TagOption[],
			tagGroups: [] as TagGroup[],
			standaloneTags: [] as TagOption[],
			allTagOptions: [] as TagOption[]
		};
	}

	return {
		apiError: false,
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
