import { Hono } from 'hono';
import { verifyRazorpayWebhookSignature } from '../lib/razorpay.js';
import { logCheckoutTransition } from '../middleware/logging.js';
import type { RazorpayWebhookService } from '../services/razorpay-webhooks.js';
import type { AppVariables } from '../types/context.js';

export function createRazorpayWebhookRoutes(
	getWebhookService: (c: {
		get: (key: 'razorpayWebhookService') => RazorpayWebhookService;
	}) => RazorpayWebhookService
) {
	const razorpayWebhookRoutes = new Hono<{ Variables: AppVariables }>();

	razorpayWebhookRoutes.post('/webhooks/razorpay', async (c) => {
		const env = c.get('env');
		const webhookSecret = env.RAZORPAY_WEBHOOK_SECRET;

		if (!webhookSecret) {
			logCheckoutTransition(c, 'error', 'razorpay.webhook.unconfigured', {});
			return c.json({ error: 'webhook_unconfigured' }, 503);
		}

		const signature = c.req.header('x-razorpay-signature');
		if (!signature) {
			logCheckoutTransition(c, 'warn', 'razorpay.webhook.missing_signature', {});
			return c.json({ error: 'missing_signature' }, 400);
		}

		const rawBody = await c.req.text();
		if (!verifyRazorpayWebhookSignature(rawBody, signature, webhookSecret)) {
			logCheckoutTransition(c, 'warn', 'razorpay.webhook.invalid_signature', {});
			return c.json({ error: 'invalid_signature' }, 400);
		}

		let payload: unknown;
		try {
			payload = JSON.parse(rawBody);
		} catch {
			return c.json({ error: 'invalid_json' }, 400);
		}

		const result = await getWebhookService(c).handle(
			payload as never,
			c.req.header('x-razorpay-event-id')
		);

		if (!result.ok) {
			logCheckoutTransition(c, 'warn', 'razorpay.webhook.invalid_payload', {});
			return c.json({ error: result.error }, result.status);
		}

		logCheckoutTransition(c, 'info', 'razorpay.webhook.completed', {
			status: result.status
		});

		return c.json({ ok: true, status: result.status });
	});

	return razorpayWebhookRoutes;
}

export const razorpayWebhookRoutes = createRazorpayWebhookRoutes((c) =>
	c.get('razorpayWebhookService')
);
