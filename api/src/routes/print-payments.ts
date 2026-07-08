import { Hono } from 'hono';
import {
	confirmPrintPaymentBodySchema,
	createPrintPaymentOrderBodySchema,
	failPrintPaymentBodySchema,
	printRequestIdParamSchema
} from '../contracts/print-payments.js';
import { verifyRazorpaySignature } from '../lib/razorpay.js';
import { validateJson, validateParam } from '../lib/validation.js';
import { logCheckoutTransition } from '../middleware/logging.js';
import { requireAuth } from '../middleware/require-auth.js';
import { isPaymentsConfigured } from '../services/razorpay-client.js';
import type { PrintPaymentsStore } from '../services/print-payments-store.js';
import type { AppVariables } from '../types/context.js';

export function createPrintPaymentsRoutes(
	getPrintPaymentsStore: (c: {
		get: (key: 'printPaymentsStore') => PrintPaymentsStore;
	}) => PrintPaymentsStore
) {
	const printPaymentsRoutes = new Hono<{ Variables: AppVariables }>();

	printPaymentsRoutes.post(
		'/print-payments/:printRequestId/order',
		requireAuth(),
		validateParam(printRequestIdParamSchema),
		validateJson(createPrintPaymentOrderBodySchema),
		async (c) => {
			const actor = c.get('actor');
			const env = c.get('env');
			const { printRequestId } = c.req.valid('param');

			if (!isPaymentsConfigured(env)) {
				return c.json({ error: 'payments_unconfigured' }, 503);
			}

			const body = c.req.valid('json');
			const result = await getPrintPaymentsStore(c).createOrder(
				actor,
				printRequestId,
				body.address
			);

			if (!result.ok) {
				if (result.status === 409) {
					logCheckoutTransition(c, 'warn', 'print-payments.order.rejected', {
						printRequestId,
						reason: result.body.error
					});
				}
				if (result.status === 500) {
					logCheckoutTransition(c, 'error', 'print-payments.order.razorpay_failed', {
						printRequestId
					});
				}
				return c.json(result.body, result.status);
			}

			logCheckoutTransition(c, 'info', 'print-payments.order.created', {
				printRequestId,
				razorpayOrderId: result.response.razorpayOrderId,
				amountPaise: result.response.amountPaise
			});

			return c.json(result.response);
		}
	);

	printPaymentsRoutes.post(
		'/print-payments/:printRequestId/confirm',
		requireAuth(),
		validateParam(printRequestIdParamSchema),
		validateJson(confirmPrintPaymentBodySchema),
		async (c) => {
			const actor = c.get('actor');
			const env = c.get('env');
			const { printRequestId } = c.req.valid('param');

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
				logCheckoutTransition(c, 'warn', 'print-payments.confirm.invalid_signature', {
					printRequestId,
					razorpayOrderId: body.razorpayOrderId,
					razorpayPaymentId: body.razorpayPaymentId
				});
				return c.json({ error: 'invalid_signature' }, 400);
			}

			const result = await getPrintPaymentsStore(c).confirmPayment(
				actor,
				printRequestId,
				body.razorpayOrderId,
				body.razorpayPaymentId
			);

			if (!result.ok) {
				logCheckoutTransition(c, 'warn', 'print-payments.confirm.rejected', {
					printRequestId,
					razorpayOrderId: body.razorpayOrderId,
					reason: result.body.error
				});
				return c.json(result.body, result.status);
			}

			logCheckoutTransition(c, 'info', 'print-payments.confirm.completed', {
				printRequestId,
				razorpayOrderId: body.razorpayOrderId,
				razorpayPaymentId: body.razorpayPaymentId,
				status: result.response.status
			});

			return c.json(result.response);
		}
	);

	printPaymentsRoutes.post(
		'/print-payments/:printRequestId/fail',
		requireAuth(),
		validateParam(printRequestIdParamSchema),
		validateJson(failPrintPaymentBodySchema),
		async (c) => {
			const actor = c.get('actor');
			const { printRequestId } = c.req.valid('param');
			const body = c.req.valid('json');

			const result = await getPrintPaymentsStore(c).failPayment(
				actor,
				printRequestId,
				body.razorpayOrderId,
				body.reason
			);

			if (!result.ok) {
				logCheckoutTransition(c, 'warn', 'print-payments.fail.rejected', {
					printRequestId,
					razorpayOrderId: body.razorpayOrderId,
					reason: result.body.error
				});
				return c.json(result.body, result.status);
			}

			logCheckoutTransition(c, 'info', 'print-payments.fail.completed', {
				printRequestId,
				razorpayOrderId: body.razorpayOrderId,
				status: result.response.status,
				reason: body.reason ?? null
			});

			return c.json(result.response);
		}
	);

	return printPaymentsRoutes;
}

export const printPaymentsRoutes = createPrintPaymentsRoutes((c) => c.get('printPaymentsStore'));
