import { createHmac } from 'node:crypto';
import { Hono } from 'hono';
import { describe, expect, it, vi } from 'vitest';
import type { CreatePrintPaymentOrderResponse } from '../contracts/print-payments.js';
import type { Env } from '../env.js';
import type { Database } from '../db/index.js';
import { createPrintPaymentsRoutes } from './print-payments.js';
import type { PrintPaymentsStore } from '../services/print-payments-store.js';
import type { Actor, AppVariables } from '../types/context.js';

const PRINT_REQUEST_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

const testEnv = {
	NODE_ENV: 'test',
	API_PORT: 3001,
	DATABASE_URL: 'postgres://test',
	SUPABASE_URL: 'https://example.supabase.co',
	SUPABASE_ANON_KEY: 'anon-key',
	API_CORS_ORIGINS: 'http://localhost:5173',
	CLIENT_ID_COOKIE_NAME: 'clientId',
	PUBLIC_RAZORPAY_ID: 'rzp_test',
	RAZORPAY_KEY: 'test_razorpay_secret',
	RATE_LIMIT_WINDOW_MS: 60_000,
	RATE_LIMIT_MAX_REQUESTS: 120
} satisfies Env;

const validAddress = {
	name: 'Jane Doe',
	line1: '123 Example Street Block A',
	city: 'Bengaluru',
	pincode: '560001',
	state: 'Karnataka',
	phone: '9876543210'
};

function signPayment(orderId: string, paymentId: string) {
	return createHmac('sha256', testEnv.RAZORPAY_KEY).update(`${orderId}|${paymentId}`).digest('hex');
}

function createTestApp(actor: Actor, printPaymentsStore: PrintPaymentsStore, env: Env = testEnv) {
	const app = new Hono<{ Variables: AppVariables }>();

	app.use('*', async (c, next) => {
		c.set('env', env);
		c.set('db', {} as Database);
		c.set('printPaymentsStore', printPaymentsStore);
		c.set('requestId', 'test-request');
		c.set('actor', actor);
		c.set('user', null);
		await next();
	});

	app.route(
		'/',
		createPrintPaymentsRoutes((c) => c.get('printPaymentsStore'))
	);
	return app;
}

function fakeStore(overrides: Partial<PrintPaymentsStore> = {}): PrintPaymentsStore {
	return {
		createOrder: vi.fn(),
		confirmPayment: vi.fn(),
		failPayment: vi.fn(),
		...overrides
	};
}

describe('print-payments routes', () => {
	it('returns 401 when the actor has no user identity on order', async () => {
		const app = createTestApp({ userId: null, clientId: 'guest-1' }, fakeStore());
		const response = await app.request(`/print-payments/${PRINT_REQUEST_ID}/order`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ address: validAddress })
		});

		expect(response.status).toBe(401);
	});

	it('returns 503 when payments are unconfigured', async () => {
		const env = { ...testEnv, PUBLIC_RAZORPAY_ID: undefined, RAZORPAY_KEY: undefined };
		const app = createTestApp({ userId: 'user-1', clientId: null }, fakeStore(), env);
		const response = await app.request(`/print-payments/${PRINT_REQUEST_ID}/order`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ address: validAddress })
		});

		expect(response.status).toBe(503);
		await expect(response.json()).resolves.toEqual({ error: 'payments_unconfigured' });
	});

	it('returns 403 when a non-owner creates an order', async () => {
		const createOrder = vi.fn(async () => ({
			ok: false as const,
			status: 403 as const,
			body: { error: 'forbidden' as const }
		}));
		const app = createTestApp({ userId: 'user-1', clientId: null }, fakeStore({ createOrder }));

		const response = await app.request(`/print-payments/${PRINT_REQUEST_ID}/order`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ address: validAddress })
		});

		expect(response.status).toBe(403);
	});

	it('returns 404 when the print request is missing', async () => {
		const createOrder = vi.fn(async () => ({
			ok: false as const,
			status: 404 as const,
			body: { error: 'not_found' as const }
		}));
		const app = createTestApp({ userId: 'user-1', clientId: null }, fakeStore({ createOrder }));

		const response = await app.request(`/print-payments/${PRINT_REQUEST_ID}/order`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ address: validAddress })
		});

		expect(response.status).toBe(404);
	});

	it('returns 409 when the print request is not payable', async () => {
		const createOrder = vi.fn(async () => ({
			ok: false as const,
			status: 409 as const,
			body: { error: 'not_payable' as const }
		}));
		const app = createTestApp({ userId: 'user-1', clientId: null }, fakeStore({ createOrder }));

		const response = await app.request(`/print-payments/${PRINT_REQUEST_ID}/order`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ address: validAddress })
		});

		expect(response.status).toBe(409);
	});

	it('ignores client-supplied amount and uses the stored quote', async () => {
		const responseBody: CreatePrintPaymentOrderResponse = {
			razorpayOrderId: 'order_quote',
			amountPaise: 250000,
			currency: 'INR'
		};
		const createOrder = vi.fn(async () => ({ ok: true as const, response: responseBody }));
		const app = createTestApp({ userId: 'user-1', clientId: null }, fakeStore({ createOrder }));

		const response = await app.request(`/print-payments/${PRINT_REQUEST_ID}/order`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ address: validAddress, amount: 1 })
		});

		expect(response.status).toBe(400);
		expect(createOrder).not.toHaveBeenCalled();
	});

	it('returns 400 for an invalid payment signature', async () => {
		const app = createTestApp({ userId: 'user-1', clientId: null }, fakeStore());

		const response = await app.request(`/print-payments/${PRINT_REQUEST_ID}/confirm`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				razorpayOrderId: 'order_1',
				razorpayPaymentId: 'pay_1',
				razorpaySignature: 'bad-signature'
			})
		});

		expect(response.status).toBe(400);
	});

	it('returns already_paid idempotently on confirm', async () => {
		const confirmPayment = vi.fn(async () => ({
			ok: true as const,
			response: { status: 'already_paid' as const }
		}));
		const app = createTestApp({ userId: 'user-1', clientId: null }, fakeStore({ confirmPayment }));

		const response = await app.request(`/print-payments/${PRINT_REQUEST_ID}/confirm`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				razorpayOrderId: 'order_1',
				razorpayPaymentId: 'pay_1',
				razorpaySignature: signPayment('order_1', 'pay_1')
			})
		});

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({ status: 'already_paid' });
	});

	it('returns 400 when razorpayOrderId does not match stored order', async () => {
		const confirmPayment = vi.fn(async () => ({
			ok: false as const,
			status: 400 as const,
			body: { error: 'order_mismatch' as const }
		}));
		const app = createTestApp({ userId: 'user-1', clientId: null }, fakeStore({ confirmPayment }));

		const response = await app.request(`/print-payments/${PRINT_REQUEST_ID}/confirm`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				razorpayOrderId: 'order_wrong',
				razorpayPaymentId: 'pay_1',
				razorpaySignature: signPayment('order_wrong', 'pay_1')
			})
		});

		expect(response.status).toBe(400);
	});

	it('keeps paid print requests paid on fail', async () => {
		const failPayment = vi.fn(async () => ({
			ok: true as const,
			response: { status: 'paid' }
		}));
		const app = createTestApp({ userId: 'user-1', clientId: null }, fakeStore({ failPayment }));

		const response = await app.request(`/print-payments/${PRINT_REQUEST_ID}/fail`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ razorpayOrderId: 'order_1', reason: 'user_closed' })
		});

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({ status: 'paid' });
	});
});
