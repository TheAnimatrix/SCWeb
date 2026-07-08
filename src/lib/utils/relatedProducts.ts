import type { Product } from '$lib/types/product';
import type { SupabaseClient } from '@supabase/supabase-js';
import { cn } from '$lib/utils';

const RELATED_LIMIT = 4;
const PRODUCT_SELECT = '*, users(username)';

function addUniqueProducts(
	related: Product[],
	seen: Set<string>,
	items: Product[] | null | undefined
) {
	if (!items) return;

	for (const item of items) {
		if (related.length >= RELATED_LIMIT) return;
		if (!item?.id || seen.has(item.id)) continue;
		seen.add(item.id);
		related.push(item);
	}
}

export async function fetchRelatedProducts(
	supabase: SupabaseClient,
	product: Product
): Promise<Product[]> {
	const seen = new Set<string>([product.id]);
	const related: Product[] = [];

	if (product.type === 'product') {
		const { data } = await supabase
			.from('products')
			.select(PRODUCT_SELECT)
			.eq('rel', product.id);
		addUniqueProducts(related, seen, data as Product[]);
	} else if (product.rel) {
		const [parentResult, siblingsResult] = await Promise.all([
			supabase.from('products').select(PRODUCT_SELECT).eq('id', product.rel).maybeSingle(),
			supabase.from('products').select(PRODUCT_SELECT).eq('rel', product.rel)
		]);

		if (parentResult.data) {
			addUniqueProducts(related, seen, [parentResult.data as Product]);
		}
		addUniqueProducts(related, seen, siblingsResult.data as Product[]);
	}

	if (related.length < RELATED_LIMIT && product.uid) {
		const { data } = await supabase
			.from('products')
			.select(PRODUCT_SELECT)
			.eq('uid', product.uid)
			.order('created_at', { ascending: false })
			.limit(RELATED_LIMIT + 5);
		addUniqueProducts(related, seen, data as Product[]);
	}

	if (related.length < RELATED_LIMIT && product.type) {
		const { data } = await supabase
			.from('products')
			.select(PRODUCT_SELECT)
			.eq('type', product.type)
			.order('created_at', { ascending: false })
			.limit(RELATED_LIMIT + 5);
		addUniqueProducts(related, seen, data as Product[]);
	}

	if (related.length < RELATED_LIMIT) {
		const { data } = await supabase
			.from('products')
			.select(PRODUCT_SELECT)
			.order('created_at', { ascending: false })
			.limit(RELATED_LIMIT + 5);
		addUniqueProducts(related, seen, data as Product[]);
	}

	return related;
}

export function relatedProductsLayoutClass(className?: string): string {
	return cn('flex flex-wrap gap-3 sm:gap-4', className);
}

/** Two-up on small screens; fixed ~224px cards from sm up (no grow). */
export function relatedProductItemClass(className?: string): string {
	return cn(
		'flex-[0_0_calc(50%-0.375rem)] sm:flex-[0_0_14rem]',
		className
	);
}
