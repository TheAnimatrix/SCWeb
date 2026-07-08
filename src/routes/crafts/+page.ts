import type { Product } from '$lib/types/product';
import type {
	BrowseCategory,
	BrowseFilters,
	BrowseSort,
	CategoryCounts,
	TagGroup,
	TagOption
} from '$lib/types/browse';
import {
	buildTagGroups,
	applyTagFilter,
	filterBrowsableStandaloneTags,
	filterBrowsableTagGroups,
	normalizeTagKey
} from '$lib/utils/browseTags';

function normalizeFilterTag(raw: string): string {
	if (raw.includes('/')) {
		const [parent, child] = raw.split('/');
		return `${normalizeTagKey(parent)}/${normalizeTagKey(child)}`;
	}

	return normalizeTagKey(raw);
}
import type { PageLoad } from './$types';
import type { SupabaseClient } from '@supabase/supabase-js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ProductQuery = any;

const PAGE_SIZE = 12;
const PRODUCT_SELECT = '*, users(username)';

const VALID_FILTERS: BrowseCategory[] = ['all', 'products', 'spares', 'flea_market'];
const VALID_SORTS: BrowseSort[] = ['newest', 'price_asc', 'price_desc'];

function parseFilters(searchParams: URLSearchParams): BrowseFilters {
	const filterParam = searchParams.get('filter') ?? 'all';
	const sortParam = searchParams.get('sort') ?? 'newest';
	const tagParam = searchParams.get('tag') ?? searchParams.get('craft');
	const minPriceParam = searchParams.get('minPrice');
	const maxPriceParam = searchParams.get('maxPrice');
	const pageParam = searchParams.get('page');

	const minPrice = minPriceParam ? Number(minPriceParam) : null;
	const maxPrice = maxPriceParam ? Number(maxPriceParam) : null;
	const page = pageParam ? Math.max(1, Number(pageParam) || 1) : 1;
	const rawTag = tagParam?.trim() ? tagParam.trim() : null;

	return {
		filter: VALID_FILTERS.includes(filterParam as BrowseCategory)
			? (filterParam as BrowseCategory)
			: 'all',
		q: searchParams.get('q')?.trim() ?? '',
		tag: rawTag ? normalizeFilterTag(rawTag) : null,
		minPrice: minPrice != null && !Number.isNaN(minPrice) ? minPrice : null,
		maxPrice: maxPrice != null && !Number.isNaN(maxPrice) ? maxPrice : null,
		inStock: searchParams.get('inStock') === 'true',
		sort: VALID_SORTS.includes(sortParam as BrowseSort) ? (sortParam as BrowseSort) : 'newest',
		page: Number.isNaN(page) ? 1 : page
	};
}

function filterToProductType(filter: BrowseCategory): string | null {
	switch (filter) {
		case 'products':
			return 'product';
		case 'spares':
			return 'spare';
		case 'flea_market':
			return 'flea-market';
		default:
			return null;
	}
}

function applyFilters(
	query: ProductQuery,
	filters: BrowseFilters,
	tagOptions: TagOption[],
	options?: { includeType?: boolean }
) {
	let next = query;

	if (options?.includeType !== false) {
		const productType = filterToProductType(filters.filter);
		if (productType) {
			next = next.eq('type', productType);
		}
	}

	if (filters.q) {
		const term = `%${filters.q.replace(/[%_]/g, '\\$&')}%`;
		next = next.or(`name.ilike.${term},author.ilike.${term}`);
	}

	if (filters.minPrice != null) {
		next = next.gte('price->new', filters.minPrice);
	}

	if (filters.maxPrice != null) {
		next = next.lte('price->new', filters.maxPrice);
	}

	if (filters.inStock) {
		next = next.or('stock->count.gt.0,stock->>status.ilike.%on-demand%');
	}

	next = applyTagFilter(next, filters.tag, tagOptions);

	return next;
}

function applySort(query: ProductQuery, sort: BrowseSort) {
	switch (sort) {
		case 'price_asc':
			return query.order('price->new', { ascending: true, nullsFirst: false });
		case 'price_desc':
			return query.order('price->new', { ascending: false, nullsFirst: false });
		default:
			return query.order('created_at', { ascending: false });
	}
}

async function getTagCatalog(supabase: SupabaseClient) {
	const result = await supabase.from('products').select('tags, type');

	if (result.error) {
		console.error('Failed to load tag options:', result.error);
		return { groups: [], standalone: [], allOptions: [] };
	}

	return buildTagGroups(result.data ?? []);
}

async function getCategoryCounts(supabase: SupabaseClient): Promise<CategoryCounts> {
	const [allResult, productsResult, sparesResult, fleaResult] = await Promise.all([
		supabase.from('products').select('*', { count: 'exact', head: true }),
		supabase.from('products').select('*', { count: 'exact', head: true }).eq('type', 'product'),
		supabase.from('products').select('*', { count: 'exact', head: true }).eq('type', 'spare'),
		supabase.from('products').select('*', { count: 'exact', head: true }).eq('type', 'flea-market')
	]);

	return {
		all: allResult.count ?? 0,
		products: productsResult.count ?? 0,
		spares: sparesResult.count ?? 0,
		flea_market: fleaResult.count ?? 0
	};
}

export const load: PageLoad = async ({ parent, url }) => {
	const { supabase_lt } = await parent();
	const filters = parseFilters(url.searchParams);

	const emptyResult = {
		products: [] as Product[],
		totalCount: 0,
		currentPage: filters.page,
		totalPages: 0,
		filters,
		categoryCounts: { all: 0, products: 0, spares: 0, flea_market: 0 } satisfies CategoryCounts,
		tagOptions: [] as TagOption[],
		tagGroups: [] as TagGroup[],
		standaloneTags: [] as TagOption[],
		allTagOptions: [] as TagOption[]
	};

	if (!supabase_lt) {
		return emptyResult;
	}

	const tagCatalog = await getTagCatalog(supabase_lt);
	const tagGroups = filterBrowsableTagGroups(tagCatalog.groups);
	const standaloneTags = filterBrowsableStandaloneTags(tagCatalog.standalone);
	const allTagOptions = tagCatalog.allOptions;
	const categoryCounts = await getCategoryCounts(supabase_lt);
	const activeFilters: BrowseFilters = {
		...filters,
		tag:
			filters.tag && allTagOptions.some((option) => option.key === filters.tag) ? filters.tag : null
	};

	let countQuery = supabase_lt.from('products').select(PRODUCT_SELECT, {
		count: 'exact',
		head: true
	});
	countQuery = applyFilters(countQuery, activeFilters, allTagOptions);

	const countResult = await countQuery;

	if (countResult.error) {
		console.error('Failed to count products:', countResult.error);
		return {
			...emptyResult,
			filters: activeFilters,
			categoryCounts,
			tagGroups,
			standaloneTags,
			allTagOptions
		};
	}

	const totalCount = countResult.count ?? 0;
	const totalPages = totalCount > 0 ? Math.ceil(totalCount / PAGE_SIZE) : 0;
	const currentPage = totalPages > 0 ? Math.min(filters.page, totalPages) : 1;

	let dataQuery = supabase_lt.from('products').select(PRODUCT_SELECT);
	dataQuery = applyFilters(dataQuery, activeFilters, allTagOptions);
	dataQuery = applySort(dataQuery, activeFilters.sort);

	const from = (currentPage - 1) * PAGE_SIZE;
	const to = from + PAGE_SIZE - 1;

	const [productsResult] = await Promise.all([dataQuery.range(from, to)]);

	if (productsResult.error) {
		console.error('Failed to load products:', productsResult.error);
		return {
			...emptyResult,
			filters: { ...activeFilters, page: currentPage },
			categoryCounts,
			tagGroups,
			standaloneTags,
			allTagOptions,
			currentPage,
			totalPages
		};
	}

	return {
		products: (productsResult.data ?? []) as Product[],
		totalCount,
		currentPage,
		totalPages,
		filters: { ...activeFilters, page: currentPage },
		categoryCounts,
		tagGroups,
		standaloneTags,
		allTagOptions
	};
};
