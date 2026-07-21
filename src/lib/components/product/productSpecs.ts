import type { Product } from '$lib/types/product';

export function isOpenHardware(product: Product): boolean {
	return product.tags?.some((tag) => /open[\s-]?hardware/i.test(tag.tag)) ?? false;
}

export function formatTimeAgo(dateString: string): string {
	const diffMs = Date.now() - new Date(dateString).getTime();
	const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

	if (days < 1) return 'today';
	if (days === 1) return '1d ago';
	if (days < 30) return `${days}d ago`;

	const months = Math.floor(days / 30);
	if (months < 12) return `${months}mo ago`;

	const years = Math.floor(months / 12);
	return `${years}y ago`;
}
