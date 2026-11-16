import { PGlite } from '@electric-sql/pglite';
import { eq } from 'drizzle-orm';
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
import { auditLog } from '../db/schema/auditLog.js';
import { cartItems } from '../db/schema/cartItems.js';
import { carts } from '../db/schema/carts.js';
import { orders } from '../db/schema/orders.js';
import { paymentAttempts } from '../db/schema/paymentAttempts.js';
import { products } from '../db/schema/products.js';
import { createCheckoutStore } from './checkout-store.js';
import type { RazorpayClient } from './razorpay-client.js';
import { createRazorpayWebhookService } from './razorpay-webhooks.js';

const CLIENT_A = 'client-a';
const PRODUCT_1 = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

const ADDRESS: CheckoutAddress = {
	name: 'Jane Doe',
	line1: '123 Example Street Block A',
	city: 'Bengaluru',
	pincode: '560001',
	state: 'Karnataka',
	phone: '9876543210'
};

function orderAddresses(): CheckoutOrderAddresses {
	return normalizeCheckoutOrderAddresses(ADDRESS, ADDRESS);
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

const PRINTREQUESTS_STUB_SQL = `
CREATE TABLE IF NOT EXISTS "printrequests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL
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

async function createTestDb(): Promise<TestDb> {
	const client = new PGlite();
	await client.exec(PRODUCTS_STUB_SQL);
	await client.exec(PRINTREQUESTS_STUB_SQL);
	await execMigrationStatements(client, migrationSql);
	await execMigrationStatements(client, auditMigrationSql);
	await execMigrationStatements(client, paymentAttemptsMigrationSql);
	await execMigrationStatements(client, paiseMigrationSql);
	await applyInterestMigration(client);

	const db = drizzle(client, { schema }) as unknown as Database;
	return { client, db };
}

async function seedProduct(db: Database, stockCount: number) {
	await db.insert(products).values({
		id: PRODUCT_1,
		name: 'Widget A',
		author: 'test_maker',
		guarantee: '7-day guarantee',
		price: { new: 100, old: 120 },
		stock: { count: stockCount, status: 'in stock' },
		images: [{ url: 'https://example.com/item.png' }]
	});
}

async function seedGuestCartLine(db: Database, qty: number) {
	const [guestCart] = await db
		.insert(carts)
		.values({ clientId: CLIENT_A, status: CART_ORDER_STATUS.ACTIVE })
		.returning();

	await db.insert(cartItems).values({
		cartId: guestCart.id,
		productId: PRODUCT_1,
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

	return {
		createOrder,
		fetchOrder: vi.fn(async () => null) as Mock<RazorpayClient['fetchOrder']>,
		...overrides
	};
}

describe('Razorpay webhook service (PGlite)', () => {
	let testDb: TestDb;

	beforeEach(async () => {
		testDb = await createTestDb();
	});

	afterEach(async () => {
		await testDb.client.close();
	});

	it('settles a captured cart payment when the browser confirm callback is missed', async () => {
		await seedProduct(testDb.db, 5);
		const cart = await seedGuestCartLine(testDb.db, 2);
		const checkoutStore = createCheckoutStore(testDb.db, fakeRazorpay());
		const created = await checkoutStore.createOrder(
			{ userId: null, clientId: CLIENT_A },
			orderAddresses()
		);
		expect(created.ok).toBe(true);
		if (!created.ok) return;

		const webhookService = createRazorpayWebhookService(testDb.db);
		const result = await webhookService.handle(
			{
				event: 'payment.captured',
				payload: {
					payment: {
						entity: {
							id: 'pay_webhook_1',
							order_id: created.response.razorpayOrderId,
							amount: created.response.amountPaise,
							currency: 'INR',
							status: 'captured'
						}
					}
				}
			},
			'evt_webhook_1'
		);

		expect(result).toEqual({ ok: true, status: 'processed' });

		const [order] = await testDb.db.select().from(orders);
		expect(order?.status).toBe(CART_ORDER_STATUS.PAID);

		const [attempt] = await testDb.db
			.select()
			.from(paymentAttempts)
			.where(eq(paymentAttempts.providerOrderId, created.response.razorpayOrderId));
		expect(attempt).toMatchObject({
			status: 'paid',
			providerPaymentId: 'pay_webhook_1'
		});

		const [cartRow] = await testDb.db.select().from(carts).where(eq(carts.id, cart.id));
		expect(cartRow?.status).toBe(CART_ORDER_STATUS.PAID);

		const remainingCartItems = await testDb.db
			.select()
			.from(cartItems)
			.where(eq(cartItems.cartId, cart.id));
		expect(remainingCartItems).toHaveLength(0);

		const [product] = await testDb.db.select().from(products).where(eq(products.id, PRODUCT_1));
		expect(product?.stock).toMatchObject({ count: 3 });

		const webhookAudits = await testDb.db
			.select()
			.from(auditLog)
			.where(eq(auditLog.action, 'paid_webhook'));
		expect(webhookAudits).toHaveLength(1);
	});

	it('does not fulfil captured events whose amount does not match the stored attempt', async () => {
		await seedProduct(testDb.db, 5);
		await seedGuestCartLine(testDb.db, 2);
		const checkoutStore = createCheckoutStore(testDb.db, fakeRazorpay());
		const created = await checkoutStore.createOrder(
			{ userId: null, clientId: CLIENT_A },
			orderAddresses()
		);
		expect(created.ok).toBe(true);
		if (!created.ok) return;

		const webhookService = createRazorpayWebhookService(testDb.db);
		const result = await webhookService.handle({
			event: 'payment.captured',
			payload: {
				payment: {
					entity: {
						id: 'pay_wrong_amount',
						order_id: created.response.razorpayOrderId,
						amount: created.response.amountPaise + 1,
						currency: 'INR',
						status: 'captured'
					}
				}
			}
		});

		expect(result).toEqual({ ok: true, status: 'processed' });

		const [order] = await testDb.db.select().from(orders);
		expect(order?.status).toBe(CART_ORDER_STATUS.PAYMENT_PENDING);

		const attention = await testDb.db
			.select()
			.from(auditLog)
			.where(eq(auditLog.action, 'payment.requires_refund'));
		expect(attention).toEqual([
			expect.objectContaining({
				entityType: 'order',
				entityId: order?.id,
				providerIds: {
					razorpayOrderId: created.response.razorpayOrderId,
					razorpayPaymentId: 'pay_wrong_amount'
				},
				meta: expect.objectContaining({ reason: 'amount_mismatch', detectedBy: 'webhook' })
			})
		]);
	});

	describe('payment reconciliation', () => {
		const guest = { userId: null, clientId: CLIENT_A };

		function uniqueOrderRazorpay() {
			let counter = 0;
			return fakeRazorpay({
				createOrder: vi.fn(async (amountPaise: number) => ({
					id: `order_wh_${++counter}`,
					amount: amountPaise,
					currency: 'INR'
				}))
			});
		}

		function captured(paymentId: string, orderId: string, amount: number) {
			return {
				event: 'payment.captured',
				payload: {
					payment: {
						entity: { id: paymentId, order_id: orderId, amount, currency: 'INR', status: 'captured' }
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

		it('records a late capture on a failed attempt instead of rolling it back', async () => {
			await seedProduct(testDb.db, 5);
			await seedGuestCartLine(testDb.db, 2);
			const store = createCheckoutStore(testDb.db, uniqueOrderRazorpay());

			const a = await store.createOrder(guest, orderAddresses());
			if (!a.ok) throw new Error('order A failed');
			await store.failOrder(guest, a.response.razorpayOrderId, 'declined');
			const b = await store.createOrder(guest, orderAddresses());
			if (!b.ok) throw new Error('order B failed');
			await store.confirmOrder(guest, b.response.razorpayOrderId, 'pay_b');

			const webhook = createRazorpayWebhookService(testDb.db);
			const result = await webhook.handle(
				captured('pay_a_late', a.response.razorpayOrderId, a.response.amountPaise),
				'evt_late'
			);
			// Razorpay retries the same event.
			const retry = await webhook.handle(
				captured('pay_a_late', a.response.razorpayOrderId, a.response.amountPaise),
				'evt_late'
			);

			expect(result).toEqual({ ok: true, status: 'processed' });
			expect(retry).toEqual({ ok: true, status: 'processed' });
			const [orderA] = await testDb.db
				.select()
				.from(orders)
				.where(eq(orders.id, a.response.orderId));
			expect(orderA?.status).toBe(CART_ORDER_STATUS.FAILED);
			const [product] = await testDb.db.select().from(products).where(eq(products.id, PRODUCT_1));
			expect(product?.stock).toMatchObject({ count: 3 });
			expect(await attentionRows()).toEqual([
				expect.objectContaining({
					entityType: 'order',
					entityId: a.response.orderId,
					providerIds: {
						razorpayOrderId: a.response.razorpayOrderId,
						razorpayPaymentId: 'pay_a_late'
					},
					meta: expect.objectContaining({
						reason: 'duplicate_capture',
						detectedBy: 'webhook',
						paidOrderId: b.response.orderId
					})
				})
			]);
		});

		it('records a capture on an old Razorpay order whose amount no longer matches the order', async () => {
			await seedProduct(testDb.db, 5);
			const cart = await seedGuestCartLine(testDb.db, 1);
			const store = createCheckoutStore(testDb.db, uniqueOrderRazorpay());

			const old = await store.createOrder(guest, orderAddresses());
			if (!old.ok) throw new Error('order failed');
			await testDb.db.update(cartItems).set({ qty: 2 }).where(eq(cartItems.cartId, cart.id));
			const repriced = await store.createOrder(guest, orderAddresses());
			if (!repriced.ok) throw new Error('order failed');

			const webhook = createRazorpayWebhookService(testDb.db);
			const result = await webhook.handle(
				captured('pay_old', old.response.razorpayOrderId, old.response.amountPaise)
			);

			expect(result).toEqual({ ok: true, status: 'processed' });
			const [order] = await testDb.db.select().from(orders);
			expect(order?.status).toBe(CART_ORDER_STATUS.PAYMENT_PENDING);
			const [product] = await testDb.db.select().from(products).where(eq(products.id, PRODUCT_1));
			expect(product?.stock).toMatchObject({ count: 5 });
			expect(await attentionRows()).toEqual([
				expect.objectContaining({
					meta: expect.objectContaining({ reason: 'stale_order', detectedBy: 'webhook' })
				})
			]);
		});

		it('keeps a webhook stock conflict visible to confirm and the order status', async () => {
			await seedProduct(testDb.db, 5);
			await seedGuestCartLine(testDb.db, 2);
			const store = createCheckoutStore(testDb.db, uniqueOrderRazorpay());
			const created = await store.createOrder(guest, orderAddresses());
			if (!created.ok) throw new Error('order failed');
			await testDb.db
				.update(products)
				.set({ stock: { count: 1, status: 'in stock' } })
				.where(eq(products.id, PRODUCT_1));

			const webhook = createRazorpayWebhookService(testDb.db);
			expect(
				await webhook.handle(
					captured('pay_sc', created.response.razorpayOrderId, created.response.amountPaise)
				)
			).toEqual({ ok: true, status: 'processed' });

			// The browser confirm arrives after the webhook.
			expect(await store.confirmOrder(guest, created.response.razorpayOrderId, 'pay_sc')).toEqual({
				ok: false,
				status: 409,
				body: { error: 'stock_conflict', orderId: created.response.orderId }
			});
			expect(
				await store.getOrderStatus(guest, { razorpayOrderId: created.response.razorpayOrderId })
			).toMatchObject({ status: CART_ORDER_STATUS.PAID, needsSupport: 'stock_conflict' });
			const [product] = await testDb.db.select().from(products).where(eq(products.id, PRODUCT_1));
			expect(product?.stock).toMatchObject({ count: 1 });
			expect(await attentionRows()).toEqual([
				expect.objectContaining({
					meta: expect.objectContaining({ reason: 'stock_conflict', detectedBy: 'webhook' })
				})
			]);
		});
	});
});
