import { sql } from 'drizzle-orm';
import { check, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { CART_ORDER_STATUS } from '../../contracts/cart.js';

export const carts2 = pgTable(
	'carts',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: uuid('user_id'),
		clientId: text('client_id'),
		status: text('status').notNull().default(CART_ORDER_STATUS.ACTIVE),
		createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
			.notNull()
			.defaultNow()
	},
	(table) => [
		check('carts_owner_check', sql`(user_id IS NOT NULL OR client_id IS NOT NULL)`),
		uniqueIndex('carts_active_user_id_idx')
			.on(table.userId)
			.where(sql`status = 'active' AND user_id IS NOT NULL`),
		uniqueIndex('carts_active_client_id_idx')
			.on(table.clientId)
			.where(sql`status = 'active' AND user_id IS NULL`)
	]
);
