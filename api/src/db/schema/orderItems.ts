import { sql } from 'drizzle-orm';
import { check, integer, pgTable, primaryKey, text, uuid } from 'drizzle-orm/pg-core';
import { orders } from './orders.js';

export const orderItems = pgTable(
	'order_items',
	{
		orderId: uuid('order_id')
			.notNull()
			.references(() => orders.id, { onDelete: 'cascade' }),
		productId: uuid('product_id').notNull(),
		productName: text('product_name').notNull(),
		unitPrice: integer('unit_price').notNull(),
		qty: integer('qty').notNull()
	},
	(table) => [
		primaryKey({ columns: [table.orderId, table.productId] }),
		check('order_items_qty_check', sql`qty > 0`)
	]
);
