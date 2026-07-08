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
import { carts2 } from './carts.js';

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
			.references(() => carts2.id),
		userId: uuid('user_id'),
		clientId: text('client_id'),
		status: text('status').notNull().$type<OrderStatus>(),
		address: jsonb('address').notNull(),
		subtotal: integer('subtotal').notNull(),
		deliveryFee: integer('delivery_fee').notNull(),
		total: integer('total').notNull(),
		razorpayOrderId: text('razorpay_order_id').unique(),
		razorpayPaymentId: text('razorpay_payment_id'),
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
