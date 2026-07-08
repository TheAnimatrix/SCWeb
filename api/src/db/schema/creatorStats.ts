import { doublePrecision, integer, jsonb, pgTable, text, uuid } from 'drizzle-orm/pg-core';

export const creatorStats = pgTable('CreatorStats', {
	makerId: uuid('maker_id').primaryKey(),
	avgQuoteTime: text('avg_quote_time'),
	avgRating: doublePrecision('avg_rating'),
	completedOrders: integer('completed_orders'),
	materialsUsed: jsonb('materials_used')
});
