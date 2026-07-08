import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

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
	createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow()
});
