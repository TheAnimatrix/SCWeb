import type { products } from '../db/schema/products.js';
import type { users } from '../db/schema/users.js';

export type ProductUserRef = {
	username?: string | null;
	tier?: number | string | null;
};

export type ProductView = {
	id: string;
	name: string;
	images: { url: string }[];
	tags: { tag: string }[];
	offer?: { offer_colorA: string; offer_colorB: string; offer_name: string };
	rating?: { count: number; rating: number };
	stock: { count: number; status: string };
	created_at: string;
	documentation?: { data: string; isMDUrl: boolean }[];
	faq?: { question: string; answer: string }[];
	uid: string;
	price: { old: number; new: number };
	author?: string;
	type: string;
	guarantee: string;
	rel: string;
	users: ProductUserRef | null;
};

export type ReviewView = {
	id: string;
	user_id: string;
	product_id: string;
	rating: number;
	comment: string | null;
	created_at: string;
	users?: { username?: string | null; tier?: number | string | null };
};

type ProductRow = typeof products.$inferSelect;
type UserRow = Pick<typeof users.$inferSelect, 'username' | 'tier'>;

export function mapProductRow(product: ProductRow, user?: UserRow | null): ProductView {
	return {
		id: product.id,
		name: product.name ?? '',
		images: (product.images ?? []) as ProductView['images'],
		tags: (product.tags ?? []) as ProductView['tags'],
		offer: product.offer ?? undefined,
		rating: product.rating ?? undefined,
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
