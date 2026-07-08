import { integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const printrequests = pgTable('printrequests', {
	id: uuid('id').primaryKey().defaultRandom(),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	lastUpdated: timestamp('last_updated', { withTimezone: true }),
	updateCount: integer('update_count'),
	userId: uuid('user_id'),
	creatorId: uuid('creator_id'),
	model: text('model'),
	modelMetadata: jsonb('model_metadata'),
	quoteUpdates: integer('quote_updates'),
	initialQuote: integer('initial_quote'),
	quote: integer('quote'),
	events: jsonb('events'),
	filamentColor: text('filament_color'),
	modelData: jsonb('model_data'),
	requestStage: text('request_stage'),
	requestMetadata: jsonb('request_metadata'),
	orderId: text('order_id'),
	paymentId: text('payment_id'),
	address: jsonb('address')
});
