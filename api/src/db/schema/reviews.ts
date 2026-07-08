import { integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const reviews = pgTable('reviews', {
	id: uuid('id').primaryKey().defaultRandom(),
	userId: uuid('user_id').notNull(),
	productId: uuid('product_id').notNull(),
	rating: integer('rating').notNull(),
	comment: text('comment'),
	createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow()
});
