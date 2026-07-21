import { Hono } from 'hono';
import {
	confirmCheckoutBodySchema,
	createCheckoutOrderBodySchema,
	failCheckoutBodySchema
} from '../contracts/checkout.js';
import { verifyRazorpaySignature } from '../lib/razorpay.js';
import { validateJson } from '../lib/validation.js';
import { logCheckoutTransition } from '../middleware/logging.js';
import { hasActor } from '../services/cart-store.js';
import { normalizeCheckoutOrderAddresses } from '../services/checkout.js';
import { isPaymentsConfigured } from '../services/razorpay-client.js';
import type { CheckoutStore } from '../services/checkout-store.js';
import type { AppVariables } from '../types/context.js';

export function createCheckoutRoutes(
	getCheckoutStore: (c: { get: (key: 'checkoutStore') => CheckoutStore }) => CheckoutStore
) {
	const checkoutRoutes = new Hono<{ Variables: AppVariables }>();

	checkoutRoutes.post('/checkout/order', validateJson(createCheckoutOrderBodySchema), async (c) => {
		const actor = c.get('actor');
		const env = c.get('env');

		if (!hasActor(actor)) {
			return c.json({ error: 'unauthorized', message: 'Actor identity required' }, 401);
		}

		if (!isPaymentsConfigured(env)) {
			return c.json({ error: 'payments_unconfigured' }, 503);
		}

		const body = c.req.valid('json');
		const addresses = normalizeCheckoutOrderAddresses(body.address, body.billingAddress);
		const result = await getCheckoutStore(c).createOrder(actor, addresses, {
			refreshPayment: body.refreshPayment
		});

		if (!result.ok) {
			if (result.status === 400) {
				logCheckoutTransition(c, 'warn', 'checkout.order.rejected', {
					reason: result.body.error
				});
			}

			if (result.status === 409) {
				logCheckoutTransition(c, 'warn', 'checkout.order.rejected', {
					reason: result.body.error,
					productId: result.body.productId,
					...(result.body.error === 'insufficient_stock'
						? { limit: result.body.limit }
						: {})
				});
			}

			if (result.status === 500) {
				logCheckoutTransition(c, 'error', 'checkout.order.razorpay_failed', {
					reason: result.body.error
				});
			}

			return c.json(result.body, result.status);
		}

		logCheckoutTransition(c, 'info', 'checkout.order.created', {
			orderId: result.response.orderId,
			razorpayOrderId: result.response.razorpayOrderId,
			amountPaise: result.response.amountPaise
		});

		return c.json(result.response);
	});

	checkoutRoutes.post('/checkout/confirm', validateJson(confirmCheckoutBodySchema), async (c) => {
		const actor = c.get('actor');
		const env = c.get('env');

		if (!hasActor(actor)) {
			return c.json({ error: 'unauthorized', message: 'Actor identity required' }, 401);
		}

		if (!isPaymentsConfigured(env)) {
			return c.json({ error: 'payments_unconfigured' }, 503);
		}

		const body = c.req.valid('json');

		if (
			!verifyRazorpaySignature(
				body.razorpayOrderId,
				body.razorpayPaymentId,
				body.razorpaySignature,
				env.RAZORPAY_KEY!
			)
		) {
			logCheckoutTransition(c, 'warn', 'checkout.confirm.invalid_signature', {
				razorpayOrderId: body.razorpayOrderId,
				razorpayPaymentId: body.razorpayPaymentId
			});
			return c.json({ error: 'invalid_signature' }, 400);
		}

		const result = await getCheckoutStore(c).confirmOrder(
			actor,
			body.razorpayOrderId,
			body.razorpayPaymentId
		);

		if (!result.ok) {
			logCheckoutTransition(c, 'warn', 'checkout.confirm.rejected', {
				razorpayOrderId: body.razorpayOrderId,
				reason: result.body.error
			});
			return c.json(result.body, result.status);
		}

		logCheckoutTransition(c, 'info', 'checkout.confirm.completed', {
			razorpayOrderId: body.razorpayOrderId,
			razorpayPaymentId: body.razorpayPaymentId,
			status: result.response.status
		});

		return c.json(result.response);
	});

	checkoutRoutes.post('/checkout/fail', validateJson(failCheckoutBodySchema), async (c) => {
		const actor = c.get('actor');

		if (!hasActor(actor)) {
			return c.json({ error: 'unauthorized', message: 'Actor identity required' }, 401);
		}

		const body = c.req.valid('json');
		const result = await getCheckoutStore(c).failOrder(actor, body.razorpayOrderId, body.reason);

		if (!result.ok) {
			logCheckoutTransition(c, 'warn', 'checkout.fail.rejected', {
				razorpayOrderId: body.razorpayOrderId,
				reason: result.body.error
			});
			return c.json(result.body, result.status);
		}

		logCheckoutTransition(c, 'info', 'checkout.fail.completed', {
			razorpayOrderId: body.razorpayOrderId,
			status: result.response.status,
			reason: body.reason ?? null
		});

		return c.json(result.response);
	});

	return checkoutRoutes;
}

export const checkoutRoutes = createCheckoutRoutes((c) => c.get('checkoutStore'));
