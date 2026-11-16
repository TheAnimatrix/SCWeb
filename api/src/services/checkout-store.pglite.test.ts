import { PGlite } from '@electric-sql/pglite';
import { eq, and } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { CART_ORDER_STATUS } from '../contracts/cart.js';
import type { CheckoutAddress } from '../contracts/address.js';
import type { CheckoutOrderAddresses } from '../contracts/checkout.js';
import { normalizeCheckoutOrderAddresses } from '../services/checkout.js';
import type { Database } from '../db/index.js';
import * as schema from '../db/schema/index.js';
import { applyInterestMigration } from '../test/interest-tables.js';
import { cartItems } from '../db/schema/cartItems.js';
import { carts } from '../db/schema/carts.js';
import { orderItems } from '../db/schema/orderItems.js';
import { orders } from '../db/schema/orders.js';
import { products } from '../db/schema/products.js';
import { auditLog } from '../db/schema/auditLog.js';
import { paymentAttempts } from '../db/schema/paymentAttempts.js';
import {
	createCheckoutStore,
	failPendingAttempt,
	lockCartOrderForPayment,
	settleCartPayment
} from './checkout-store.js';
import { abandonPaymentPendingCart, reactivatePaymentPendingCart } from './abandoned-checkout.js';
import { lookupCapturedPayment, type RazorpayClient } from './razorpay-client.js';
import { createRazorpayWebhookService } from './razorpay-webhooks.js';
import type { MailService } from './mail.js';

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
	"maker_id" uuid,
	"listing_state" text NOT NULL DEFAULT 'live',
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

const paymentAttemptsMigrationSql = readFileSync(
	resolve(import.meta.dirname, '../../drizzle/0005_payment_attempts.sql'),
	'utf8'
);

const paiseMigrationSql = readFileSync(
	resolve(import.meta.dirname, '../../drizzle/0006_money_paise.sql'),
	'utf8'
);

async function execMigrationStatements(client: PGlite, sql: string) {
	const statements = sql
		.split('--> statement-breakpoint')
		.map((statement) => statement.trim())
		.filter(Boolean);

	for (const statement of statements) {
		await client.exec(statement);
	}
}

type TestDb = {
	client: PGlite;
	db: Database;
};

const PRINTREQUESTS_STUB_SQL = `
CREATE TABLE IF NOT EXISTS "printrequests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL
);
`;

async function createTestDb(): Promise<TestDb> {
	const client = new PGlite();
	await client.exec(PRODUCTS_STUB_SQL);
	await client.exec(PRINTREQUESTS_STUB_SQL);

	const statements = migrationSql
		.split('--> statement-breakpoint')
		.map((statement) => statement.trim())
		.filter(Boolean);

	for (const statement of statements) {
		await client.exec(statement);
	}

	await execMigrationStatements(client, auditMigrationSql);
	await execMigrationStatements(client, paymentAttemptsMigrationSql);
	await execMigrationStatements(client, paiseMigrationSql);

	await applyInterestMigration(client);
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
	const baseCreateOrder = vi.fn(async (amountPaise: number, receipt: string) => ({
		id: `order_${receipt}`,
		amount: amountPaise,
		currency: 'INR'
	}));
	const createOrder = (overrides.createOrder ?? baseCreateOrder) as Mock<
		RazorpayClient['createOrder']
	>;
	const fetchOrder =
		overrides.fetchOrder ??
		vi.fn(async (orderId: string) => {
			for (const result of createOrder.mock.results) {
				if (result.type !== 'return') continue;
				const order = await result.value;
				if (order.id === orderId) return order;
			}
			return null;
		});

	return { createOrder, fetchOrder };
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
			subtotalPaise: 30000,
			deliveryFeePaise: 9900,
			totalPaise: 39900,
			status: CART_ORDER_STATUS.PAYMENT_PENDING
		});
		expect(orderRows[0]?.activePaymentAttemptId).toBeTruthy();

		const [attempt] = await testDb.db.select().from(paymentAttempts);
		expect(attempt?.providerOrderId).toBe(`order_${orderRows[0]!.id}`);

		const items = await testDb.db
			.select()
			.from(orderItems)
			.where(eq(orderItems.orderId, orderRows[0]!.id));
		expect(items).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					productId: PRODUCT_1,
					productName: 'Widget A',
					unitPricePaise: 10000,
					qty: 2
				}),
				expect.objectContaining({
					productId: PRODUCT_2,
					productName: 'Widget B',
					unitPricePaise: 10000,
					qty: 1
				})
			])
		);

		const cartRow = await testDb.db.select().from(carts).where(eq(carts.id, cart.id));
		expect(cartRow[0]?.status).toBe(CART_ORDER_STATUS.PAYMENT_PENDING);
		expect(razorpay.createOrder).toHaveBeenCalledWith(39900, orderRows[0]!.id);
	});

	it('charges the active cart when an abandoned payment_pending cart also exists', async () => {
		await seedProduct(testDb.db, PRODUCT_1, 5, 'Widget A');
		await seedProduct(testDb.db, PRODUCT_2, 5, 'Widget B');

		const pendingCart = await seedGuestCartLine(testDb.db, CLIENT_A, PRODUCT_1, 2);
		await testDb.db.insert(cartItems).values({
			cartId: pendingCart.id,
			productId: PRODUCT_2,
			qty: 1
		});
		await testDb.db
			.update(carts)
			.set({ status: CART_ORDER_STATUS.PAYMENT_PENDING })
			.where(eq(carts.id, pendingCart.id));

		const [pendingOrder] = await testDb.db
			.insert(orders)
			.values({
				cartId: pendingCart.id,
				clientId: CLIENT_A,
				status: CART_ORDER_STATUS.PAYMENT_PENDING,
				address: { shipping: ADDRESS, billing: ADDRESS },
				subtotalPaise: 30000,
				deliveryFeePaise: 9900,
				totalPaise: 39900
			})
			.returning();

		const activeCart = await seedGuestCartLine(testDb.db, CLIENT_A, PRODUCT_1, 1);

		const razorpay = fakeRazorpay();
		const store = createCheckoutStore(testDb.db, razorpay);
		const result = await store.createOrder({ userId: null, clientId: CLIENT_A }, orderAddresses());

		expect(result.ok).toBe(true);
		if (!result.ok) return;

		expect(result.response.totalRupees).toBe(199);
		expect(result.response.amountPaise).toBe(19900);
		expect(razorpay.createOrder).toHaveBeenCalledWith(19900, expect.any(String));

		const orderRows = await testDb.db.select().from(orders);
		const activeOrder = orderRows.find((row) => row.cartId === activeCart.id);
		expect(activeOrder).toBeTruthy();
		expect(activeOrder?.id).not.toBe(pendingOrder.id);
	});

	it('editing the cart after its payment was captured leaves the paid order alone', async () => {
		// Simulates: the buyer changes the cart in another tab at the moment the capture lands.
		// The abandon helpers used to read the pending order, then write by id, which could
		// set a just-paid order and attempt back to failed and reopen a paid cart.
		await seedProduct(testDb.db, PRODUCT_1, 5);
		const cart = await seedGuestCartLine(testDb.db, CLIENT_A, PRODUCT_1, 2);
		const actor = { userId: null, clientId: CLIENT_A };

		const razorpay = fakeRazorpay();
		const store = createCheckoutStore(testDb.db, razorpay);
		const created = await store.createOrder(actor, orderAddresses());
		expect(created.ok).toBe(true);
		if (!created.ok) return;

		const confirmed = await store.confirmOrder(actor, created.response.razorpayOrderId, 'pay_1');
		expect(confirmed.ok).toBe(true);

		// The stale request still believes this cart is waiting for payment.
		const reactivated = await reactivatePaymentPendingCart(testDb.db, actor, { id: cart.id });
		await abandonPaymentPendingCart(testDb.db, actor, cart.id, 'checkout_resumed');

		expect(reactivated).toBeNull();
		const [order] = await testDb.db.select().from(orders).where(eq(orders.cartId, cart.id));
		expect(order?.status).toBe(CART_ORDER_STATUS.PAID);
		const [attempt] = await testDb.db
			.select()
			.from(paymentAttempts)
			.where(eq(paymentAttempts.providerOrderId, created.response.razorpayOrderId));
		expect(attempt?.status).toBe('paid');
		const [cartRow] = await testDb.db.select().from(carts).where(eq(carts.id, cart.id));
		expect(cartRow?.status).not.toBe(CART_ORDER_STATUS.ACTIVE);
		expect(cartRow?.status).not.toBe(CART_ORDER_STATUS.FAILED);

		// A re-delivered confirm is still the same paid order, with stock taken once.
		const again = await store.confirmOrder(actor, created.response.razorpayOrderId, 'pay_1');
		expect(again.ok).toBe(true);
		const [product] = await testDb.db.select().from(products).where(eq(products.id, PRODUCT_1));
		expect((product?.stock as { count: number }).count).toBe(3);
	});

	it('editing a cart that is still waiting for payment fails its order and reopens it', async () => {
		await seedProduct(testDb.db, PRODUCT_1, 5);
		const cart = await seedGuestCartLine(testDb.db, CLIENT_A, PRODUCT_1, 2);
		const actor = { userId: null, clientId: CLIENT_A };

		const store = createCheckoutStore(testDb.db, fakeRazorpay());
		const created = await store.createOrder(actor, orderAddresses());
		expect(created.ok).toBe(true);
		if (!created.ok) return;

		const reactivated = await reactivatePaymentPendingCart(testDb.db, actor, { id: cart.id });

		expect(reactivated?.status).toBe(CART_ORDER_STATUS.ACTIVE);
		const [order] = await testDb.db.select().from(orders).where(eq(orders.cartId, cart.id));
		expect(order?.status).toBe(CART_ORDER_STATUS.FAILED);
		const [attempt] = await testDb.db
			.select()
			.from(paymentAttempts)
			.where(eq(paymentAttempts.providerOrderId, created.response.razorpayOrderId));
		expect(attempt?.status).toBe('failed');
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

		expect(first).toEqual({ ok: true, response: { status: 'paid', orderId: expect.any(String) } });
		expect(second).toEqual({
			ok: true,
			response: { status: 'already_paid', orderId: expect.any(String) }
		});

		const productRow = await testDb.db.select().from(products).where(eq(products.id, PRODUCT_1));
		expect(productRow[0]?.stock).toEqual({ count: 3, status: 'in stock' });

		const remainingItems = await testDb.db.select().from(cartItems);
		expect(remainingItems).toHaveLength(0);
	});

	it('persists payment evidence on stock conflict during confirm', async () => {
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
			body: { error: 'stock_conflict', orderId: expect.any(String) }
		});

		const orderRow = await testDb.db.select().from(orders);
		expect(orderRow[0]?.status).toBe(CART_ORDER_STATUS.PAID);
		const [attempt] = await testDb.db
			.select()
			.from(paymentAttempts)
			.where(eq(paymentAttempts.providerOrderId, created.response.razorpayOrderId));
		expect(attempt?.status).toBe('paid');
		expect(attempt?.providerPaymentId).toBe('pay_conflict');

		const cartItemsLeft = await testDb.db
			.select()
			.from(cartItems)
			.where(eq(cartItems.cartId, cart.id));
		expect(cartItemsLeft).toHaveLength(0);

		const cartRow = await testDb.db.select().from(carts).where(eq(carts.id, cart.id));
		expect(cartRow[0]?.status).toBe(CART_ORDER_STATUS.PAID);

		const stockConflictAudit = await testDb.db
			.select()
			.from(auditLog)
			.where(eq(auditLog.action, 'paid_stock_conflict'));
		expect(stockConflictAudit).toEqual([
			expect.objectContaining({
				entityType: 'order',
				toState: CART_ORDER_STATUS.PAID,
				providerIds: {
					razorpayOrderId: created.response.razorpayOrderId,
					razorpayPaymentId: 'pay_conflict'
				},
				meta: {
					productId: PRODUCT_1,
					qty: 2,
					requiresManualSupport: true
				}
			})
		]);
	});

	it('keeps reporting the stock conflict on a repeated confirm', async () => {
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

		const first = await store.confirmOrder(
			{ userId: null, clientId: CLIENT_A },
			created.response.razorpayOrderId,
			'pay_conflict_dup'
		);
		const second = await store.confirmOrder(
			{ userId: null, clientId: CLIENT_A },
			created.response.razorpayOrderId,
			'pay_conflict_dup'
		);

		expect(first).toEqual({
			ok: false,
			status: 409,
			body: { error: 'stock_conflict', orderId: expect.any(String) }
		});
		expect(second).toEqual({
			ok: false,
			status: 409,
			body: { error: 'stock_conflict', orderId: expect.any(String) }
		});
	});

	it('returns order status only to the order owner', async () => {
		await seedProduct(testDb.db, PRODUCT_1, 5);
		await seedGuestCartLine(testDb.db, CLIENT_A, PRODUCT_1, 2);

		const store = createCheckoutStore(testDb.db, fakeRazorpay());
		const owner = { userId: null, clientId: CLIENT_A };
		const created = await store.createOrder(owner, orderAddresses());
		expect(created.ok).toBe(true);
		if (!created.ok) return;

		const pending = await store.getOrderStatus(owner, {
			razorpayOrderId: created.response.razorpayOrderId
		});
		expect(pending).toMatchObject({
			kind: 'cart_order',
			orderId: created.response.orderId,
			status: CART_ORDER_STATUS.PAYMENT_PENDING
		});

		const confirmed = await store.confirmOrder(
			owner,
			created.response.razorpayOrderId,
			'pay_status'
		);
		expect(confirmed).toEqual({
			ok: true,
			response: { status: 'paid', orderId: created.response.orderId }
		});

		const status = await store.getOrderStatus(owner, { paymentId: 'pay_status' });
		expect(status).toMatchObject({
			kind: 'cart_order',
			orderId: created.response.orderId,
			status: CART_ORDER_STATUS.PAID,
			items: [expect.objectContaining({ productId: PRODUCT_1, qty: 2 })],
			shipping: expect.objectContaining({ name: 'Jane Doe', city: 'Bengaluru' })
		});

		await expect(
			store.getOrderStatus({ userId: null, clientId: CLIENT_B }, { paymentId: 'pay_status' })
		).resolves.toBeNull();
		await expect(
			store.getOrderStatus(
				{ userId: '11111111-1111-4111-8111-111111111111', clientId: CLIENT_A },
				{ paymentId: 'pay_status' }
			)
		).resolves.toBeNull();
		await expect(store.getOrderStatus(owner, { paymentId: 'pay_unknown' })).resolves.toBeNull();
	});

	it("does not reveal whether someone else's payment ID exists", async () => {
		await seedProduct(testDb.db, PRODUCT_1, 9);
		const store = createCheckoutStore(testDb.db, fakeRazorpay());

		// Buyer B pays for their own order.
		const buyerB = { userId: null, clientId: CLIENT_B };
		await seedGuestCartLine(testDb.db, CLIENT_B, PRODUCT_1, 1);
		const theirs = await store.createOrder(buyerB, orderAddresses());
		if (!theirs.ok) throw new Error('order failed');
		await store.confirmOrder(buyerB, theirs.response.razorpayOrderId, 'pay_of_buyer_b');

		// Buyer A has an order of their own and probes with payment IDs.
		const buyerA = { userId: null, clientId: CLIENT_A };
		await seedGuestCartLine(testDb.db, CLIENT_A, PRODUCT_1, 1);
		const mine = await store.createOrder(buyerA, orderAddresses());
		if (!mine.ok) throw new Error('order failed');
		const myOrder = mine.response.razorpayOrderId;

		const withUnknown = await store.getOrderStatus(buyerA, {
			razorpayOrderId: myOrder,
			paymentId: 'pay_does_not_exist'
		});
		const withForeign = await store.getOrderStatus(buyerA, {
			razorpayOrderId: myOrder,
			paymentId: 'pay_of_buyer_b'
		});

		expect(withForeign).toEqual(withUnknown);
		expect(withForeign).toMatchObject({ kind: 'cart_order', orderId: mine.response.orderId });
		// On its own, a foreign payment ID is still just "not found".
		await expect(
			store.getOrderStatus(buyerA, { paymentId: 'pay_of_buyer_b' })
		).resolves.toBeNull();
	});

	it('marks payment_pending orders as failed and reopens the cart', async () => {
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

		// The buyer keeps their items so "Try again" works.
		const cartRow = await testDb.db.select().from(carts).where(eq(carts.id, cart.id));
		expect(cartRow[0]?.status).toBe(CART_ORDER_STATUS.ACTIVE);

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
		// pay_b is a second payment on an already settled Razorpay order: recorded for a refund.
		expect([first, second].find((result) => !result.ok)).toEqual({
			ok: false,
			status: 409,
			body: { error: 'duplicate_payment', orderId: expect.any(String) }
		});

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

		const store = createCheckoutStore(testDb.db, fakeRazorpay({ createOrder }));
		const actor = { userId: null, clientId: CLIENT_A };

		const first = await store.createOrder(actor, orderAddresses());
		expect(first).toEqual({ ok: false, status: 500, body: { error: 'razorpay_order_failed' } });

		const orderAfterFailure = await testDb.db.select().from(orders);
		expect(orderAfterFailure[0]).toMatchObject({
			status: CART_ORDER_STATUS.PAYMENT_PENDING,
			activePaymentAttemptId: null
		});

		const second = await store.createOrder(actor, orderAddresses());
		expect(second.ok).toBe(true);
		if (!second.ok) return;

		expect(createOrder).toHaveBeenCalledTimes(2);
		expect(second.response.razorpayOrderId).toMatch(/^order_/);

		const orderAfterRetry = await testDb.db.select().from(orders);
		expect(orderAfterRetry[0]?.activePaymentAttemptId).toBeTruthy();
		const [retryAttempt] = await testDb.db
			.select()
			.from(paymentAttempts)
			.where(eq(paymentAttempts.providerOrderId, second.response.razorpayOrderId));
		expect(retryAttempt).toBeTruthy();
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

	it('reuses the Razorpay order when re-entering with nothing changed', async () => {
		await seedProduct(testDb.db, PRODUCT_1, 5, 'Widget A');
		const cart = await seedGuestCartLine(testDb.db, CLIENT_A, PRODUCT_1, 2);

		const createOrder = vi.fn(async (amountPaise: number, receipt: string) => ({
			id: `order_${receipt}`,
			amount: amountPaise,
			currency: 'INR'
		}));
		const store = createCheckoutStore(testDb.db, fakeRazorpay({ createOrder }));
		const actor = { userId: null, clientId: CLIENT_A };

		const first = await store.createOrder(actor, orderAddresses());
		expect(first.ok).toBe(true);
		if (!first.ok) return;

		const second = await store.createOrder(actor, orderAddresses());
		expect(second.ok).toBe(true);
		if (!second.ok) return;

		expect(second.response.razorpayOrderId).toBe(first.response.razorpayOrderId);
		expect(createOrder).toHaveBeenCalledTimes(1);

		const orderRow = await testDb.db.select().from(orders);
		expect(orderRow[0]).toMatchObject({
			subtotalPaise: 20000,
			deliveryFeePaise: 9900,
			totalPaise: 29900
		});
		expect(orderRow[0]?.address).toEqual(orderAddresses());

		const items = await testDb.db
			.select()
			.from(orderItems)
			.where(eq(orderItems.orderId, orderRow[0]!.id));
		expect(items).toEqual([
			expect.objectContaining({
				productId: PRODUCT_1,
				productName: 'Widget A',
				unitPricePaise: 10000,
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
				meta: { addressChanged: false }
			})
		]);
	});

	it('issues a new Razorpay order and retires the old one when only the address changed', async () => {
		await seedProduct(testDb.db, PRODUCT_1, 5, 'Widget A');
		await seedGuestCartLine(testDb.db, CLIENT_A, PRODUCT_1, 2);

		let razorpayCall = 0;
		const createOrder = vi.fn(async (amountPaise: number, receipt: string) => ({
			id: `order_${receipt}_v${++razorpayCall}`,
			amount: amountPaise,
			currency: 'INR'
		}));
		const store = createCheckoutStore(testDb.db, fakeRazorpay({ createOrder }));
		const actor = { userId: null, clientId: CLIENT_A };

		const first = await store.createOrder(actor, orderAddresses());
		if (!first.ok) throw new Error('first order failed');
		const updatedAddress = { ...ADDRESS, name: 'John Smith' };
		const second = await store.createOrder(actor, orderAddresses(updatedAddress));
		if (!second.ok) throw new Error('second order failed');

		// Same total, new snapshot: a new payment window, never the old one.
		expect(second.response.amountPaise).toBe(first.response.amountPaise);
		expect(second.response.razorpayOrderId).not.toBe(first.response.razorpayOrderId);
		expect(createOrder).toHaveBeenCalledTimes(2);

		const [oldAttempt] = await testDb.db
			.select()
			.from(paymentAttempts)
			.where(eq(paymentAttempts.providerOrderId, first.response.razorpayOrderId));
		expect(oldAttempt).toMatchObject({
			status: 'failed',
			failureReason: expect.stringMatching(/^superseded_by_newer_checkout/)
		});

		// The old modal is paid anyway: recorded for a refund, the new address is not fulfilled.
		const late = await store.confirmOrder(actor, first.response.razorpayOrderId, 'pay_old_modal');
		expect(late).toEqual({
			ok: false,
			status: 409,
			body: { error: 'payment_mismatch', orderId: first.response.orderId }
		});
		const [order] = await testDb.db.select().from(orders);
		expect(order?.status).toBe(CART_ORDER_STATUS.PAYMENT_PENDING);
		const attention = await testDb.db
			.select()
			.from(auditLog)
			.where(eq(auditLog.action, 'payment.requires_refund'));
		expect(attention).toEqual([
			expect.objectContaining({
				entityId: first.response.orderId,
				meta: expect.objectContaining({ reason: 'stale_order', detectedBy: 'confirm' })
			})
		]);
		expect(await store.getOrderStatus(actor, { paymentId: 'pay_old_modal' })).toMatchObject({
			kind: 'cart_order',
			orderId: first.response.orderId,
			needsSupport: 'payment_mismatch'
		});

		// The current window still pays for the current snapshot.
		expect(await store.confirmOrder(actor, second.response.razorpayOrderId, 'pay_new')).toEqual({
			ok: true,
			response: { status: 'paid', orderId: first.response.orderId }
		});
	});

	it('creates a new Razorpay order when the stored order belongs to another account', async () => {
		await seedProduct(testDb.db, PRODUCT_1, 5, 'Widget A');
		await seedGuestCartLine(testDb.db, CLIENT_A, PRODUCT_1, 2);

		let razorpayCall = 0;
		const createOrder = vi.fn(async (amountPaise: number, receipt: string) => {
			razorpayCall += 1;
			return {
				id: `order_${receipt}_live_v${razorpayCall}`,
				amount: amountPaise,
				currency: 'INR'
			};
		});
		const fetchOrder = vi.fn(async () => null);
		const store = createCheckoutStore(testDb.db, fakeRazorpay({ createOrder, fetchOrder }));
		const actor = { userId: null, clientId: CLIENT_A };

		const orderRows = await testDb.db.select({ id: orders.id }).from(orders);
		expect(orderRows).toHaveLength(0);

		const first = await store.createOrder(actor, orderAddresses());
		expect(first.ok).toBe(true);
		if (!first.ok) return;

		await testDb.db
			.update(paymentAttempts)
			.set({ providerOrderId: 'order_stale_test_key' })
			.where(eq(paymentAttempts.providerOrderId, first.response.razorpayOrderId));

		const second = await store.createOrder(actor, orderAddresses());
		expect(second.ok).toBe(true);
		if (!second.ok) return;

		expect(second.response.razorpayOrderId).not.toBe('order_stale_test_key');
		expect(createOrder).toHaveBeenCalledTimes(2);
		expect(fetchOrder).toHaveBeenCalledWith('order_stale_test_key');

		const orderRow = await testDb.db.select().from(orders);
		const [latestAttempt] = await testDb.db
			.select()
			.from(paymentAttempts)
			.where(eq(paymentAttempts.id, orderRow[0]!.activePaymentAttemptId!));
		expect(latestAttempt?.providerOrderId).toBe(second.response.razorpayOrderId);
	});

	it('creates a new Razorpay order when the stored Razorpay amount no longer matches the cart', async () => {
		await seedProduct(testDb.db, PRODUCT_1, 5, 'Widget A');
		await seedGuestCartLine(testDb.db, CLIENT_A, PRODUCT_1, 2);

		let razorpayCall = 0;
		const createOrder = vi.fn(async (amountPaise: number, receipt: string) => {
			razorpayCall += 1;
			return {
				id: `order_${receipt}_v${razorpayCall}`,
				amount: amountPaise,
				currency: 'INR'
			};
		});
		const fetchOrder = vi.fn(async () => ({
			id: 'order_stale_amount',
			amount: 249600,
			currency: 'INR'
		}));
		const store = createCheckoutStore(testDb.db, fakeRazorpay({ createOrder, fetchOrder }));
		const actor = { userId: null, clientId: CLIENT_A };

		const first = await store.createOrder(actor, orderAddresses());
		expect(first.ok).toBe(true);
		if (!first.ok) return;

		await testDb.db
			.update(paymentAttempts)
			.set({ providerOrderId: 'order_stale_amount' })
			.where(eq(paymentAttempts.providerOrderId, first.response.razorpayOrderId));

		const second = await store.createOrder(actor, orderAddresses());
		expect(second.ok).toBe(true);
		if (!second.ok) return;

		expect(second.response.totalRupees).toBe(299);
		expect(second.response.amountPaise).toBe(29900);
		expect(second.response.razorpayOrderId).not.toBe('order_stale_amount');
		expect(createOrder).toHaveBeenCalledTimes(2);
		expect(fetchOrder).toHaveBeenCalledWith('order_stale_amount');
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
		const store = createCheckoutStore(testDb.db, fakeRazorpay({ createOrder }));
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
			subtotalPaise: 20000,
			totalPaise: 29900
		});
		const [changedAttempt] = await testDb.db
			.select()
			.from(paymentAttempts)
			.where(eq(paymentAttempts.providerOrderId, second.response.razorpayOrderId));
		expect(changedAttempt).toBeTruthy();

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
					previousTotalPaise: 19900,
					totalPaise: 29900
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
		expect(confirmed).toEqual({
			ok: true,
			response: { status: 'paid', orderId: expect.any(String) }
		});

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

	it('keeps paid audit and writes stock conflict audit when confirm cannot decrement stock', async () => {
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
			body: { error: 'stock_conflict', orderId: expect.any(String) }
		});

		const paidAuditRows = await testDb.db
			.select()
			.from(auditLog)
			.where(eq(auditLog.action, 'paid'));
		expect(paidAuditRows).toHaveLength(1);

		const stockConflictAuditRows = await testDb.db
			.select()
			.from(auditLog)
			.where(eq(auditLog.action, 'paid_stock_conflict'));
		expect(stockConflictAuditRows).toHaveLength(1);
	});

	describe('payment reconciliation', () => {
		const guest = { userId: null, clientId: CLIENT_A };

		async function attentionRows() {
			return testDb.db
				.select()
				.from(auditLog)
				.where(eq(auditLog.action, 'payment.requires_refund'));
		}

		async function stockOf(productId: string) {
			const [row] = await testDb.db.select().from(products).where(eq(products.id, productId));
			return (row?.stock as { count: number }).count;
		}

		async function orderStatus(orderId: string) {
			const [row] = await testDb.db.select().from(orders).where(eq(orders.id, orderId));
			return row?.status;
		}

		/** Attempt A fails, the cart is reopened, retry B is created. */
		async function failThenRetry(store: ReturnType<typeof createCheckoutStore>) {
			const a = await store.createOrder(guest, orderAddresses());
			if (!a.ok) throw new Error('order A failed');
			await store.failOrder(guest, a.response.razorpayOrderId, 'declined');
			const b = await store.createOrder(guest, orderAddresses());
			if (!b.ok) throw new Error('order B failed');
			expect(b.response.orderId).not.toBe(a.response.orderId);
			return { a: a.response, b: b.response };
		}

		it('records a late capture on a failed attempt after the retry was paid', async () => {
			await seedProduct(testDb.db, PRODUCT_1, 5);
			await seedGuestCartLine(testDb.db, CLIENT_A, PRODUCT_1, 2);
			const { mail, sent, flush } = fakeMail();
			const store = createCheckoutStore(testDb.db, uniqueOrderRazorpay(), { mail });
			const { a, b } = await failThenRetry(store);

			expect(await store.confirmOrder(guest, b.razorpayOrderId, 'pay_b')).toEqual({
				ok: true,
				response: { status: 'paid', orderId: b.orderId }
			});

			const late = await store.confirmOrder(guest, a.razorpayOrderId, 'pay_a_late');
			expect(late).toEqual({
				ok: false,
				status: 409,
				body: { error: 'duplicate_payment', orderId: b.orderId }
			});
			// Repeating it does not record it twice.
			await store.confirmOrder(guest, a.razorpayOrderId, 'pay_a_late');

			expect(await orderStatus(a.orderId)).toBe(CART_ORDER_STATUS.FAILED);
			expect(await stockOf(PRODUCT_1)).toBe(3);
			expect(await attentionRows()).toEqual([
				expect.objectContaining({
					entityType: 'order',
					entityId: a.orderId,
					providerIds: { razorpayOrderId: a.razorpayOrderId, razorpayPaymentId: 'pay_a_late' },
					meta: expect.objectContaining({
						reason: 'duplicate_capture',
						detectedBy: 'confirm',
						amountPaise: a.amountPaise,
						paidOrderId: b.orderId
					})
				})
			]);

			await flush();
			const alerts = sent.filter((email) => email.subject.startsWith('Payment needs attention'));
			expect(alerts).toHaveLength(1);
			expect(alerts[0]?.to).toBe('orders@example.test');
			expect(alerts[0]?.text).toContain(
				'This payment was captured but not fulfilled. Refund it in Razorpay or resolve it by hand.'
			);
		});

		it('does not pay a second order or take stock again once the cart order is fulfilled', async () => {
			await seedProduct(testDb.db, PRODUCT_1, 5);
			await seedGuestCartLine(testDb.db, CLIENT_A, PRODUCT_1, 2);
			const store = createCheckoutStore(testDb.db, uniqueOrderRazorpay());
			const { a, b } = await failThenRetry(store);

			await store.confirmOrder(guest, b.razorpayOrderId, 'pay_b');
			await testDb.db
				.update(orders)
				.set({ status: CART_ORDER_STATUS.FULFILLED })
				.where(eq(orders.id, b.orderId));

			const late = await store.confirmOrder(guest, a.razorpayOrderId, 'pay_a_late');

			expect(late).toEqual({
				ok: false,
				status: 409,
				body: { error: 'duplicate_payment', orderId: b.orderId }
			});
			expect(await orderStatus(a.orderId)).toBe(CART_ORDER_STATUS.FAILED);
			expect(await stockOf(PRODUCT_1)).toBe(3);
			expect(await attentionRows()).toHaveLength(1);
		});

		it('records a capture on a second Razorpay order for an already paid order', async () => {
			await seedProduct(testDb.db, PRODUCT_1, 5);
			await seedGuestCartLine(testDb.db, CLIENT_A, PRODUCT_1, 1);
			const store = createCheckoutStore(testDb.db, uniqueOrderRazorpay());

			const x = await store.createOrder(guest, orderAddresses());
			const y = await store.createOrder(guest, orderAddresses(), { refreshPayment: true });
			if (!x.ok || !y.ok) throw new Error('order failed');
			expect(y.response.orderId).toBe(x.response.orderId);
			expect(y.response.razorpayOrderId).not.toBe(x.response.razorpayOrderId);

			await store.confirmOrder(guest, y.response.razorpayOrderId, 'pay_y');
			const second = await store.confirmOrder(guest, x.response.razorpayOrderId, 'pay_x');

			expect(second).toEqual({
				ok: false,
				status: 409,
				body: { error: 'duplicate_payment', orderId: x.response.orderId }
			});
			expect(await stockOf(PRODUCT_1)).toBe(4);
			expect(await attentionRows()).toEqual([
				expect.objectContaining({
					providerIds: {
						razorpayOrderId: x.response.razorpayOrderId,
						razorpayPaymentId: 'pay_x'
					},
					meta: expect.objectContaining({ reason: 'duplicate_capture' })
				})
			]);
		});

		it('does not let an older, smaller Razorpay order pay for the repriced order', async () => {
			await seedProduct(testDb.db, PRODUCT_1, 5);
			const cart = await seedGuestCartLine(testDb.db, CLIENT_A, PRODUCT_1, 1);
			const store = createCheckoutStore(testDb.db, uniqueOrderRazorpay());

			const old = await store.createOrder(guest, orderAddresses());
			if (!old.ok) throw new Error('order failed');
			await testDb.db.update(cartItems).set({ qty: 3 }).where(eq(cartItems.cartId, cart.id));
			const repriced = await store.createOrder(guest, orderAddresses());
			if (!repriced.ok) throw new Error('order failed');
			expect(repriced.response.orderId).toBe(old.response.orderId);
			expect(repriced.response.amountPaise).toBeGreaterThan(old.response.amountPaise);

			const result = await store.confirmOrder(guest, old.response.razorpayOrderId, 'pay_old');

			expect(result).toEqual({
				ok: false,
				status: 409,
				body: { error: 'payment_mismatch', orderId: old.response.orderId }
			});
			expect(await orderStatus(old.response.orderId)).toBe(CART_ORDER_STATUS.PAYMENT_PENDING);
			expect(await stockOf(PRODUCT_1)).toBe(5);
			expect(await attentionRows()).toEqual([
				expect.objectContaining({
					entityId: old.response.orderId,
					meta: expect.objectContaining({
						reason: 'stale_order',
						detectedBy: 'confirm',
						amountPaise: old.response.amountPaise
					})
				})
			]);

			// The current Razorpay order still pays for the current snapshot.
			expect(
				await store.confirmOrder(guest, repriced.response.razorpayOrderId, 'pay_current')
			).toEqual({ ok: true, response: { status: 'paid', orderId: old.response.orderId } });
			expect(await stockOf(PRODUCT_1)).toBe(2);
		});

		it('reserves no stock at all when one item sold out, and keeps saying so', async () => {
			await seedProduct(testDb.db, PRODUCT_1, 5, 'Widget A');
			await seedProduct(testDb.db, PRODUCT_2, 5, 'Widget B');
			const cart = await seedGuestCartLine(testDb.db, CLIENT_A, PRODUCT_1, 1);
			await testDb.db.insert(cartItems).values({ cartId: cart.id, productId: PRODUCT_2, qty: 2 });
			const { mail, sent, flush } = fakeMail();
			const store = createCheckoutStore(testDb.db, uniqueOrderRazorpay(), { mail });

			const created = await store.createOrder(guest, orderAddresses());
			if (!created.ok) throw new Error('order failed');
			await testDb.db
				.update(products)
				.set({ stock: { count: 1, status: 'in stock' } })
				.where(eq(products.id, PRODUCT_2));

			const result = await store.confirmOrder(guest, created.response.razorpayOrderId, 'pay_sc');

			expect(result).toEqual({
				ok: false,
				status: 409,
				body: { error: 'stock_conflict', orderId: created.response.orderId }
			});
			expect(await orderStatus(created.response.orderId)).toBe(CART_ORDER_STATUS.PAID);
			expect(await stockOf(PRODUCT_1)).toBe(5);
			expect(await stockOf(PRODUCT_2)).toBe(1);

			const status = await store.getOrderStatus(guest, { paymentId: 'pay_sc' });
			expect(status).toMatchObject({
				kind: 'cart_order',
				status: CART_ORDER_STATUS.PAID,
				needsSupport: 'stock_conflict'
			});
			expect(await attentionRows()).toEqual([
				expect.objectContaining({
					meta: expect.objectContaining({ reason: 'stock_conflict', detectedBy: 'confirm' })
				})
			]);

			await flush();
			expect(sent.map((email) => email.subject)).toEqual([
				expect.stringMatching(/^Payment needs attention/)
			]);
		});

		it('sends a paid order containing an open interest-check product to support, taking no stock', async () => {
			await seedProduct(testDb.db, PRODUCT_1, 5, 'Widget A');
			await seedProduct(testDb.db, PRODUCT_2, 5, 'Widget B');
			const cart = await seedGuestCartLine(testDb.db, CLIENT_A, PRODUCT_1, 1);
			await testDb.db.insert(cartItems).values({ cartId: cart.id, productId: PRODUCT_2, qty: 2 });
			const { mail } = fakeMail();
			const store = createCheckoutStore(testDb.db, uniqueOrderRazorpay(), { mail });

			const created = await store.createOrder(guest, orderAddresses());
			if (!created.ok) throw new Error('order failed');
			// The product became an open interest check after the order was created.
			await testDb.db
				.insert(schema.interestCampaigns)
				.values({ productId: PRODUCT_2, targetCount: 10, shipsWithinDays: 30 });

			const result = await store.confirmOrder(guest, created.response.razorpayOrderId, 'pay_ic');

			expect(result).toEqual({
				ok: false,
				status: 409,
				body: { error: 'stock_conflict', orderId: created.response.orderId }
			});
			expect(await orderStatus(created.response.orderId)).toBe(CART_ORDER_STATUS.PAID);
			expect(await stockOf(PRODUCT_1)).toBe(5);
			expect(await stockOf(PRODUCT_2)).toBe(5);
			const conflicts = await testDb.db
				.select()
				.from(auditLog)
				.where(eq(auditLog.action, 'paid_stock_conflict'));
			expect(conflicts).toEqual([
				expect.objectContaining({
					meta: expect.objectContaining({ productId: PRODUCT_2, cause: 'interest_check' })
				})
			]);
			expect(await attentionRows()).toEqual([
				expect.objectContaining({
					meta: expect.objectContaining({ reason: 'stock_conflict', detectedBy: 'confirm' })
				})
			]);
		});

		it('treats a stale read of the same payment as already paid, not as a duplicate', async () => {
			await seedProduct(testDb.db, PRODUCT_1, 5);
			await seedGuestCartLine(testDb.db, CLIENT_A, PRODUCT_1, 1);
			const store = createCheckoutStore(testDb.db, uniqueOrderRazorpay());
			const created = await store.createOrder(guest, orderAddresses());
			if (!created.ok) throw new Error('order failed');

			// The webhook read the attempt while it was pending, then waited on the order lock
			// while the browser confirm settled the same payment.
			const [staleAttempt] = await testDb.db
				.select()
				.from(paymentAttempts)
				.where(eq(paymentAttempts.providerOrderId, created.response.razorpayOrderId));
			await store.confirmOrder(guest, created.response.razorpayOrderId, 'pay_same');

			const settlement = await testDb.db.transaction(async (tx) => {
				const [order] = await tx
					.select()
					.from(orders)
					.where(eq(orders.id, created.response.orderId))
					.for('update');
				return settleCartPayment(tx, {
					attempt: staleAttempt!,
					order: order!,
					razorpayPaymentId: 'pay_same',
					actorUserId: null,
					actorClientId: null,
					paidAction: 'paid_webhook'
				});
			});

			expect(settlement).toEqual({
				kind: 'already_paid',
				orderId: created.response.orderId,
				stockConflict: false
			});
			expect(await attentionRows()).toHaveLength(0);
		});

		it('reports needsSupport as null for a clean paid order', async () => {
			await seedProduct(testDb.db, PRODUCT_1, 5);
			await seedGuestCartLine(testDb.db, CLIENT_A, PRODUCT_1, 1);
			const store = createCheckoutStore(testDb.db, uniqueOrderRazorpay());
			const created = await store.createOrder(guest, orderAddresses());
			if (!created.ok) throw new Error('order failed');
			await store.confirmOrder(guest, created.response.razorpayOrderId, 'pay_ok');

			expect(await store.getOrderStatus(guest, { paymentId: 'pay_ok' })).toMatchObject({
				status: CART_ORDER_STATUS.PAID,
				needsSupport: null
			});
		});

		it('applies a captured payment on the failed attempt instead of issuing a new order', async () => {
			await seedProduct(testDb.db, PRODUCT_1, 5);
			await seedGuestCartLine(testDb.db, CLIENT_A, PRODUCT_1, 2);
			const razorpay = uniqueOrderRazorpay({ fetchOrderPayments: vi.fn(async () => []) });
			const store = createCheckoutStore(testDb.db, razorpay);

			const a = await store.createOrder(guest, orderAddresses());
			if (!a.ok) throw new Error('order failed');
			// The buyer retried inside the modal and paid; the browser closed before confirm.
			razorpay.fetchOrderPayments = vi.fn(async () => [
				{ id: 'pay_in_modal', status: 'captured', amount: a.response.amountPaise, currency: 'INR' }
			]);
			await store.failOrder(guest, a.response.razorpayOrderId, 'declined');

			const again = await store.createOrder(guest, orderAddresses());

			expect(again).toEqual({
				ok: false,
				status: 409,
				body: { error: 'already_paid', orderId: a.response.orderId, paymentId: 'pay_in_modal' }
			});
			expect(razorpay.createOrder).toHaveBeenCalledTimes(1);
			expect(await orderStatus(a.response.orderId)).toBe(CART_ORDER_STATUS.PAID);
			expect(await stockOf(PRODUCT_1)).toBe(3);
		});

		it('starts no new payment when Razorpay cannot be asked about the previous one', async () => {
			await seedProduct(testDb.db, PRODUCT_1, 5);
			await seedGuestCartLine(testDb.db, CLIENT_A, PRODUCT_1, 1);
			const razorpay = uniqueOrderRazorpay({ fetchOrderPayments: vi.fn(async () => null) });
			const store = createCheckoutStore(testDb.db, razorpay);

			// A brand-new cart has nothing to check, so a Razorpay lookup outage does not block it.
			const a = await store.createOrder(guest, orderAddresses());
			if (!a.ok) throw new Error('order failed');
			expect(razorpay.fetchOrderPayments).not.toHaveBeenCalled();

			await store.failOrder(guest, a.response.razorpayOrderId, 'declined');
			const again = await store.createOrder(guest, orderAddresses());

			expect(again).toEqual({
				ok: false,
				status: 503,
				body: { error: 'payment_check_unavailable' }
			});
			expect(razorpay.createOrder).toHaveBeenCalledTimes(1);
		});
	});
	describe('payment path, second review round', () => {
		const guest = { userId: null, clientId: CLIENT_A };

		function capturedEvent(paymentId: string, orderId: string, amount: number) {
			return {
				event: 'payment.captured',
				payload: {
					payment: {
						entity: { id: paymentId, order_id: orderId, amount, currency: 'INR', status: 'captured' }
					}
				}
			};
		}

		function failedEvent(paymentId: string, orderId: string) {
			return {
				event: 'payment.failed',
				payload: {
					payment: {
						entity: {
							id: paymentId,
							order_id: orderId,
							amount: 1,
							currency: 'INR',
							status: 'failed',
							error_description: 'Card declined'
						}
					}
				}
			};
		}

		async function attentionRows() {
			return testDb.db
				.select()
				.from(auditLog)
				.where(eq(auditLog.action, 'payment.requires_refund'));
		}

		async function stockOf(productId: string) {
			const [row] = await testDb.db.select().from(products).where(eq(products.id, productId));
			return (row?.stock as { count: number }).count;
		}

		async function snapshotState(orderId: string, razorpayOrderId: string) {
			const [order] = await testDb.db.select().from(orders).where(eq(orders.id, orderId));
			const [attempt] = await testDb.db
				.select()
				.from(paymentAttempts)
				.where(eq(paymentAttempts.providerOrderId, razorpayOrderId));
			const [cart] = await testDb.db.select().from(carts).where(eq(carts.id, order!.cartId));
			return {
				orderStatus: order?.status,
				activePaymentAttemptId: order?.activePaymentAttemptId,
				attemptStatus: attempt?.status,
				attemptPaymentId: attempt?.providerPaymentId,
				cartStatus: cart?.status,
				stock: await stockOf(PRODUCT_1)
			};
		}

		// Item 1: failure paths never downgrade a paid order or attempt.

		it('a browser failure that arrives after the payment settled changes nothing', async () => {
			await seedProduct(testDb.db, PRODUCT_1, 5);
			await seedGuestCartLine(testDb.db, CLIENT_A, PRODUCT_1, 2);
			const store = createCheckoutStore(testDb.db, uniqueOrderRazorpay());
			const created = await store.createOrder(guest, orderAddresses());
			if (!created.ok) throw new Error('order failed');
			const { orderId, razorpayOrderId, amountPaise } = created.response;

			await store.confirmOrder(guest, razorpayOrderId, 'pay_ok');
			const before = await snapshotState(orderId, razorpayOrderId);
			expect(before).toMatchObject({
				orderStatus: CART_ORDER_STATUS.PAID,
				attemptStatus: 'paid',
				cartStatus: CART_ORDER_STATUS.PAID,
				stock: 3
			});

			expect(await store.failOrder(guest, razorpayOrderId, 'late failure')).toEqual({
				ok: true,
				response: { status: CART_ORDER_STATUS.PAID }
			});
			expect(await snapshotState(orderId, razorpayOrderId)).toEqual(before);

			// A repeated confirm and a re-delivered capture are the same payment, not a duplicate.
			expect(await store.confirmOrder(guest, razorpayOrderId, 'pay_ok')).toEqual({
				ok: true,
				response: { status: 'already_paid', orderId }
			});
			const webhook = createRazorpayWebhookService(testDb.db);
			expect(await webhook.handle(capturedEvent('pay_ok', razorpayOrderId, amountPaise))).toEqual({
				ok: true,
				status: 'already_processed'
			});
			expect(await snapshotState(orderId, razorpayOrderId)).toEqual(before);
			expect(await attentionRows()).toHaveLength(0);
		});

		it('a payment.failed webhook that arrives after the capture changes nothing', async () => {
			await seedProduct(testDb.db, PRODUCT_1, 5);
			await seedGuestCartLine(testDb.db, CLIENT_A, PRODUCT_1, 2);
			const store = createCheckoutStore(testDb.db, uniqueOrderRazorpay());
			const created = await store.createOrder(guest, orderAddresses());
			if (!created.ok) throw new Error('order failed');
			const { orderId, razorpayOrderId, amountPaise } = created.response;
			const webhook = createRazorpayWebhookService(testDb.db);

			await webhook.handle(capturedEvent('pay_ok', razorpayOrderId, amountPaise));
			const before = await snapshotState(orderId, razorpayOrderId);
			expect(before.orderStatus).toBe(CART_ORDER_STATUS.PAID);

			expect(await webhook.handle(failedEvent('pay_declined', razorpayOrderId))).toEqual({
				ok: true,
				status: 'already_processed'
			});
			expect(await snapshotState(orderId, razorpayOrderId)).toEqual(before);

			// Razorpay re-delivers the legitimate capture: no false duplicate_capture alert.
			expect(await webhook.handle(capturedEvent('pay_ok', razorpayOrderId, amountPaise))).toEqual({
				ok: true,
				status: 'already_processed'
			});
			expect(await attentionRows()).toHaveLength(0);
		});

		it('simulates a failure that read the attempt as pending before a capture committed', async () => {
			await seedProduct(testDb.db, PRODUCT_1, 5);
			await seedGuestCartLine(testDb.db, CLIENT_A, PRODUCT_1, 1);
			const store = createCheckoutStore(testDb.db, uniqueOrderRazorpay());
			const created = await store.createOrder(guest, orderAddresses());
			if (!created.ok) throw new Error('order failed');
			const { orderId, razorpayOrderId } = created.response;

			// Step A (failure handler): read the attempt while it is still pending.
			const [staleAttempt] = await testDb.db
				.select()
				.from(paymentAttempts)
				.where(eq(paymentAttempts.providerOrderId, razorpayOrderId));
			expect(staleAttempt?.status).toBe('pending');
			// Step B (capture) runs to completion.
			await store.confirmOrder(guest, razorpayOrderId, 'pay_ok');
			const before = await snapshotState(orderId, razorpayOrderId);

			// Step A's write, as every failure path now does it: under the lock, pending only.
			const changed = await testDb.db.transaction(async (tx) => {
				const order = await lockCartOrderForPayment(tx, staleAttempt!.entityId);
				expect(order?.status).toBe(CART_ORDER_STATUS.PAID);
				return failPendingAttempt(tx, staleAttempt!.id, 'declined');
			});

			expect(changed).toBe(false);
			expect(await snapshotState(orderId, razorpayOrderId)).toEqual(before);
		});

		it('a failure on an old payment window does not fail an order paying through a newer one', async () => {
			await seedProduct(testDb.db, PRODUCT_1, 5);
			await seedGuestCartLine(testDb.db, CLIENT_A, PRODUCT_1, 1);
			const store = createCheckoutStore(testDb.db, uniqueOrderRazorpay());
			const x = await store.createOrder(guest, orderAddresses());
			const y = await store.createOrder(guest, orderAddresses(), { refreshPayment: true });
			if (!x.ok || !y.ok) throw new Error('order failed');

			await store.failOrder(guest, x.response.razorpayOrderId, 'declined');

			const [order] = await testDb.db.select().from(orders);
			expect(order?.status).toBe(CART_ORDER_STATUS.PAYMENT_PENDING);
			expect(await store.confirmOrder(guest, y.response.razorpayOrderId, 'pay_y')).toEqual({
				ok: true,
				response: { status: 'paid', orderId: y.response.orderId }
			});
		});

		// Item 2: creation and settlement are serialised on the cart row.

		it('simulates a capture committing while creation asks Razorpay about the earlier window', async () => {
			await seedProduct(testDb.db, PRODUCT_1, 5);
			await seedGuestCartLine(testDb.db, CLIENT_A, PRODUCT_1, 2);
			const webhook = createRazorpayWebhookService(testDb.db);
			let first: { razorpayOrderId: string; amountPaise: number } | null = null;
			const razorpay = uniqueOrderRazorpay({
				fetchOrderPayments: vi.fn(async () => {
					// Razorpay answers "not paid yet", and the capture commits right after.
					await webhook.handle(capturedEvent('pay_race', first!.razorpayOrderId, first!.amountPaise));
					return [];
				})
			});
			const store = createCheckoutStore(testDb.db, razorpay);
			const created = await store.createOrder(guest, orderAddresses());
			if (!created.ok) throw new Error('order failed');
			first = created.response;

			const again = await store.createOrder(guest, orderAddresses(), { refreshPayment: true });

			expect(again).toEqual({
				ok: false,
				status: 409,
				body: { error: 'already_paid', orderId: created.response.orderId, paymentId: 'pay_race' }
			});
			expect(razorpay.createOrder).toHaveBeenCalledTimes(1);
			const allOrders = await testDb.db.select().from(orders);
			expect(allOrders).toHaveLength(1);
			expect(allOrders[0]?.status).toBe(CART_ORDER_STATUS.PAID);
			const [cart] = await testDb.db.select().from(carts);
			expect(cart?.status).toBe(CART_ORDER_STATUS.PAID);
			expect(await stockOf(PRODUCT_1)).toBe(3);
			expect(await attentionRows()).toHaveLength(0);
		});

		it('simulates a capture committing while Razorpay creates the replacement order', async () => {
			await seedProduct(testDb.db, PRODUCT_1, 5);
			await seedGuestCartLine(testDb.db, CLIENT_A, PRODUCT_1, 2);
			const webhook = createRazorpayWebhookService(testDb.db);
			let counter = 0;
			let first: { razorpayOrderId: string; amountPaise: number } | null = null;
			const createOrder = vi.fn(async (amountPaise: number) => {
				counter += 1;
				if (counter === 2) {
					await webhook.handle(capturedEvent('pay_race', first!.razorpayOrderId, first!.amountPaise));
				}
				return { id: `order_cart_${counter}`, amount: amountPaise, currency: 'INR' };
			});
			const store = createCheckoutStore(testDb.db, uniqueOrderRazorpay({ createOrder }));
			const created = await store.createOrder(guest, orderAddresses());
			if (!created.ok) throw new Error('order failed');
			first = created.response;
			const [orderBefore] = await testDb.db.select().from(orders);

			const again = await store.createOrder(guest, orderAddresses(), { refreshPayment: true });

			expect(again).toEqual({
				ok: false,
				status: 409,
				body: { error: 'already_paid', orderId: created.response.orderId, paymentId: 'pay_race' }
			});
			const [order] = await testDb.db.select().from(orders);
			expect(order?.status).toBe(CART_ORDER_STATUS.PAID);
			expect(order?.activePaymentAttemptId).toBe(orderBefore?.activePaymentAttemptId);
			const [late] = await testDb.db
				.select()
				.from(paymentAttempts)
				.where(eq(paymentAttempts.providerOrderId, 'order_cart_2'));
			expect(late).toMatchObject({
				status: 'failed',
				failureReason: expect.stringMatching(/^superseded_by_newer_checkout/)
			});
		});

		it('simulates another checkout request changing the order while Razorpay creates one', async () => {
			await seedProduct(testDb.db, PRODUCT_1, 5);
			const cart = await seedGuestCartLine(testDb.db, CLIENT_A, PRODUCT_1, 1);
			let counter = 0;
			let store: ReturnType<typeof createCheckoutStore> | null = null;
			let inner: Awaited<ReturnType<ReturnType<typeof createCheckoutStore>['createOrder']>> | null =
				null;
			const createOrder = vi.fn(async (amountPaise: number) => {
				counter += 1;
				const id = `order_cart_${counter}`;
				if (counter === 1) {
					// Request Y: the buyer changed the quantity in another tab and checked out.
					await testDb.db.update(cartItems).set({ qty: 2 }).where(eq(cartItems.cartId, cart.id));
					inner = await store!.createOrder(guest, orderAddresses());
				}
				return { id, amount: amountPaise, currency: 'INR' };
			});
			store = createCheckoutStore(testDb.db, uniqueOrderRazorpay({ createOrder }));

			const outer = await store.createOrder(guest, orderAddresses());

			// Request X's Razorpay order was for one item; it is never handed out.
			expect(outer).toEqual({ ok: false, status: 500, body: { error: 'razorpay_order_failed' } });
			expect(inner).toMatchObject({ ok: true, response: { razorpayOrderId: 'order_cart_2' } });
			const [stale] = await testDb.db
				.select()
				.from(paymentAttempts)
				.where(eq(paymentAttempts.providerOrderId, 'order_cart_1'));
			expect(stale?.status).toBe('failed');
			const [order] = await testDb.db.select().from(orders);
			const [active] = await testDb.db
				.select()
				.from(paymentAttempts)
				.where(eq(paymentAttempts.id, order!.activePaymentAttemptId!));
			expect(active?.providerOrderId).toBe('order_cart_2');
		});

		// Item 4: "could not check" is not "not paid".

		it('reconciles before reusing a pending Razorpay order', async () => {
			await seedProduct(testDb.db, PRODUCT_1, 5);
			await seedGuestCartLine(testDb.db, CLIENT_A, PRODUCT_1, 1);
			const razorpay = uniqueOrderRazorpay({ fetchOrderPayments: vi.fn(async () => []) });
			const store = createCheckoutStore(testDb.db, razorpay);
			const created = await store.createOrder(guest, orderAddresses());
			if (!created.ok) throw new Error('order failed');

			// Paid in the modal; the browser closed before confirm and the webhook is late.
			razorpay.fetchOrderPayments = vi.fn(async () => [
				{ id: 'pay_modal', status: 'captured', amount: created.response.amountPaise, currency: 'INR' }
			]);
			const again = await store.createOrder(guest, orderAddresses());

			expect(again).toEqual({
				ok: false,
				status: 409,
				body: { error: 'already_paid', orderId: created.response.orderId, paymentId: 'pay_modal' }
			});
			expect(razorpay.fetchOrder).not.toHaveBeenCalled();
		});

		it('starts no new payment while an earlier payment is authorised but not captured', async () => {
			await seedProduct(testDb.db, PRODUCT_1, 5);
			await seedGuestCartLine(testDb.db, CLIENT_A, PRODUCT_1, 1);
			const razorpay = uniqueOrderRazorpay({
				fetchOrderPayments: vi.fn(async () => [
					{ id: 'pay_auth', status: 'authorized', amount: 19900, currency: 'INR' }
				])
			});
			const store = createCheckoutStore(testDb.db, razorpay);
			const created = await store.createOrder(guest, orderAddresses());
			if (!created.ok) throw new Error('order failed');

			expect(await store.createOrder(guest, orderAddresses(), { refreshPayment: true })).toEqual({
				ok: false,
				status: 503,
				body: { error: 'payment_check_unavailable' }
			});
			expect(razorpay.createOrder).toHaveBeenCalledTimes(1);
		});

		it('treats a Razorpay lookup that does not answer in time as unknown', async () => {
			const client = uniqueOrderRazorpay({
				fetchOrderPayments: vi.fn(() => new Promise<null>(() => {}))
			});
			expect(await lookupCapturedPayment(client, 'order_stalled', 20)).toEqual({ kind: 'unknown' });
			client.fetchOrderPayments = vi.fn(async () => {
				throw new Error('network');
			});
			expect(await lookupCapturedPayment(client, 'order_err', 20)).toEqual({ kind: 'unknown' });
			client.fetchOrderPayments = vi.fn(async () => [
				{ id: 'pay_f', status: 'failed', amount: 1, currency: 'INR' }
			]);
			expect(await lookupCapturedPayment(client, 'order_failed', 20)).toEqual({
				kind: 'not_captured'
			});
		});

		// Item 5: the result pages read the persisted attention record.

		it('reports a webhook-recorded duplicate to the owner by payment ID, and to no one else', async () => {
			await seedProduct(testDb.db, PRODUCT_1, 5);
			await seedGuestCartLine(testDb.db, CLIENT_A, PRODUCT_1, 1);
			const store = createCheckoutStore(testDb.db, uniqueOrderRazorpay());
			const x = await store.createOrder(guest, orderAddresses());
			const y = await store.createOrder(guest, orderAddresses(), { refreshPayment: true });
			if (!x.ok || !y.ok) throw new Error('order failed');
			const webhook = createRazorpayWebhookService(testDb.db);

			await webhook.handle(capturedEvent('pay_y', y.response.razorpayOrderId, y.response.amountPaise));
			await webhook.handle(capturedEvent('pay_x', x.response.razorpayOrderId, x.response.amountPaise));

			// pay_x was never stored on an attempt; it is found through its attention record.
			expect(await store.getOrderStatus(guest, { paymentId: 'pay_x' })).toMatchObject({
				kind: 'cart_order',
				orderId: x.response.orderId,
				status: CART_ORDER_STATUS.PAID,
				needsSupport: 'duplicate_payment'
			});
			expect(await store.getOrderStatus(guest, { paymentId: 'pay_y' })).toMatchObject({
				needsSupport: null
			});
			expect(
				await store.getOrderStatus({ userId: null, clientId: CLIENT_B }, { paymentId: 'pay_x' })
			).toBeNull();
			// A payment ID paired with someone else's Razorpay order does not borrow its attention.
			expect(
				await store.getOrderStatus(guest, {
					paymentId: 'pay_unknown',
					razorpayOrderId: y.response.razorpayOrderId
				})
			).toMatchObject({ needsSupport: null });
		});

		// Item 6: a lost stock-conflict alert is repaired by the next delivery.

		it('re-creates the stock-conflict attention record when the first write was lost', async () => {
			await seedProduct(testDb.db, PRODUCT_1, 1);
			await seedGuestCartLine(testDb.db, CLIENT_A, PRODUCT_1, 1);
			const store = createCheckoutStore(testDb.db, uniqueOrderRazorpay());
			const created = await store.createOrder(guest, orderAddresses());
			if (!created.ok) throw new Error('order failed');
			await testDb.db
				.update(products)
				.set({ stock: { count: 0, status: 'in stock' } })
				.where(eq(products.id, PRODUCT_1));

			// The settlement commits; the process dies before recordPaymentAttention runs.
			const settlement = await testDb.db.transaction(async (tx) => {
				const [attempt] = await tx
					.select()
					.from(paymentAttempts)
					.where(eq(paymentAttempts.providerOrderId, created.response.razorpayOrderId));
				const order = await lockCartOrderForPayment(tx, attempt!.entityId);
				return settleCartPayment(tx, {
					attempt: attempt!,
					order: order!,
					razorpayPaymentId: 'pay_sc',
					actorUserId: null,
					actorClientId: null,
					paidAction: 'paid_webhook'
				});
			});
			expect(settlement.kind).toBe('paid_stock_conflict');
			expect(await attentionRows()).toHaveLength(0);

			const webhook = createRazorpayWebhookService(testDb.db);
			expect(
				await webhook.handle(
					capturedEvent('pay_sc', created.response.razorpayOrderId, created.response.amountPaise)
				)
			).toEqual({ ok: true, status: 'already_processed' });
			expect(await attentionRows()).toEqual([
				expect.objectContaining({
					entityId: created.response.orderId,
					meta: expect.objectContaining({ reason: 'stock_conflict', detectedBy: 'webhook' })
				})
			]);

			// Further deliveries do not add a second record.
			await store.confirmOrder(guest, created.response.razorpayOrderId, 'pay_sc');
			expect(await attentionRows()).toHaveLength(1);
		});
	});

});

function uniqueOrderRazorpay(overrides: Partial<RazorpayClient> = {}) {
	let counter = 0;
	const createOrder = vi.fn(async (amountPaise: number) => ({
		id: `order_cart_${++counter}`,
		amount: amountPaise,
		currency: 'INR'
	}));
	const client = {
		createOrder,
		fetchOrder: vi.fn(async (orderId: string) => {
			for (const result of createOrder.mock.results) {
				if (result.type !== 'return') continue;
				const order = await result.value;
				if (order.id === orderId) return order;
			}
			return null;
		}),
		...overrides
	};
	return client as typeof client & Required<Pick<RazorpayClient, 'fetchOrderPayments'>>;
}

function fakeMail() {
	const pending: Promise<void>[] = [];
	const sent: { to: string | null | undefined; subject: string; text: string }[] = [];
	const mail: MailService = {
		isConfigured: true,
		ordersInbox: 'orders@example.test',
		env: {} as MailService['env'],
		siteUrl: 'https://example.test',
		send: (to, email) => {
			sent.push({ to, subject: email.subject, text: email.text });
		},
		sendToMany: () => {},
		dispatch: (_event, task) => {
			pending.push(task());
		},
		resolveUserEmail: async () => null,
		resolveUserEmails: async () => new Map()
	};
	return { mail, sent, flush: () => Promise.all(pending) };
}

describe('CheckoutStore interest checks (PGlite)', () => {
	let testDb: TestDb;

	beforeEach(async () => {
		testDb = await createTestDb();
	});

	afterEach(async () => {
		await testDb.client.close();
	});

	it('refuses to create an order for an open interest check, and allows it after launch', async () => {
		await seedProduct(testDb.db, PRODUCT_1, 5, 'Widget A');
		await seedGuestCartLine(testDb.db, CLIENT_A, PRODUCT_1, 1);
		await testDb.db
			.insert(schema.interestCampaigns)
			.values({ productId: PRODUCT_1, targetCount: 10, shipsWithinDays: 30 });

		const razorpay = fakeRazorpay();
		const store = createCheckoutStore(testDb.db, razorpay);
		const actor = { userId: null, clientId: CLIENT_A };

		const refused = await store.createOrder(actor, orderAddresses());
		expect(refused).toEqual({
			ok: false,
			status: 409,
			body: { error: 'listing_not_available', productId: PRODUCT_1 }
		});
		expect(razorpay.createOrder).not.toHaveBeenCalled();
		expect(await testDb.db.select().from(orders)).toHaveLength(0);

		await testDb.db
			.update(schema.interestCampaigns)
			.set({ status: 'launched' })
			.where(eq(schema.interestCampaigns.productId, PRODUCT_1));
		const created = await store.createOrder(actor, orderAddresses());
		expect(created.ok).toBe(true);
	});
});
