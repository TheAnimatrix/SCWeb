import type { Product } from '$lib/types/product';

export function isOpenHardware(product: Product): boolean {
	return product.tags?.some((tag) => /open[\s-]?hardware/i.test(tag.tag)) ?? false;
}

/** "today", "yesterday", "5 days ago", "2 months ago", "1 year ago". */
export function formatTimeAgo(dateString: string): string {
	const diffMs = Date.now() - new Date(dateString).getTime();
	const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

	if (!Number.isFinite(days) || days < 1) return 'today';
	if (days === 1) return 'yesterday';
	if (days < 30) return `${days} days ago`;

	const months = Math.floor(days / 30);
	if (months < 12) return months === 1 ? '1 month ago' : `${months} months ago`;

	const years = Math.floor(months / 12);
	return years === 1 ? '1 year ago' : `${years} years ago`;
}
