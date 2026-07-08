import { integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const cart = pgTable('cart', {
	id: uuid('id').primaryKey().defaultRandom(),
	createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
	uid: uuid('uid'),
	list: jsonb('list'),
	price: integer('price'),
	status: text('status'),
	updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }),
	clientId: text('client_id'),
	address: text('address'),
	paymentIdA: text('payment_id_a'),
	paymentIdB: text('payment_id_b'),
	paymentSignature: text('payment_signature')
});
