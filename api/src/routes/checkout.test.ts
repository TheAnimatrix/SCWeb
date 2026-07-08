import { createHmac } from 'node:crypto';
import { Hono } from 'hono';
import { describe, expect, it, vi } from 'vitest';
import type { CreateCheckoutOrderResponse } from '../contracts/checkout.js';
import type { Env } from '../env.js';
import type { Database } from '../db/index.js';
import { createCheckoutRoutes } from './checkout.js';
import type { CheckoutStore } from '../services/checkout-store.js';
import type { Actor, AppVariables } from '../types/context.js';

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

function createTestApp(actor: Actor, checkoutStore: CheckoutStore, env: Env = testEnv) {
	const app = new Hono<{ Variables: AppVariables }>();

	app.use('*', async (c, next) => {
		c.set('env', env);
		c.set('db', {} as Database);
		c.set('checkoutStore', checkoutStore);
		c.set('requestId', 'test-request');
		c.set('actor', actor);
		c.set('user', null);
		await next();
	});

	app.route(
		'/',
		createCheckoutRoutes((c) => c.get('checkoutStore'))
	);
	return app;
}

function fakeStore(overrides: Partial<CheckoutStore> = {}): CheckoutStore {
	return {
		createOrder: vi.fn(),
		confirmOrder: vi.fn(),
		failOrder: vi.fn(),
		...overrides
	};
}

describe('checkout routes', () => {
	it('returns 401 when the actor has no identity on order', async () => {
		const app = createTestApp({ userId: null, clientId: null }, fakeStore());
		const response = await app.request('/checkout/order', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ address: validAddress })
		});

		expect(response.status).toBe(401);
	});

	it('returns 503 when payments are unconfigured', async () => {
		const env = { ...testEnv, PUBLIC_RAZORPAY_ID: undefined, RAZORPAY_KEY: undefined };
		const app = createTestApp({ userId: null, clientId: 'guest-1' }, fakeStore(), env);
		const response = await app.request('/checkout/order', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ address: validAddress })
		});

		expect(response.status).toBe(503);
		await expect(response.json()).resolves.toEqual({ error: 'payments_unconfigured' });
	});

	it('returns 400 for an empty cart', async () => {
		const createOrder = vi.fn(async () => ({
			ok: false as const,
			status: 400 as const,
			body: { error: 'cart_empty' as const }
		}));
		const app = createTestApp({ userId: null, clientId: 'guest-1' }, fakeStore({ createOrder }));

		const response = await app.request('/checkout/order', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ address: validAddress })
		});

		expect(response.status).toBe(400);
	});

	it('returns 409 when stock is insufficient', async () => {
		const createOrder = vi.fn(async () => ({
			ok: false as const,
			status: 409 as const,
			body: { error: 'insufficient_stock' as const, productId: 'p1', limit: 2 }
		}));
		const app = createTestApp({ userId: null, clientId: 'guest-1' }, fakeStore({ createOrder }));

		const response = await app.request('/checkout/order', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ address: validAddress })
		});

		expect(response.status).toBe(409);
	});

	it('reuses an existing checkout order idempotently', async () => {
		const responseBody: CreateCheckoutOrderResponse = {
			orderId: '00000000-0000-0000-0000-000000000001',
			razorpayOrderId: 'order_existing',
			amountPaise: 50000,
			currency: 'INR'
		};
		const createOrder = vi.fn(async () => ({ ok: true as const, response: responseBody }));
		const app = createTestApp({ userId: null, clientId: 'guest-1' }, fakeStore({ createOrder }));

		const first = await app.request('/checkout/order', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ address: validAddress })
		});
		const second = await app.request('/checkout/order', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ address: validAddress })
		});

		expect(first.status).toBe(200);
		expect(second.status).toBe(200);
		expect(createOrder).toHaveBeenCalledTimes(2);
	});

	it('returns 400 for an invalid payment signature', async () => {
		const app = createTestApp({ userId: null, clientId: 'guest-1' }, fakeStore());

		const response = await app.request('/checkout/confirm', {
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

	it('returns 403 when confirming another actor order', async () => {
		const confirmOrder = vi.fn(async () => ({
			ok: false as const,
			status: 403 as const,
			body: { error: 'forbidden' as const }
		}));
		const app = createTestApp({ userId: null, clientId: 'guest-1' }, fakeStore({ confirmOrder }));

		const response = await app.request('/checkout/confirm', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				razorpayOrderId: 'order_1',
				razorpayPaymentId: 'pay_1',
				razorpaySignature: signPayment('order_1', 'pay_1')
			})
		});

		expect(response.status).toBe(403);
	});

	it('returns already_paid idempotently on confirm', async () => {
		const confirmOrder = vi.fn(async () => ({
			ok: true as const,
			response: { status: 'already_paid' as const }
		}));
		const app = createTestApp({ userId: null, clientId: 'guest-1' }, fakeStore({ confirmOrder }));

		const response = await app.request('/checkout/confirm', {
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

	it('keeps paid orders paid on fail', async () => {
		const failOrder = vi.fn(async () => ({
			ok: true as const,
			response: { status: 'paid' }
		}));
		const app = createTestApp({ userId: null, clientId: 'guest-1' }, fakeStore({ failOrder }));

		const response = await app.request('/checkout/fail', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ razorpayOrderId: 'order_1', reason: 'user_closed' })
		});

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({ status: 'paid' });
	});
});
