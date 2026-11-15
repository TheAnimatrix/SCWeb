import type { BrowseCategory, BrowseSort } from '$lib/types/browse';

const CATEGORIES: BrowseCategory[] = ['all', 'products', 'spares', 'flea_market'];
const SORTS: BrowseSort[] = ['newest', 'price_asc', 'price_desc'];

function parseNonNegative(value: string | null): number | null {
	if (value == null || value.trim() === '') return null;
	const parsed = Number(value);
	return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

/**
 * Drops or repairs malformed query params (`?minPrice=abc`, `?page=0`, unknown sort)
 * before they reach the API, which would reject the whole request with a 400.
 * Swaps min and max when they're reversed.
 */
export function sanitizeBrowseParams(input: URLSearchParams): URLSearchParams {
	const params = new URLSearchParams();

	const filter = input.get('filter');
	if (filter && CATEGORIES.includes(filter as BrowseCategory) && filter !== 'all') {
		params.set('filter', filter);
	}

	const q = input.get('q')?.trim();
	if (q) params.set('q', q);

	const tag = input.get('tag')?.trim();
	if (tag) params.set('tag', tag);

	let minPrice = parseNonNegative(input.get('minPrice'));
	let maxPrice = parseNonNegative(input.get('maxPrice'));
	if (minPrice != null && maxPrice != null && minPrice > maxPrice) {
		[minPrice, maxPrice] = [maxPrice, minPrice];
	}
	if (minPrice != null) params.set('minPrice', String(minPrice));
	if (maxPrice != null) params.set('maxPrice', String(maxPrice));

	if (input.get('inStock') === 'true') params.set('inStock', 'true');

	const sort = input.get('sort');
	if (sort && SORTS.includes(sort as BrowseSort) && sort !== 'newest') {
		params.set('sort', sort);
	}

	const page = Number(input.get('page'));
	if (Number.isInteger(page) && page > 1) params.set('page', String(page));

	return params;
}
