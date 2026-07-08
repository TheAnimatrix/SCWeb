export type BrowseCategory = 'all' | 'products' | 'spares' | 'flea_market';
export type BrowseSort = 'newest' | 'price_asc' | 'price_desc';

export interface BrowseFilters {
	filter: BrowseCategory;
	q: string;
	tag: string | null;
	minPrice: number | null;
	maxPrice: number | null;
	inStock: boolean;
	sort: BrowseSort;
	page: number;
}

export interface CategoryCounts {
	all: number;
	products: number;
	spares: number;
	flea_market: number;
}

export interface TagOption {
	key: string;
	label: string;
	count: number;
	variants: string[];
}
