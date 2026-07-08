import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getTableColumns, getTableName, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import { describe, expect, it } from 'vitest';
import { CART_ORDER_STATUS } from '../contracts/cart.js';
import { rupeesToPaise } from '../contracts/money.js';
import { cartItems } from './schema/cartItems.js';
import { carts } from './schema/carts.js';
import { orderItems } from './schema/orderItems.js';
import { ORDER_STATUS_VALUES, orders } from './schema/orders.js';

const migrationSql = readFileSync(
	resolve(import.meta.dirname, '../../drizzle/0001_cart_checkout_tables.sql'),
	'utf8'
);

describe('phase 2 cart/checkout schema', () => {
	it('exports carts mapped to the carts table', () => {
		expect(getTableName(carts)).toBe('carts');

		const columns = Object.keys(getTableColumns(carts));
		expect(columns).toEqual(
			expect.arrayContaining(['id', 'userId', 'clientId', 'status', 'createdAt', 'updatedAt'])
		);
		expect(carts.status).toBeDefined();
	});

	it('exports cart_items with composite key and no price column', () => {
		expect(getTableName(cartItems)).toBe('cart_items');

		const columns = Object.keys(getTableColumns(cartItems));
		expect(columns).toEqual(
			expect.arrayContaining(['cartId', 'productId', 'qty', 'createdAt', 'updatedAt'])
		);
		expect(columns).not.toContain('price');
	});

	it('exports orders with pricing, address, and razorpay columns', () => {
		expect(getTableName(orders)).toBe('orders');

		const columns = Object.keys(getTableColumns(orders));
		expect(columns).toEqual(
			expect.arrayContaining([
				'id',
				'cartId',
				'userId',
				'clientId',
				'status',
				'address',
				'subtotal',
				'deliveryFee',
				'total',
				'razorpayOrderId',
				'razorpayPaymentId',
				'createdAt',
				'updatedAt'
			])
		);
	});

	it('exports order_items snapshot columns', () => {
		expect(getTableName(orderItems)).toBe('order_items');

		const columns = Object.keys(getTableColumns(orderItems));
		expect(columns).toEqual(
			expect.arrayContaining(['orderId', 'productId', 'productName', 'unitPrice', 'qty'])
		);
	});

	it('uses cart status constants as the single source of truth', () => {
		expect(CART_ORDER_STATUS.ACTIVE).toBe('active');
		expect(ORDER_STATUS_VALUES).toEqual([
			CART_ORDER_STATUS.PAYMENT_PENDING,
			CART_ORDER_STATUS.PAID,
			CART_ORDER_STATUS.FAILED,
			CART_ORDER_STATUS.FULFILLED,
			CART_ORDER_STATUS.CANCELLED,
			CART_ORDER_STATUS.REFUNDED
		]);
	});

	it('converts rupees to paise at the Razorpay boundary', () => {
		expect(rupeesToPaise(499)).toBe(49900);
		expect(() => rupeesToPaise(9.99)).toThrow('rupees must be a whole-number integer');
	});

	it('emits ON CONFLICT ... WHERE for partial unique index targets', () => {
		const db = drizzle({} as never);
		const active = CART_ORDER_STATUS.ACTIVE;

		const userConflict = db
			.insert(carts)
			.values({ userId: '00000000-0000-0000-0000-000000000001', status: active })
			.onConflictDoNothing({
				target: carts.userId,
				where: sql`status = ${active} AND user_id IS NOT NULL`
			})
			.toSQL();

		expect(userConflict.sql).toMatch(/on conflict/i);
		expect(userConflict.sql).toMatch(/where/i);
		expect(userConflict.sql).toMatch(/status/i);
		expect(userConflict.sql).toMatch(/do nothing/i);

		const clientConflict = db
			.insert(carts)
			.values({ clientId: 'anon-1', status: active })
			.onConflictDoNothing({
				target: carts.clientId,
				where: sql`status = ${active} AND user_id IS NULL`
			})
			.toSQL();

		expect(clientConflict.sql).toMatch(/on conflict/i);
		expect(clientConflict.sql).toMatch(/where/i);
		expect(clientConflict.sql).toMatch(/user_id is null/i);
		expect(clientConflict.sql).toMatch(/do nothing/i);
	});

	it('migration SQL mirrors schema constraints and indexes', () => {
		expect(migrationSql).toContain(
			`CREATE UNIQUE INDEX IF NOT EXISTS "carts_active_user_id_idx" ON "carts" USING btree ("user_id") WHERE status = 'active' AND user_id IS NOT NULL`
		);
		expect(migrationSql).toContain(
			`CREATE UNIQUE INDEX IF NOT EXISTS "carts_active_client_id_idx" ON "carts" USING btree ("client_id") WHERE status = 'active' AND user_id IS NULL`
		);
		expect(migrationSql).toContain(
			'CONSTRAINT "carts_owner_check" CHECK ((user_id IS NOT NULL OR client_id IS NOT NULL))'
		);
		expect(migrationSql).toContain(
			`CONSTRAINT "carts_status_check" CHECK (status IN ('active', 'payment_pending', 'paid', 'failed', 'fulfilled', 'cancelled', 'refunded'))`
		);
		expect(migrationSql).toContain('CONSTRAINT "cart_items_qty_check" CHECK (qty > 0)');
		expect(migrationSql).toContain('CONSTRAINT "order_items_qty_check" CHECK (qty > 0)');
		expect(migrationSql).toContain(
			`CONSTRAINT "orders_status_check" CHECK (status IN ('payment_pending', 'paid', 'failed', 'fulfilled', 'cancelled', 'refunded'))`
		);
		expect(migrationSql).toContain(
			'CONSTRAINT "orders_razorpay_payment_id_unique" UNIQUE("razorpay_payment_id")'
		);
	});
});
