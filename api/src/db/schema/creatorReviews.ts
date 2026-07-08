import { doublePrecision, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const creatorReviews = pgTable('CreatorReviews', {
	id: uuid('id').primaryKey().defaultRandom(),
	makerId: uuid('maker_id').notNull(),
	printRequestId: uuid('print_request_id').notNull(),
	userId: uuid('user_id').notNull(),
	rating: doublePrecision('rating').notNull(),
	comment: text('comment'),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});
