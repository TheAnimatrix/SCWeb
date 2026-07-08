import { sql } from 'drizzle-orm';
import { check, integer, pgTable, primaryKey, timestamp, uuid } from 'drizzle-orm/pg-core';
import { carts2 } from './carts.js';
import { products } from './products.js';

export const cartItems = pgTable(
	'cart_items',
	{
		cartId: uuid('cart_id')
			.notNull()
			.references(() => carts2.id, { onDelete: 'cascade' }),
		productId: uuid('product_id')
			.notNull()
			.references(() => products.id),
		qty: integer('qty').notNull(),
		createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
			.notNull()
			.defaultNow()
	},
	(table) => [
		primaryKey({ columns: [table.cartId, table.productId] }),
		check('cart_items_qty_check', sql`qty > 0`)
	]
);
