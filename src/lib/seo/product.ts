import type { Product } from '$lib/types/product';
import { absoluteUrl } from './site';

export function productSlug(name: string): string {
	return name.replaceAll(' ', '_');
}

export function productPath(product: Pick<Product, 'id' | 'name'>): string {
	return `/${productSlug(product.name)}/craft/item=${product.id}`;
}

export function productUrl(product: Pick<Product, 'id' | 'name'>, origin?: string): string {
	return absoluteUrl(productPath(product), origin);
}

export function stripMarkup(text: string): string {
	return text
		.replace(/<[^>]+>/g, ' ')
		.replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
		.replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
		.replace(/[#*_`~>|]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

export function productDescription(product: Product, maxLength = 160): string {
	const raw = product.documentation?.[0]?.data;
	if (raw) {
		const plain = stripMarkup(raw);
		if (plain) {
			return plain.length > maxLength ? `${plain.slice(0, maxLength - 1).trim()}…` : plain;
		}
	}

	const tags = product.tags?.map((tag) => tag.tag).filter(Boolean).slice(0, 3);
	const tagSuffix = tags?.length ? ` — ${tags.join(', ')}` : '';
	const base = `Buy ${product.name} on Selfcrafted India${tagSuffix}.`;
	return base.length > maxLength ? `${base.slice(0, maxLength - 1).trim()}…` : base;
}

export function productImageUrl(product: Product, origin?: string): string | undefined {
	const url = product.images?.[0]?.url;
	if (!url) return undefined;
	if (url.startsWith('http://') || url.startsWith('https://')) return url;
	return absoluteUrl(url, origin);
}

export function productOgImagePath(productId: string): string {
	return `/og/product/${productId}`;
}

export function productOgImageUrl(product: Pick<Product, 'id'>, origin?: string): string {
	return absoluteUrl(productOgImagePath(product.id), origin);
}

export function productAvailability(product: Product): 'InStock' | 'OutOfStock' {
	const count = product.stock?.count ?? 0;
	const status = product.stock?.status?.toLowerCase() ?? '';
	if (count > 0 || status === 'in_stock' || status === 'available') return 'InStock';
	return 'OutOfStock';
}
