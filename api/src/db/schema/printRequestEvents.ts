import { integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { printrequests } from './printrequests.js';

export const printRequestEvents = pgTable('print_request_events', {
	id: uuid('id').primaryKey().defaultRandom(),
	printRequestId: uuid('print_request_id')
		.notNull()
		.references(() => printrequests.id, { onDelete: 'cascade' }),
	type: text('type').notNull(),
	actorUserId: uuid('actor_user_id'),
	actorRole: text('actor_role').notNull(),
	amountPaise: integer('amount_paise'),
	providerOrderId: text('provider_order_id'),
	providerPaymentId: text('provider_payment_id'),
	reason: text('reason'),
	metadata: jsonb('metadata'),
	createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
		.notNull()
		.defaultNow()
});
