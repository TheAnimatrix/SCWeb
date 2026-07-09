import { PGlite } from '@electric-sql/pglite';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CheckoutAddress } from '../contracts/address.js';
import type { Database } from '../db/index.js';
import * as schema from '../db/schema/index.js';
import { printrequests } from '../db/schema/printrequests.js';
import { purchases } from '../db/schema/purchases.js';
import { auditLog } from '../db/schema/auditLog.js';
import { createPrintPaymentsStore } from './print-payments-store.js';
import type { RazorpayClient } from './razorpay-client.js';

const USER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const OTHER_USER_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const PRINT_REQUEST_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const OTHER_PRINT_REQUEST_ID = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
const CLIENT_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

const ADDRESS: CheckoutAddress = {
	name: 'Jane Doe',
	line1: '123 Example Street Block A',
	city: 'Bengaluru',
	pincode: '560001',
	state: 'Karnataka',
	phone: '9876543210'
};

const PRINTREQUESTS_STUB_SQL = `
CREATE TABLE IF NOT EXISTS "printrequests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_updated" timestamp with time zone,
	"update_count" integer,
	"user_id" uuid,
	"creator_id" uuid,
	"model" text,
	"model_metadata" jsonb,
	"quote_updates" integer,
	"initial_quote" integer,
	"quote" integer,
	"events" jsonb,
	"filament_color" text,
	"model_data" jsonb,
	"request_stage" text,
	"request_metadata" jsonb,
	"order_id" text,
	"payment_id" text,
	"address" jsonb
);
`;

const PURCHASES_STUB_SQL = `
CREATE TABLE IF NOT EXISTS "purchases" (
	"id" serial PRIMARY KEY NOT NULL,
	"amount" double precision,
	"billing_address" jsonb,
	"cart_id" uuid,
	"client_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"payment_confirmed" boolean,
	"payment_id" text NOT NULL,
	"payment_id_b" text,
	"payment_method" text,
	"payment_signature" text,
	"payment_status" text,
	"shipping_address" jsonb,
	"trackingCourier" text,
	"trackingId" text,
	"trackingUrl" text,
	"uid" uuid
);
CREATE UNIQUE INDEX IF NOT EXISTS purchases_razorpay_payment_id_b_paid_unique
ON purchases (payment_id_b)
WHERE payment_status = 'paid';
`;

const AUDIT_LOG_STUB_SQL = `
CREATE TABLE IF NOT EXISTS "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"actor_user_id" uuid,
	"actor_client_id" text,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"action" text NOT NULL,
	"from_state" text,
	"to_state" text,
	"provider_ids" jsonb,
	"meta" jsonb
);
CREATE INDEX IF NOT EXISTS "audit_log_entity_type_entity_id_at_idx" ON "audit_log" ("entity_type", "entity_id", "at");
`;

type TestDb = {
	client: PGlite;
	db: Database;
};

async function createTestDb(): Promise<TestDb> {
	const client = new PGlite();
	await client.exec(PRINTREQUESTS_STUB_SQL);
	await client.exec(PURCHASES_STUB_SQL);
	await client.exec(AUDIT_LOG_STUB_SQL);

	const db = drizzle(client, { schema }) as unknown as Database;
	return { client, db };
}

function fakeRazorpay(overrides: Partial<RazorpayClient> = {}): RazorpayClient {
	const baseCreateOrder = vi.fn(async (amountPaise: number, receipt: string) => ({
		id: `order_${receipt}`,
		amount: amountPaise,
		currency: 'INR'
	}));
	const createOrder = overrides.createOrder ?? baseCreateOrder;
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

async function seedQuotedPrintRequest(
	db: Database,
	options: {
		id?: string;
		userId?: string;
		quote?: number;
		stage?: string;
		orderId?: string | null;
		events?: unknown;
	} = {}
) {
	const quote = options.quote ?? 2500;
	const events = options.events ?? [
		{
			by: 'maker',
			type: 'quoted',
			reason: 'Quote provided',
			timestamp: '2026-01-01T00:00:00.000Z',
			extra: { quote }
		}
	];

	await db.insert(printrequests).values({
		id: options.id ?? PRINT_REQUEST_ID,
		userId: options.userId ?? USER_ID,
		requestStage: options.stage ?? 'quoted',
		orderId: options.orderId ?? null,
		events,
		model: 'models/test.stl'
	});
}

describe('PrintPaymentsStore (PGlite)', () => {
	let testDb: TestDb;

	beforeEach(async () => {
		testDb = await createTestDb();
	});

	afterEach(async () => {
		await testDb.client.close();
	});

	it('creates an order from the stored quote and appends order_created event', async () => {
		await seedQuotedPrintRequest(testDb.db);

		const razorpay = fakeRazorpay();
		const store = createPrintPaymentsStore(testDb.db, razorpay);
		const result = await store.createOrder(
			{ userId: USER_ID, clientId: CLIENT_ID },
			PRINT_REQUEST_ID,
			ADDRESS
		);

		expect(result.ok).toBe(true);
		if (!result.ok) return;

		expect(result.response).toEqual({
			razorpayOrderId: `order_${PRINT_REQUEST_ID}`,
			amountPaise: 250000,
			currency: 'INR'
		});
		expect(razorpay.createOrder).toHaveBeenCalledWith(250000, PRINT_REQUEST_ID);

		const [row] = await testDb.db
			.select()
			.from(printrequests)
			.where(eq(printrequests.id, PRINT_REQUEST_ID));
		expect(row?.orderId).toBe(`order_${PRINT_REQUEST_ID}`);
		expect(row?.address).toEqual({ shipping: ADDRESS, billing: ADDRESS });
		expect(row?.events).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					type: 'order_created',
					extra: {
						amount: 2500,
						order_id: `order_${PRINT_REQUEST_ID}`
					}
				})
			])
		);

		const auditRows = await testDb.db
			.select()
			.from(auditLog)
			.where(eq(auditLog.action, 'payment_order_created'));
		expect(auditRows).toEqual([
			expect.objectContaining({
				entityType: 'print_request',
				entityId: PRINT_REQUEST_ID,
				action: 'payment_order_created',
				providerIds: { razorpayOrderId: `order_${PRINT_REQUEST_ID}` }
			})
		]);
	});

	it('confirms once and inserts a single purchase with legacy parity columns', async () => {
		await seedQuotedPrintRequest(testDb.db);

		const store = createPrintPaymentsStore(testDb.db, fakeRazorpay());
		const created = await store.createOrder(
			{ userId: USER_ID, clientId: CLIENT_ID },
			PRINT_REQUEST_ID,
			ADDRESS
		);
		expect(created.ok).toBe(true);
		if (!created.ok) return;

		const first = await store.confirmPayment(
			{ userId: USER_ID, clientId: CLIENT_ID },
			PRINT_REQUEST_ID,
			created.response.razorpayOrderId,
			'pay_123'
		);
		const second = await store.confirmPayment(
			{ userId: USER_ID, clientId: CLIENT_ID },
			PRINT_REQUEST_ID,
			created.response.razorpayOrderId,
			'pay_123'
		);

		expect(first).toEqual({ ok: true, response: { status: 'paid' } });
		expect(second).toEqual({ ok: true, response: { status: 'already_paid' } });

		const [row] = await testDb.db
			.select()
			.from(printrequests)
			.where(eq(printrequests.id, PRINT_REQUEST_ID));
		expect(row?.requestStage).toBe('paid');
		expect(row?.paymentId).toBe('pay_123');
		expect(row?.events).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					type: 'paid',
					extra: {
						payment_id_a: created.response.razorpayOrderId,
						payment_id_b: 'pay_123',
						amount: 2500
					}
				})
			])
		);

		const purchaseRows = await testDb.db.select().from(purchases);
		expect(purchaseRows).toHaveLength(1);
		expect(purchaseRows[0]).toMatchObject({
			paymentStatus: 'paid',
			paymentMethod: 'razorpay:PrintRequest',
			paymentId: created.response.razorpayOrderId,
			paymentIdB: 'pay_123',
			cartId: PRINT_REQUEST_ID,
			amount: 2500,
			uid: USER_ID,
			clientId: CLIENT_ID,
			billingAddress: ADDRESS,
			shippingAddress: ADDRESS
		});

		const auditRows = await testDb.db.select().from(auditLog).where(eq(auditLog.action, 'paid'));
		expect(auditRows).toEqual([
			expect.objectContaining({
				entityType: 'print_request',
				entityId: PRINT_REQUEST_ID,
				action: 'paid',
				toState: 'paid',
				providerIds: {
					razorpayOrderId: created.response.razorpayOrderId,
					razorpayPaymentId: 'pay_123'
				}
			})
		]);
	});

	it('concurrent confirm inserts only one purchase', async () => {
		await seedQuotedPrintRequest(testDb.db);

		const store = createPrintPaymentsStore(testDb.db, fakeRazorpay());
		const created = await store.createOrder(
			{ userId: USER_ID, clientId: CLIENT_ID },
			PRINT_REQUEST_ID,
			ADDRESS
		);
		expect(created.ok).toBe(true);
		if (!created.ok) return;

		const actor = { userId: USER_ID, clientId: CLIENT_ID };
		const [first, second] = await Promise.all([
			store.confirmPayment(actor, PRINT_REQUEST_ID, created.response.razorpayOrderId, 'pay_a'),
			store.confirmPayment(actor, PRINT_REQUEST_ID, created.response.razorpayOrderId, 'pay_b')
		]);

		const statuses = [first, second].map((result) =>
			result.ok ? result.response.status : 'error'
		);
		expect(statuses).toContain('paid');
		expect(statuses).toContain('already_paid');

		const purchaseRows = await testDb.db.select().from(purchases);
		expect(purchaseRows).toHaveLength(1);
	});

	it('reuses Razorpay order when re-entering with unchanged quote', async () => {
		await seedQuotedPrintRequest(testDb.db);

		const createOrder = vi.fn(async (amountPaise: number, receipt: string) => ({
			id: `order_${receipt}`,
			amount: amountPaise,
			currency: 'INR'
		}));
		const store = createPrintPaymentsStore(testDb.db, { createOrder });
		const actor = { userId: USER_ID, clientId: CLIENT_ID };

		const first = await store.createOrder(actor, PRINT_REQUEST_ID, ADDRESS);
		const second = await store.createOrder(actor, PRINT_REQUEST_ID, {
			...ADDRESS,
			name: 'John Smith'
		});

		expect(first.ok).toBe(true);
		expect(second.ok).toBe(true);
		if (!first.ok || !second.ok) return;

		expect(second.response.razorpayOrderId).toBe(first.response.razorpayOrderId);
		expect(createOrder).toHaveBeenCalledTimes(1);

		const [row] = await testDb.db
			.select()
			.from(printrequests)
			.where(eq(printrequests.id, PRINT_REQUEST_ID));
		expect(row?.address).toEqual({
			shipping: { ...ADDRESS, name: 'John Smith' },
			billing: { ...ADDRESS, name: 'John Smith' }
		});
	});

	it('creates a new Razorpay order when the quote amount changes', async () => {
		await seedQuotedPrintRequest(testDb.db, { quote: 2500 });

		let razorpayCall = 0;
		const createOrder = vi.fn(async (amountPaise: number, receipt: string) => {
			razorpayCall += 1;
			return {
				id: `order_${receipt}_v${razorpayCall}`,
				amount: amountPaise,
				currency: 'INR'
			};
		});
		const store = createPrintPaymentsStore(testDb.db, { createOrder });
		const actor = { userId: USER_ID, clientId: CLIENT_ID };

		const first = await store.createOrder(actor, PRINT_REQUEST_ID, ADDRESS);
		expect(first.ok).toBe(true);
		if (!first.ok) return;

		await testDb.db
			.update(printrequests)
			.set({
				events: [
					{
						by: 'maker',
						type: 'quoted',
						reason: 'Updated quote',
						timestamp: '2026-01-02T00:00:00.000Z',
						extra: { quote: 3000 }
					}
				]
			})
			.where(eq(printrequests.id, PRINT_REQUEST_ID));

		const second = await store.createOrder(actor, PRINT_REQUEST_ID, ADDRESS);
		expect(second.ok).toBe(true);
		if (!second.ok) return;

		expect(second.response.razorpayOrderId).not.toBe(first.response.razorpayOrderId);
		expect(createOrder).toHaveBeenCalledTimes(2);
		expect(createOrder).toHaveBeenLastCalledWith(300000, PRINT_REQUEST_ID);
	});

	it('does not downgrade paid requests on fail', async () => {
		await seedQuotedPrintRequest(testDb.db);

		const store = createPrintPaymentsStore(testDb.db, fakeRazorpay());
		const created = await store.createOrder(
			{ userId: USER_ID, clientId: CLIENT_ID },
			PRINT_REQUEST_ID,
			ADDRESS
		);
		expect(created.ok).toBe(true);
		if (!created.ok) return;

		await store.confirmPayment(
			{ userId: USER_ID, clientId: CLIENT_ID },
			PRINT_REQUEST_ID,
			created.response.razorpayOrderId,
			'pay_paid'
		);

		const result = await store.failPayment(
			{ userId: USER_ID, clientId: CLIENT_ID },
			PRINT_REQUEST_ID,
			created.response.razorpayOrderId,
			'user_closed'
		);

		expect(result).toEqual({ ok: true, response: { status: 'paid' } });

		const [row] = await testDb.db
			.select()
			.from(printrequests)
			.where(eq(printrequests.id, PRINT_REQUEST_ID));
		expect(row?.requestStage).toBe('paid');
	});

	it('rejects non-owner order creation', async () => {
		await seedQuotedPrintRequest(testDb.db);

		const store = createPrintPaymentsStore(testDb.db, fakeRazorpay());
		const result = await store.createOrder(
			{ userId: OTHER_USER_ID, clientId: null },
			PRINT_REQUEST_ID,
			ADDRESS
		);

		expect(result).toEqual({ ok: false, status: 403, body: { error: 'forbidden' } });
	});

	it('confirms at the order-created amount when maker re-quotes after order creation', async () => {
		await seedQuotedPrintRequest(testDb.db, { quote: 2500 });

		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const store = createPrintPaymentsStore(testDb.db, fakeRazorpay());
		const actor = { userId: USER_ID, clientId: CLIENT_ID };

		const created = await store.createOrder(actor, PRINT_REQUEST_ID, ADDRESS);
		expect(created.ok).toBe(true);
		if (!created.ok) return;

		const [rowBeforeConfirm] = await testDb.db
			.select()
			.from(printrequests)
			.where(eq(printrequests.id, PRINT_REQUEST_ID));

		await testDb.db
			.update(printrequests)
			.set({
				events: [
					...(Array.isArray(rowBeforeConfirm?.events) ? rowBeforeConfirm.events : []),
					{
						by: 'maker',
						type: 'quoted',
						reason: 'Updated quote',
						timestamp: '2026-01-03T00:00:00.000Z',
						extra: { quote: 3000 }
					}
				]
			})
			.where(eq(printrequests.id, PRINT_REQUEST_ID));

		const confirmed = await store.confirmPayment(
			actor,
			PRINT_REQUEST_ID,
			created.response.razorpayOrderId,
			'pay_drift'
		);

		expect(confirmed).toEqual({ ok: true, response: { status: 'paid' } });

		const purchaseRows = await testDb.db.select().from(purchases);
		expect(purchaseRows).toHaveLength(1);
		expect(purchaseRows[0]?.amount).toBe(2500);

		const [row] = await testDb.db
			.select()
			.from(printrequests)
			.where(eq(printrequests.id, PRINT_REQUEST_ID));
		expect(row?.events).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					type: 'paid',
					extra: expect.objectContaining({ amount: 2500 })
				})
			])
		);

		expect(warnSpy).toHaveBeenCalledWith(
			expect.stringContaining('"message":"print_payments.quote_drift"')
		);

		warnSpy.mockRestore();
	});

	it('writes payment_failed audit when failPayment updates a quoted request', async () => {
		await seedQuotedPrintRequest(testDb.db);

		const store = createPrintPaymentsStore(testDb.db, fakeRazorpay());
		const created = await store.createOrder(
			{ userId: USER_ID, clientId: CLIENT_ID },
			PRINT_REQUEST_ID,
			ADDRESS
		);
		expect(created.ok).toBe(true);
		if (!created.ok) return;

		const result = await store.failPayment(
			{ userId: USER_ID, clientId: CLIENT_ID },
			PRINT_REQUEST_ID,
			created.response.razorpayOrderId,
			'user_closed'
		);

		expect(result).toEqual({ ok: true, response: { status: 'quoted' } });

		const [row] = await testDb.db
			.select()
			.from(printrequests)
			.where(eq(printrequests.id, PRINT_REQUEST_ID));
		expect(row?.orderId).toBeNull();

		const auditRows = await testDb.db
			.select()
			.from(auditLog)
			.where(eq(auditLog.action, 'payment_failed'));
		expect(auditRows).toEqual([
			expect.objectContaining({
				entityType: 'print_request',
				entityId: PRINT_REQUEST_ID,
				action: 'payment_failed',
				providerIds: { razorpayOrderId: created.response.razorpayOrderId },
				meta: { reason: 'user_closed' }
			})
		]);
	});

	it('does not write payment_failed audit when failPayment is a no-op', async () => {
		await seedQuotedPrintRequest(testDb.db);

		const store = createPrintPaymentsStore(testDb.db, fakeRazorpay());
		const created = await store.createOrder(
			{ userId: USER_ID, clientId: CLIENT_ID },
			PRINT_REQUEST_ID,
			ADDRESS
		);
		expect(created.ok).toBe(true);
		if (!created.ok) return;

		const result = await store.failPayment(
			{ userId: USER_ID, clientId: CLIENT_ID },
			PRINT_REQUEST_ID,
			'order_wrong_id',
			'user_closed'
		);

		expect(result).toEqual({ ok: true, response: { status: 'quoted' } });

		const auditRows = await testDb.db
			.select()
			.from(auditLog)
			.where(eq(auditLog.action, 'payment_failed'));
		expect(auditRows).toHaveLength(0);
	});

	it('rejects cross-order replay with order_mismatch and writes nothing', async () => {
		await seedQuotedPrintRequest(testDb.db, { id: PRINT_REQUEST_ID, quote: 2500 });
		await seedQuotedPrintRequest(testDb.db, {
			id: OTHER_PRINT_REQUEST_ID,
			quote: 1800
		});

		const store = createPrintPaymentsStore(testDb.db, fakeRazorpay());
		const actor = { userId: USER_ID, clientId: CLIENT_ID };

		const first = await store.createOrder(actor, PRINT_REQUEST_ID, ADDRESS);
		const second = await store.createOrder(actor, OTHER_PRINT_REQUEST_ID, ADDRESS);
		expect(first.ok).toBe(true);
		expect(second.ok).toBe(true);
		if (!first.ok || !second.ok) return;

		const result = await store.confirmPayment(
			actor,
			PRINT_REQUEST_ID,
			second.response.razorpayOrderId,
			'pay_cross_replay'
		);

		expect(result).toEqual({ ok: false, status: 400, body: { error: 'order_mismatch' } });

		const purchaseRows = await testDb.db.select().from(purchases);
		expect(purchaseRows).toHaveLength(0);

		const [row] = await testDb.db
			.select()
			.from(printrequests)
			.where(eq(printrequests.id, PRINT_REQUEST_ID));
		expect(row?.requestStage).toBe('quoted');
	});
});
