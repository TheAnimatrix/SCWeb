import { PGlite } from '@electric-sql/pglite';
import { eq, and } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CART_ORDER_STATUS } from '../contracts/cart.js';
import type { CheckoutAddress } from '../contracts/address.js';
import type { CheckoutOrderAddresses } from '../contracts/checkout.js';
import { normalizeCheckoutOrderAddresses } from '../services/checkout.js';
import type { Database } from '../db/index.js';
import * as schema from '../db/schema/index.js';
import { cartItems } from '../db/schema/cartItems.js';
import { carts } from '../db/schema/carts.js';
import { orderItems } from '../db/schema/orderItems.js';
import { orders } from '../db/schema/orders.js';
import { products } from '../db/schema/products.js';
import { auditLog } from '../db/schema/auditLog.js';
import { createCheckoutStore } from './checkout-store.js';
import type { RazorpayClient } from './razorpay-client.js';

const CLIENT_A = 'client-a';
const CLIENT_B = 'client-b';
const PRODUCT_1 = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const PRODUCT_2 = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

const ADDRESS: CheckoutAddress = {
	name: 'Jane Doe',
	line1: '123 Example Street Block A',
	city: 'Bengaluru',
	pincode: '560001',
	state: 'Karnataka',
	phone: '9876543210'
};

function orderAddresses(
	shipping: CheckoutAddress = ADDRESS,
	billing: CheckoutAddress = shipping
): CheckoutOrderAddresses {
	return normalizeCheckoutOrderAddresses(shipping, billing);
}

const PRODUCTS_STUB_SQL = `
CREATE TABLE IF NOT EXISTS "products" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text,
	"price" jsonb,
	"stock" jsonb,
	"images" jsonb,
	"author" text,
	"type" text,
	"guarantee" text,
	"rel" text,
	"tags" jsonb,
	"offer" jsonb,
	"rating" jsonb,
	"documentation" jsonb,
	"faq" jsonb,
	"uid" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
`;

const migrationSql = readFileSync(
	resolve(import.meta.dirname, '../../drizzle/0001_cart_checkout_tables.sql'),
	'utf8'
);

const auditMigrationSql = readFileSync(
	resolve(import.meta.dirname, '../../drizzle/0004_audit_log.sql'),
	'utf8'
);

type TestDb = {
	client: PGlite;
	db: Database;
};

async function createTestDb(): Promise<TestDb> {
	const client = new PGlite();
	await client.exec(PRODUCTS_STUB_SQL);

	const statements = migrationSql
		.split('--> statement-breakpoint')
		.map((statement) => statement.trim())
		.filter(Boolean);

	for (const statement of statements) {
		await client.exec(statement);
	}

	const auditStatements = auditMigrationSql
		.split('--> statement-breakpoint')
		.map((statement) => statement.trim())
		.filter(Boolean);

	for (const statement of auditStatements) {
		await client.exec(statement);
	}

	const db = drizzle(client, { schema }) as unknown as Database;
	return { client, db };
}

async function seedProduct(
	db: Database,
	id: string,
	stockCount: number,
	name = 'Test product',
	status = 'in stock'
) {
	await db.insert(products).values({
		id,
		name,
		author: 'test_maker',
		guarantee: '7-day guarantee',
		price: { new: 100, old: 120 },
		stock: { count: stockCount, status },
		images: [{ url: 'https://example.com/item.png' }]
	});
}

async function seedGuestCartLine(db: Database, clientId: string, productId: string, qty: number) {
	const [guestCart] = await db
		.insert(carts)
		.values({ clientId, status: CART_ORDER_STATUS.ACTIVE })
		.returning();

	await db.insert(cartItems).values({
		cartId: guestCart.id,
		productId,
		qty
	});

	return guestCart;
}

function fakeRazorpay(overrides: Partial<RazorpayClient> = {}): RazorpayClient {
	return {
		createOrder: vi.fn(async (amountPaise, receipt) => ({
			id: `order_${receipt}`,
			amount: amountPaise,
			currency: 'INR'
		})),
		...overrides
	};
}

describe('CheckoutStore (PGlite)', () => {
	let testDb: TestDb;

	beforeEach(async () => {
		testDb = await createTestDb();
	});

	afterEach(async () => {
		await testDb.client.close();
	});

	it('creates order snapshots with live prices and totals', async () => {
		await seedProduct(testDb.db, PRODUCT_1, 5, 'Widget A');
		await seedProduct(testDb.db, PRODUCT_2, 5, 'Widget B', 'on demand');
		const cart = await seedGuestCartLine(testDb.db, CLIENT_A, PRODUCT_1, 2);
		await testDb.db.insert(cartItems).values({
			cartId: cart.id,
			productId: PRODUCT_2,
			qty: 1
		});

		const razorpay = fakeRazorpay();
		const store = createCheckoutStore(testDb.db, razorpay);
		const result = await store.createOrder({ userId: null, clientId: CLIENT_A }, orderAddresses());

		expect(result.ok).toBe(true);
		if (!result.ok) return;

		const orderRows = await testDb.db.select().from(orders);
		expect(orderRows).toHaveLength(1);
		expect(orderRows[0]).toMatchObject({
			subtotal: 300,
			deliveryFee: 99,
			total: 399,
			status: CART_ORDER_STATUS.PAYMENT_PENDING,
			razorpayOrderId: `order_${orderRows[0]!.id}`
		});

		const items = await testDb.db
			.select()
			.from(orderItems)
			.where(eq(orderItems.orderId, orderRows[0]!.id));
		expect(items).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					productId: PRODUCT_1,
					productName: 'Widget A',
					unitPrice: 100,
					qty: 2
				}),
				expect.objectContaining({
					productId: PRODUCT_2,
					productName: 'Widget B',
					unitPrice: 100,
					qty: 1
				})
			])
		);

		const cartRow = await testDb.db.select().from(carts).where(eq(carts.id, cart.id));
		expect(cartRow[0]?.status).toBe(CART_ORDER_STATUS.PAYMENT_PENDING);
		expect(razorpay.createOrder).toHaveBeenCalledWith(39900, orderRows[0]!.id);
	});

	it('confirms once and decrements stock exactly once', async () => {
		await seedProduct(testDb.db, PRODUCT_1, 5);
		await seedGuestCartLine(testDb.db, CLIENT_A, PRODUCT_1, 2);

		const razorpay = fakeRazorpay();
		const store = createCheckoutStore(testDb.db, razorpay);
		const created = await store.createOrder({ userId: null, clientId: CLIENT_A }, orderAddresses());
		expect(created.ok).toBe(true);
		if (!created.ok) return;

		const first = await store.confirmOrder(
			{ userId: null, clientId: CLIENT_A },
			created.response.razorpayOrderId,
			'pay_123'
		);
		const second = await store.confirmOrder(
			{ userId: null, clientId: CLIENT_A },
			created.response.razorpayOrderId,
			'pay_123'
		);

		expect(first).toEqual({ ok: true, response: { status: 'paid' } });
		expect(second).toEqual({ ok: true, response: { status: 'already_paid' } });

		const productRow = await testDb.db.select().from(products).where(eq(products.id, PRODUCT_1));
		expect(productRow[0]?.stock).toEqual({ count: 3, status: 'in stock' });

		const remainingItems = await testDb.db.select().from(cartItems);
		expect(remainingItems).toHaveLength(0);
	});

	it('rolls back on stock conflict during confirm', async () => {
		await seedProduct(testDb.db, PRODUCT_1, 2);
		const cart = await seedGuestCartLine(testDb.db, CLIENT_A, PRODUCT_1, 2);

		const razorpay = fakeRazorpay();
		const store = createCheckoutStore(testDb.db, razorpay);
		const created = await store.createOrder({ userId: null, clientId: CLIENT_A }, orderAddresses());
		expect(created.ok).toBe(true);
		if (!created.ok) return;

		await testDb.db
			.update(products)
			.set({ stock: { count: 1, status: 'in stock' } })
			.where(eq(products.id, PRODUCT_1));

		const result = await store.confirmOrder(
			{ userId: null, clientId: CLIENT_A },
			created.response.razorpayOrderId,
			'pay_conflict'
		);

		expect(result).toEqual({
			ok: false,
			status: 409,
			body: { error: 'stock_conflict' }
		});

		const orderRow = await testDb.db.select().from(orders);
		expect(orderRow[0]?.status).toBe(CART_ORDER_STATUS.PAYMENT_PENDING);
		expect(orderRow[0]?.razorpayPaymentId).toBeNull();

		const cartItemsLeft = await testDb.db
			.select()
			.from(cartItems)
			.where(eq(cartItems.cartId, cart.id));
		expect(cartItemsLeft).toHaveLength(1);
	});

	it('marks payment_pending orders and carts as failed', async () => {
		await seedProduct(testDb.db, PRODUCT_1, 5);
		const cart = await seedGuestCartLine(testDb.db, CLIENT_A, PRODUCT_1, 1);

		const store = createCheckoutStore(testDb.db, fakeRazorpay());
		const created = await store.createOrder({ userId: null, clientId: CLIENT_A }, orderAddresses());
		expect(created.ok).toBe(true);
		if (!created.ok) return;

		const result = await store.failOrder(
			{ userId: null, clientId: CLIENT_A },
			created.response.razorpayOrderId,
			'user_closed'
		);

		expect(result).toEqual({ ok: true, response: { status: CART_ORDER_STATUS.FAILED } });

		const orderRow = await testDb.db.select().from(orders);
		expect(orderRow[0]?.status).toBe(CART_ORDER_STATUS.FAILED);

		const cartRow = await testDb.db.select().from(carts).where(eq(carts.id, cart.id));
		expect(cartRow[0]?.status).toBe(CART_ORDER_STATUS.FAILED);

		const auditRows = await testDb.db.select().from(auditLog).where(eq(auditLog.action, 'failed'));
		expect(auditRows).toEqual([
			expect.objectContaining({
				entityType: 'order',
				action: 'failed',
				toState: CART_ORDER_STATUS.FAILED,
				meta: { reason: 'user_closed' }
			})
		]);
	});

	it('does not downgrade paid orders on fail', async () => {
		await seedProduct(testDb.db, PRODUCT_1, 5);
		await seedGuestCartLine(testDb.db, CLIENT_A, PRODUCT_1, 1);

		const store = createCheckoutStore(testDb.db, fakeRazorpay());
		const created = await store.createOrder({ userId: null, clientId: CLIENT_A }, orderAddresses());
		expect(created.ok).toBe(true);
		if (!created.ok) return;

		await store.confirmOrder(
			{ userId: null, clientId: CLIENT_A },
			created.response.razorpayOrderId,
			'pay_paid'
		);

		const result = await store.failOrder(
			{ userId: null, clientId: CLIENT_A },
			created.response.razorpayOrderId
		);

		expect(result).toEqual({ ok: true, response: { status: CART_ORDER_STATUS.PAID } });

		const orderRow = await testDb.db.select().from(orders);
		expect(orderRow[0]?.status).toBe(CART_ORDER_STATUS.PAID);
	});

	it('concurrent confirm decrements stock exactly once', async () => {
		await seedProduct(testDb.db, PRODUCT_1, 5);
		await seedGuestCartLine(testDb.db, CLIENT_A, PRODUCT_1, 2);

		const store = createCheckoutStore(testDb.db, fakeRazorpay());
		const created = await store.createOrder({ userId: null, clientId: CLIENT_A }, orderAddresses());
		expect(created.ok).toBe(true);
		if (!created.ok) return;

		const actor = { userId: null, clientId: CLIENT_A };
		const [first, second] = await Promise.all([
			store.confirmOrder(actor, created.response.razorpayOrderId, 'pay_a'),
			store.confirmOrder(actor, created.response.razorpayOrderId, 'pay_b')
		]);

		const statuses = [first, second].map((result) =>
			result.ok ? result.response.status : 'error'
		);
		expect(statuses).toContain('paid');
		expect(statuses).toContain('already_paid');

		const productRow = await testDb.db.select().from(products).where(eq(products.id, PRODUCT_1));
		expect(productRow[0]?.stock).toEqual({ count: 3, status: 'in stock' });
	});

	it('retries Razorpay order creation after SDK failure', async () => {
		await seedProduct(testDb.db, PRODUCT_1, 5);
		await seedGuestCartLine(testDb.db, CLIENT_A, PRODUCT_1, 1);

		const createOrder = vi
			.fn()
			.mockRejectedValueOnce(new Error('razorpay unavailable'))
			.mockImplementation(async (amountPaise: number, receipt: string) => ({
				id: `order_${receipt}`,
				amount: amountPaise,
				currency: 'INR'
			}));

		const store = createCheckoutStore(testDb.db, { createOrder });
		const actor = { userId: null, clientId: CLIENT_A };

		const first = await store.createOrder(actor, orderAddresses());
		expect(first).toEqual({ ok: false, status: 500, body: { error: 'razorpay_order_failed' } });

		const orderAfterFailure = await testDb.db.select().from(orders);
		expect(orderAfterFailure[0]).toMatchObject({
			status: CART_ORDER_STATUS.PAYMENT_PENDING,
			razorpayOrderId: null
		});

		const second = await store.createOrder(actor, orderAddresses());
		expect(second.ok).toBe(true);
		if (!second.ok) return;

		expect(createOrder).toHaveBeenCalledTimes(2);
		expect(second.response.razorpayOrderId).toMatch(/^order_/);

		const orderAfterRetry = await testDb.db.select().from(orders);
		expect(orderAfterRetry[0]?.razorpayOrderId).toBe(second.response.razorpayOrderId);
	});

	it('rejects confirm and fail from another actor', async () => {
		await seedProduct(testDb.db, PRODUCT_1, 5);
		await seedGuestCartLine(testDb.db, CLIENT_A, PRODUCT_1, 1);

		const store = createCheckoutStore(testDb.db, fakeRazorpay());
		const created = await store.createOrder({ userId: null, clientId: CLIENT_A }, orderAddresses());
		expect(created.ok).toBe(true);
		if (!created.ok) return;

		const otherActor = { userId: null, clientId: CLIENT_B };

		const confirmResult = await store.confirmOrder(
			otherActor,
			created.response.razorpayOrderId,
			'pay_other'
		);
		expect(confirmResult).toEqual({
			ok: false,
			status: 403,
			body: { error: 'forbidden' }
		});

		const failResult = await store.failOrder(
			otherActor,
			created.response.razorpayOrderId,
			'user_closed'
		);
		expect(failResult).toEqual({
			ok: false,
			status: 403,
			body: { error: 'forbidden' }
		});
	});

	it('reuses Razorpay order when re-entering with unchanged total', async () => {
		await seedProduct(testDb.db, PRODUCT_1, 5, 'Widget A');
		const cart = await seedGuestCartLine(testDb.db, CLIENT_A, PRODUCT_1, 2);

		const createOrder = vi.fn(async (amountPaise: number, receipt: string) => ({
			id: `order_${receipt}`,
			amount: amountPaise,
			currency: 'INR'
		}));
		const store = createCheckoutStore(testDb.db, { createOrder });
		const actor = { userId: null, clientId: CLIENT_A };

		const first = await store.createOrder(actor, orderAddresses());
		expect(first.ok).toBe(true);
		if (!first.ok) return;

		const updatedAddress = { ...ADDRESS, name: 'John Smith' };
		const second = await store.createOrder(actor, orderAddresses(updatedAddress));
		expect(second.ok).toBe(true);
		if (!second.ok) return;

		expect(second.response.razorpayOrderId).toBe(first.response.razorpayOrderId);
		expect(createOrder).toHaveBeenCalledTimes(1);

		const orderRow = await testDb.db.select().from(orders);
		expect(orderRow[0]).toMatchObject({
			subtotal: 200,
			deliveryFee: 99,
			total: 299
		});
		expect(orderRow[0]?.address).toEqual(orderAddresses(updatedAddress));

		const items = await testDb.db
			.select()
			.from(orderItems)
			.where(eq(orderItems.orderId, orderRow[0]!.id));
		expect(items).toEqual([
			expect.objectContaining({
				productId: PRODUCT_1,
				productName: 'Widget A',
				unitPrice: 100,
				qty: 2
			})
		]);

		const cartRow = await testDb.db.select().from(carts).where(eq(carts.id, cart.id));
		expect(cartRow[0]?.status).toBe(CART_ORDER_STATUS.PAYMENT_PENDING);

		const updatedAuditRows = await testDb.db
			.select()
			.from(auditLog)
			.where(eq(auditLog.action, 'updated'));
		expect(updatedAuditRows).toEqual([
			expect.objectContaining({
				entityType: 'order',
				action: 'updated',
				meta: { addressChanged: true }
			})
		]);
	});

	it('creates a new Razorpay order when re-entering with changed total', async () => {
		await seedProduct(testDb.db, PRODUCT_1, 5);
		const cart = await seedGuestCartLine(testDb.db, CLIENT_A, PRODUCT_1, 1);

		let razorpayCall = 0;
		const createOrder = vi.fn(async (amountPaise: number, receipt: string) => {
			razorpayCall += 1;
			return {
				id: `order_${receipt}_v${razorpayCall}`,
				amount: amountPaise,
				currency: 'INR'
			};
		});
		const store = createCheckoutStore(testDb.db, { createOrder });
		const actor = { userId: null, clientId: CLIENT_A };

		const first = await store.createOrder(actor, orderAddresses());
		expect(first.ok).toBe(true);
		if (!first.ok) return;

		await testDb.db
			.update(cartItems)
			.set({ qty: 2 })
			.where(and(eq(cartItems.cartId, cart.id), eq(cartItems.productId, PRODUCT_1)));

		const second = await store.createOrder(actor, orderAddresses());
		expect(second.ok).toBe(true);
		if (!second.ok) return;

		expect(second.response.razorpayOrderId).not.toBe(first.response.razorpayOrderId);
		expect(createOrder).toHaveBeenCalledTimes(2);
		expect(createOrder).toHaveBeenLastCalledWith(29900, expect.any(String));

		const orderRow = await testDb.db.select().from(orders);
		expect(orderRow[0]).toMatchObject({
			subtotal: 200,
			total: 299,
			razorpayOrderId: second.response.razorpayOrderId
		});

		const updatedAuditRows = await testDb.db
			.select()
			.from(auditLog)
			.where(eq(auditLog.action, 'updated'));
		expect(updatedAuditRows).toEqual([
			expect.objectContaining({
				entityType: 'order',
				action: 'updated',
				meta: {
					addressChanged: false,
					previousTotal: 199,
					total: 299
				}
			})
		]);
	});

	it('writes an audit row when checkout is confirmed', async () => {
		await seedProduct(testDb.db, PRODUCT_1, 5);
		await seedGuestCartLine(testDb.db, CLIENT_A, PRODUCT_1, 1);

		const store = createCheckoutStore(testDb.db, fakeRazorpay());
		const created = await store.createOrder({ userId: null, clientId: CLIENT_A }, orderAddresses());
		expect(created.ok).toBe(true);
		if (!created.ok) return;

		const confirmed = await store.confirmOrder(
			{ userId: null, clientId: CLIENT_A },
			created.response.razorpayOrderId,
			'pay_audit'
		);
		expect(confirmed).toEqual({ ok: true, response: { status: 'paid' } });

		const rows = await testDb.db.select().from(auditLog);
		expect(rows).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					entityType: 'order',
					action: 'created'
				}),
				expect.objectContaining({
					entityType: 'order',
					action: 'paid',
					toState: CART_ORDER_STATUS.PAID,
					providerIds: {
						razorpayOrderId: created.response.razorpayOrderId,
						razorpayPaymentId: 'pay_audit'
					}
				})
			])
		);
	});

	it('stores separate billing and shipping addresses when provided', async () => {
		await seedProduct(testDb.db, PRODUCT_1, 5, 'Widget A');
		await seedGuestCartLine(testDb.db, CLIENT_A, PRODUCT_1, 1);

		const billingAddress: CheckoutAddress = {
			...ADDRESS,
			name: 'Billing Contact',
			line1: '456 Billing Avenue Block B'
		};

		const store = createCheckoutStore(testDb.db, fakeRazorpay());
		const result = await store.createOrder(
			{ userId: null, clientId: CLIENT_A },
			orderAddresses(ADDRESS, billingAddress)
		);

		expect(result.ok).toBe(true);
		if (!result.ok) return;

		const [orderRow] = await testDb.db.select().from(orders);
		expect(orderRow?.address).toEqual(orderAddresses(ADDRESS, billingAddress));
	});

	it('rolls back audit rows when confirm transaction fails', async () => {
		await seedProduct(testDb.db, PRODUCT_1, 2);
		await seedGuestCartLine(testDb.db, CLIENT_A, PRODUCT_1, 2);

		const store = createCheckoutStore(testDb.db, fakeRazorpay());
		const created = await store.createOrder({ userId: null, clientId: CLIENT_A }, orderAddresses());
		expect(created.ok).toBe(true);
		if (!created.ok) return;

		await testDb.db
			.update(products)
			.set({ stock: { count: 1, status: 'in stock' } })
			.where(eq(products.id, PRODUCT_1));

		const result = await store.confirmOrder(
			{ userId: null, clientId: CLIENT_A },
			created.response.razorpayOrderId,
			'pay_rollback'
		);

		expect(result).toEqual({
			ok: false,
			status: 409,
			body: { error: 'stock_conflict' }
		});

		const paidAuditRows = await testDb.db
			.select()
			.from(auditLog)
			.where(eq(auditLog.action, 'paid'));
		expect(paidAuditRows).toHaveLength(0);
	});
});
