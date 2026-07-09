import { createHmac } from 'node:crypto';
import { Hono } from 'hono';
import { describe, expect, it, vi } from 'vitest';
import type { Env } from '../env.js';
import { csrfMiddleware } from '../middleware/csrf.js';
import type { RazorpayWebhookService } from '../services/razorpay-webhooks.js';
import { emailEnvDefaults } from '../test/env-defaults.js';
import type { Actor, AppVariables } from '../types/context.js';
import { createRazorpayWebhookRoutes } from './razorpay-webhooks.js';

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
	RAZORPAY_WEBHOOK_SECRET: 'test_webhook_secret',
	RATE_LIMIT_WINDOW_MS: 60_000,
	RATE_LIMIT_MAX_REQUESTS: 120,
	...emailEnvDefaults
} satisfies Env;

function signWebhook(rawBody: string, secret = testEnv.RAZORPAY_WEBHOOK_SECRET) {
	return createHmac('sha256', secret).update(rawBody).digest('hex');
}

function createTestApp(
	webhookService: RazorpayWebhookService,
	env: Env = testEnv,
	actor: Actor = { userId: null, clientId: null }
) {
	const app = new Hono<{ Variables: AppVariables }>();

	app.use('*', async (c, next) => {
		c.set('env', env);
		c.set('requestId', 'test-request');
		c.set('actor', actor);
		c.set('razorpayWebhookService', webhookService);
		await next();
	});
	app.use('*', csrfMiddleware());
	app.route(
		'/',
		createRazorpayWebhookRoutes((c) => c.get('razorpayWebhookService'))
	);

	return app;
}

function fakeWebhookService(overrides: Partial<RazorpayWebhookService> = {}): RazorpayWebhookService {
	return {
		handle: vi.fn(async () => ({ ok: true as const, status: 'processed' as const })),
		...overrides
	};
}

describe('razorpay webhook routes', () => {
	it('accepts a signed raw-body webhook without browser origin headers', async () => {
		const payload = {
			event: 'payment.captured',
			payload: {
				payment: {
					entity: {
						id: 'pay_1',
						order_id: 'order_1',
						amount: 50000,
						currency: 'INR'
					}
				}
			}
		};
		const rawBody = JSON.stringify(payload);
		const service = fakeWebhookService();
		const app = createTestApp(service);

		const response = await app.request('/webhooks/razorpay', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-Razorpay-Signature': signWebhook(rawBody),
				'X-Razorpay-Event-Id': 'evt_1'
			},
			body: rawBody
		});

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({ ok: true, status: 'processed' });
		expect(service.handle).toHaveBeenCalledWith(payload, 'evt_1');
	});

	it('rejects invalid signatures before calling the service', async () => {
		const rawBody = JSON.stringify({ event: 'payment.captured' });
		const service = fakeWebhookService();
		const app = createTestApp(service);

		const response = await app.request('/webhooks/razorpay', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-Razorpay-Signature': 'bad'
			},
			body: rawBody
		});

		expect(response.status).toBe(400);
		await expect(response.json()).resolves.toEqual({ error: 'invalid_signature' });
		expect(service.handle).not.toHaveBeenCalled();
	});

	it('returns 503 when the webhook secret is not configured', async () => {
		const env = { ...testEnv, RAZORPAY_WEBHOOK_SECRET: undefined };
		const app = createTestApp(fakeWebhookService(), env);
		const rawBody = JSON.stringify({ event: 'payment.captured' });

		const response = await app.request('/webhooks/razorpay', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-Razorpay-Signature': signWebhook(rawBody)
			},
			body: rawBody
		});

		expect(response.status).toBe(503);
		await expect(response.json()).resolves.toEqual({ error: 'webhook_unconfigured' });
	});
});
