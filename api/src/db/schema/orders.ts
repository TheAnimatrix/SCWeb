import { sql } from 'drizzle-orm';
import {
	check,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid
} from 'drizzle-orm/pg-core';
import { CART_ORDER_STATUS } from '../../contracts/cart.js';
import { carts } from './carts.js';
import { paymentAttempts } from './paymentAttempts.js';

export const ORDER_STATUS_VALUES = [
	CART_ORDER_STATUS.PAYMENT_PENDING,
	CART_ORDER_STATUS.PAID,
	CART_ORDER_STATUS.FAILED,
	CART_ORDER_STATUS.FULFILLED,
	CART_ORDER_STATUS.CANCELLED,
	CART_ORDER_STATUS.REFUNDED
] as const;

export type OrderStatus = (typeof ORDER_STATUS_VALUES)[number];

export const orders = pgTable(
	'orders',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		cartId: uuid('cart_id')
			.notNull()
			.references(() => carts.id),
		userId: uuid('user_id'),
		clientId: text('client_id'),
		status: text('status').notNull().$type<OrderStatus>(),
		address: jsonb('address').notNull(),
		subtotalPaise: integer('subtotal_paise').notNull(),
		deliveryFeePaise: integer('delivery_fee_paise').notNull(),
		totalPaise: integer('total_paise').notNull(),
		activePaymentAttemptId: uuid('active_payment_attempt_id').references(() => paymentAttempts.id),
		createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
			.notNull()
			.defaultNow()
	},
	(table) => [
		check(
			'orders_status_check',
			sql`status IN ('payment_pending', 'paid', 'failed', 'fulfilled', 'cancelled', 'refunded')`
		),
		uniqueIndex('orders_one_paid_per_cart_idx')
			.on(table.cartId)
			.where(sql`status = 'paid'`)
	]
);
