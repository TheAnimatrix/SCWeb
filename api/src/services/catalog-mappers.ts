import type { ProductView, ReviewView } from '../contracts/catalog.js';
import type { products } from '../db/schema/products.js';
import type { users } from '../db/schema/users.js';

export type { ProductView, ReviewView };

type ProductRow = typeof products.$inferSelect;
type UserRow = Pick<typeof users.$inferSelect, 'username' | 'tier'>;

/** Aggregated review numbers for one product, read from the `reviews` table. */
export interface ReviewStatsRow {
	average: number | string | null;
	count: number | string | null;
}

/**
 * Turns aggregated review numbers into the `rating` shape the front end reads.
 * Returns undefined when there are no reviews, so no card or panel shows a rating
 * the reviews tab can't back up.
 */
export function ratingFromReviewStats(
	stats: ReviewStatsRow | null | undefined
): ProductView['rating'] {
	const count = Number(stats?.count ?? 0);
	const average = Number(stats?.average ?? 0);
	if (!Number.isFinite(count) || count <= 0 || !Number.isFinite(average) || average <= 0) {
		return undefined;
	}
	return { rating: Math.round(average * 10) / 10, count };
}

/**
 * URL-safe product slug. Keep in sync with `productSlug()` in `src/lib/seo/product.ts`:
 * `/`, `?`, `#`, `\` and `%` would otherwise add path segments or cut the URL short.
 */
export function productSlug(name: string): string {
	return name
		.trim()
		.replace(/\s+/g, '_')
		.replace(/[/?#\\%]/g, '-')
		.replace(/_+/g, '_');
}

export function productHref(name: string, id: string): string {
	return `/${productSlug(name)}/craft/item=${id}`;
}

export function mapProductRow(
	product: ProductRow,
	user?: UserRow | null,
	reviewStats?: ReviewStatsRow | null
): ProductView {
	return {
		id: product.id,
		name: product.name ?? '',
		images: (product.images ?? []) as ProductView['images'],
		tags: (product.tags ?? []) as ProductView['tags'],
		offer: product.offer ?? undefined,
		rating: ratingFromReviewStats(reviewStats),
		stock: (product.stock ?? { count: 0, status: 'unknown' }) as ProductView['stock'],
		created_at: product.createdAt,
		documentation: product.documentation ?? undefined,
		faq: product.faq ?? undefined,
		uid: product.uid ?? '',
		price: (product.price ?? { old: 0, new: 0 }) as ProductView['price'],
		author: product.author ?? undefined,
		type: product.type ?? '',
		guarantee: product.guarantee ?? '',
		rel: product.rel ?? '',
		users: user
			? {
					username: user.username,
					tier: user.tier != null ? String(user.tier) : null
				}
			: null
	};
}

export function mapReviewRow(
	review: {
		id: string;
		userId: string;
		productId: string;
		rating: number;
		comment: string | null;
		createdAt: string;
	},
	user?: UserRow | null
): ReviewView {
	return {
		id: review.id,
		user_id: review.userId,
		product_id: review.productId,
		rating: review.rating,
		comment: review.comment,
		created_at: review.createdAt,
		users: user
			? {
					username: user.username,
					tier: user.tier != null ? String(user.tier) : null
				}
			: undefined
	};
}

export function parseProductIdFromBannerUrl(url: string): string | null {
	const match = url.match(/item=([^&]+)/);
	return match?.[1] ?? null;
}
