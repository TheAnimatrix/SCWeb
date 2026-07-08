import { sql } from 'drizzle-orm';
import { check, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { CART_ORDER_STATUS } from '../../contracts/cart.js';

export const CART_STATUS_VALUES = [
	CART_ORDER_STATUS.ACTIVE,
	CART_ORDER_STATUS.PAYMENT_PENDING,
	CART_ORDER_STATUS.PAID,
	CART_ORDER_STATUS.FAILED,
	CART_ORDER_STATUS.FULFILLED,
	CART_ORDER_STATUS.CANCELLED,
	CART_ORDER_STATUS.REFUNDED
] as const;

export type CartStatus = (typeof CART_STATUS_VALUES)[number];

export const carts = pgTable(
	'carts',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: uuid('user_id'),
		clientId: text('client_id'),
		status: text('status').notNull().default(CART_ORDER_STATUS.ACTIVE).$type<CartStatus>(),
		createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
			.notNull()
			.defaultNow()
	},
	(table) => [
		check('carts_owner_check', sql`(user_id IS NOT NULL OR client_id IS NOT NULL)`),
		check(
			'carts_status_check',
			sql`status IN ('active', 'payment_pending', 'paid', 'failed', 'fulfilled', 'cancelled', 'refunded')`
		),
		uniqueIndex('carts_active_user_id_idx')
			.on(table.userId)
			.where(sql`status = 'active' AND user_id IS NOT NULL`),
		uniqueIndex('carts_active_client_id_idx')
			.on(table.clientId)
			.where(sql`status = 'active' AND user_id IS NULL`)
	]
);
