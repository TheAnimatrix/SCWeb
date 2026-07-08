import {
	boolean,
	doublePrecision,
	jsonb,
	pgTable,
	serial,
	text,
	timestamp,
	uuid
} from 'drizzle-orm/pg-core';

export const purchases = pgTable('purchases', {
	id: serial('id').primaryKey(),
	amount: doublePrecision('amount'),
	billingAddress: jsonb('billing_address'),
	cartId: uuid('cart_id'),
	clientId: text('client_id'),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	paymentConfirmed: boolean('payment_confirmed'),
	paymentId: text('payment_id').notNull(),
	paymentIdB: text('payment_id_b'),
	paymentMethod: text('payment_method'),
	paymentSignature: text('payment_signature'),
	paymentStatus: text('payment_status'),
	shippingAddress: jsonb('shipping_address'),
	trackingCourier: text('trackingCourier'),
	trackingId: text('trackingId'),
	trackingUrl: text('trackingUrl'),
	uid: uuid('uid')
});
