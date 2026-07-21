import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const LISTING_STATES = [
	'draft',
	'pending_review',
	'live',
	'paused',
	'rejected',
	'archived'
] as const;
export type ListingState = (typeof LISTING_STATES)[number];

export const products = pgTable('products', {
	id: uuid('id').primaryKey().defaultRandom(),
	name: text('name'),
	price: jsonb('price').$type<{ new: number; old: number }>(),
	stock: jsonb('stock').$type<{ count: number; status: string }>(),
	images: jsonb('images').$type<{ url: string }[]>(),
	author: text('author'),
	type: text('type'),
	guarantee: text('guarantee'),
	rel: text('rel'),
	tags: jsonb('tags').$type<{ tag: string }[]>(),
	offer: jsonb('offer').$type<{
		offer_colorA: string;
		offer_colorB: string;
		offer_name: string;
	}>(),
	rating: jsonb('rating').$type<{ count: number; rating: number }>(),
	documentation: jsonb('documentation').$type<{ data: string; isMDUrl: boolean }[]>(),
	faq: jsonb('faq').$type<{ question: string; answer: string }[]>(),
	uid: uuid('uid'),
	makerId: uuid('maker_id'),
	listingState: text('listing_state').notNull().default('draft'),
	createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow()
});
