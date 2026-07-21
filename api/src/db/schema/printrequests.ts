import {
	bigint,
	doublePrecision,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	uuid
} from 'drizzle-orm/pg-core';
import { paymentAttempts } from './paymentAttempts.js';

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
	initialQuote: doublePrecision('initial_quote'),
	quote: bigint('quote', { mode: 'number' }),
	events: jsonb('events'),
	filamentColor: text('filament_color'),
	modelData: jsonb('model_data'),
	requestStage: text('request_stage'),
	requestMetadata: jsonb('request_metadata'),
	activePaymentAttemptId: uuid('active_payment_attempt_id').references(() => paymentAttempts.id),
	address: jsonb('address')
});
