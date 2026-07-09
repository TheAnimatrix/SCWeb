import { and, eq, inArray, sql } from 'drizzle-orm';
import { CART_ORDER_STATUS } from '../contracts/cart.js';
import { paiseToRupees } from '../contracts/money.js';
import {
	PAYMENT_ATTEMPT_KIND,
	PAYMENT_ATTEMPT_STATUS
} from '../contracts/payment-attempts.js';
import type { Database, DbExecutor } from '../db/index.js';
import { cartItems } from '../db/schema/cartItems.js';
import { carts } from '../db/schema/carts.js';
import { orderItems } from '../db/schema/orderItems.js';
import { orders } from '../db/schema/orders.js';
import { paymentAttempts } from '../db/schema/paymentAttempts.js';
import { printrequests } from '../db/schema/printrequests.js';
import { products } from '../db/schema/products.js';
import type { Env } from '../env.js';
import { storeLog } from '../middleware/logging.js';
import { truncateAuditReason, writeAudit } from './audit.js';
import type { EmailService } from './email.js';
import { notifyOrderReceived, notifyPrintPaymentReceived } from './order-notifications.js';
import { appendLegacyPrintRequestEvent, insertPrintRequestEvent } from './print-request-events.js';
import { buildPaidEvent, buildPaymentFailedEvent } from './print-payments.js';

type RazorpayPaymentEntity = {
	id?: unknown;
	order_id?: unknown;
	amount?: unknown;
	currency?: unknown;
	status?: unknown;
	error_description?: unknown;
	error_reason?: unknown;
};

type RazorpayWebhookPayload = {
	event?: unknown;
	payload?: {
		payment?: {
			entity?: RazorpayPaymentEntity;
		};
	};
};

type CapturedHandlerResult = {
	status: 'processed' | 'already_processed' | 'ignored';
	notifyCustomer: boolean;
};

export type RazorpayWebhookResult =
	| { ok: true; status: 'processed' | 'ignored' | 'already_processed' }
	| { ok: false; status: 400; error: 'invalid_payload' };

export type RazorpayWebhookServiceOptions = {
	emailService?: EmailService;
	env?: Env;
};

export interface RazorpayWebhookService {
	handle(payload: RazorpayWebhookPayload, eventId?: string | null): Promise<RazorpayWebhookResult>;
}

function asString(value: unknown): string | null {
	return typeof value === 'string' && value.length > 0 ? value : null;
}

function paymentFromPayload(payload: RazorpayWebhookPayload) {
	const event = asString(payload.event);
	const payment = payload.payload?.payment?.entity;
	const providerPaymentId = asString(payment?.id);
	const providerOrderId = asString(payment?.order_id);

	if (!event || !providerPaymentId || !providerOrderId) {
		return null;
	}

	return {
		event,
		providerPaymentId,
		providerOrderId,
		amountPaise: typeof payment?.amount === 'number' ? payment.amount : null,
		currency: asString(payment?.currency),
		failureReason:
			asString(payment?.error_description) ??
			asString(payment?.error_reason) ??
			'Razorpay payment failed'
	};
}

async function decrementProductStock(
	tx: DbExecutor,
	productId: string,
	qty: number
): Promise<boolean> {
	const updated = await tx
		.update(products)
		.set({
			stock: sql`jsonb_set(${products.stock}, '{count}', to_jsonb((${products.stock}->>'count')::int - ${qty}))`
		})
		.where(and(eq(products.id, productId), sql`(${products.stock}->>'count')::int >= ${qty}`))
		.returning({ id: products.id });

	return updated.length > 0;
}

function shouldDecrementStock(stock: unknown): boolean {
	if (!stock || typeof stock !== 'object' || Array.isArray(stock)) return false;
	const count = Number((stock as { count?: unknown }).count);
	return Number.isFinite(count);
}

async function markAttemptPaid(
	tx: DbExecutor,
	attemptId: string,
	providerPaymentId: string
) {
	await tx
		.update(paymentAttempts)
		.set({
			status: PAYMENT_ATTEMPT_STATUS.PAID,
			providerPaymentId,
			failureReason: null,
			updatedAt: sql`now()`
		})
		.where(eq(paymentAttempts.id, attemptId));
}

async function markAttemptFailed(tx: DbExecutor, attemptId: string, reason: string) {
	await tx
		.update(paymentAttempts)
		.set({
			status: PAYMENT_ATTEMPT_STATUS.FAILED,
			failureReason: truncateAuditReason(reason) ?? reason,
			updatedAt: sql`now()`
		})
		.where(eq(paymentAttempts.id, attemptId));
}

async function findAttemptByProviderOrderId(tx: DbExecutor, providerOrderId: string) {
	const [attempt] = await tx
		.select()
		.from(paymentAttempts)
		.where(eq(paymentAttempts.providerOrderId, providerOrderId))
		.limit(1);

	return attempt ?? null;
}

async function handleCartCaptured(
	tx: DbExecutor,
	attempt: typeof paymentAttempts.$inferSelect,
	payment: ReturnType<typeof paymentFromPayload> & {},
	eventId?: string | null
): Promise<CapturedHandlerResult> {
	const [order] = await tx
		.select()
		.from(orders)
		.where(eq(orders.id, attempt.entityId))
		.for('update')
		.limit(1);

	if (!order) return { status: 'ignored', notifyCustomer: false };
	if (order.status === CART_ORDER_STATUS.PAID) {
		return { status: 'already_processed', notifyCustomer: false };
	}

	const claimed = await tx
		.update(orders)
		.set({
			status: CART_ORDER_STATUS.PAID,
			updatedAt: sql`now()`
		})
		.where(
			and(
				eq(orders.id, order.id),
				inArray(orders.status, [CART_ORDER_STATUS.PAYMENT_PENDING, CART_ORDER_STATUS.FAILED])
			)
		)
		.returning({ id: orders.id });

	if (claimed.length === 0) return { status: 'ignored', notifyCustomer: false };

	await markAttemptPaid(tx, attempt.id, payment.providerPaymentId);

	await writeAudit(tx, {
		actorUserId: null,
		actorClientId: null,
		entityType: 'order',
		entityId: order.id,
		action: 'paid_webhook',
		fromState: order.status,
		toState: CART_ORDER_STATUS.PAID,
		providerIds: {
			razorpayOrderId: payment.providerOrderId,
			razorpayPaymentId: payment.providerPaymentId
		},
		meta: eventId ? { razorpayEventId: eventId } : null
	});

	const lines = await tx
		.select({
			productId: orderItems.productId,
			qty: orderItems.qty,
			stock: products.stock
		})
		.from(orderItems)
		.innerJoin(products, eq(orderItems.productId, products.id))
		.where(eq(orderItems.orderId, order.id));

	let stockConflict: { productId: string; qty: number } | null = null;

	for (const line of lines) {
		if (!shouldDecrementStock(line.stock)) continue;

		const decremented = await decrementProductStock(tx, line.productId, line.qty);
		if (!decremented) {
			stockConflict = { productId: line.productId, qty: line.qty };
			break;
		}
	}

	await tx
		.update(carts)
		.set({
			status: CART_ORDER_STATUS.PAID,
			updatedAt: sql`now()`
		})
		.where(eq(carts.id, order.cartId));

	await tx.delete(cartItems).where(eq(cartItems.cartId, order.cartId));

	if (stockConflict) {
		await writeAudit(tx, {
			actorUserId: null,
			actorClientId: null,
			entityType: 'order',
			entityId: order.id,
			action: 'paid_stock_conflict',
			fromState: CART_ORDER_STATUS.PAID,
			toState: CART_ORDER_STATUS.PAID,
			providerIds: {
				razorpayOrderId: payment.providerOrderId,
				razorpayPaymentId: payment.providerPaymentId
			},
			meta: {
				productId: stockConflict.productId,
				qty: stockConflict.qty,
				requiresManualSupport: true,
				source: 'razorpay_webhook',
				...(eventId ? { razorpayEventId: eventId } : {})
			}
		});
	}

	return { status: 'processed', notifyCustomer: stockConflict === null };
}

async function handlePrintCaptured(
	tx: DbExecutor,
	attempt: typeof paymentAttempts.$inferSelect,
	payment: ReturnType<typeof paymentFromPayload> & {},
	eventId?: string | null
): Promise<CapturedHandlerResult> {
	const [row] = await tx
		.select()
		.from(printrequests)
		.where(eq(printrequests.id, attempt.entityId))
		.for('update')
		.limit(1);

	if (!row) return { status: 'ignored', notifyCustomer: false };
	if (row.requestStage === 'paid') return { status: 'already_processed', notifyCustomer: false };
	if (row.requestStage !== 'quoted') return { status: 'ignored', notifyCustomer: false };

	const amountInr = paiseToRupees(attempt.amountPaise);
	const paidEvent = {
		...buildPaidEvent(payment.providerOrderId, payment.providerPaymentId, amountInr),
		by: 'system',
		reason: 'Payment confirmed by Razorpay webhook'
	};

	const claimed = await tx
		.update(printrequests)
		.set({
			requestStage: 'paid',
			lastUpdated: sql`now()`
		})
		.where(and(eq(printrequests.id, row.id), eq(printrequests.requestStage, 'quoted')))
		.returning({ id: printrequests.id });

	if (claimed.length === 0) return { status: 'ignored', notifyCustomer: false };

	await markAttemptPaid(tx, attempt.id, payment.providerPaymentId);

	await insertPrintRequestEvent(tx, {
		printRequestId: row.id,
		type: 'paid',
		actorUserId: null,
		actorRole: 'system',
		amountPaise: attempt.amountPaise,
		providerOrderId: payment.providerOrderId,
		providerPaymentId: payment.providerPaymentId,
		reason: paidEvent.reason,
		metadata: {
			...(paidEvent.extra ?? {}),
			source: 'razorpay_webhook',
			...(eventId ? { razorpayEventId: eventId } : {})
		}
	});

	await appendLegacyPrintRequestEvent(tx, row.id, paidEvent);

	await writeAudit(tx, {
		actorUserId: null,
		actorClientId: null,
		entityType: 'print_request',
		entityId: row.id,
		action: 'paid_webhook',
		fromState: row.requestStage,
		toState: 'paid',
		providerIds: {
			razorpayOrderId: payment.providerOrderId,
			razorpayPaymentId: payment.providerPaymentId
		},
		meta: eventId ? { razorpayEventId: eventId } : null
	});

	return { status: 'processed', notifyCustomer: true };
}

async function handleCaptured(
	db: Database,
	payment: ReturnType<typeof paymentFromPayload> & {},
	eventId?: string | null
) {
	let orderToNotify: string | null = null;
	let printToNotify: { id: string; userId: string; amountInr: number } | null = null;

	const status = await db.transaction(async (tx) => {
		const attempt = await findAttemptByProviderOrderId(tx, payment.providerOrderId);
		if (!attempt) return 'ignored' as const;
		if (attempt.status === PAYMENT_ATTEMPT_STATUS.PAID) return 'already_processed' as const;

		if (attempt.amountPaise !== payment.amountPaise || payment.currency !== 'INR') {
			storeLog('warn', 'razorpay.webhook.payment_amount_mismatch', {
				providerOrderId: payment.providerOrderId,
				providerPaymentId: payment.providerPaymentId,
				expectedAmountPaise: attempt.amountPaise,
				actualAmountPaise: payment.amountPaise,
				currency: payment.currency
			});
			return 'ignored' as const;
		}

		if (attempt.kind === PAYMENT_ATTEMPT_KIND.CART_ORDER) {
			const result = await handleCartCaptured(tx, attempt, payment, eventId);
			if (result.status === 'processed' && result.notifyCustomer) orderToNotify = attempt.entityId;
			return result.status;
		}

		if (attempt.kind === PAYMENT_ATTEMPT_KIND.PRINT_REQUEST) {
			const result = await handlePrintCaptured(tx, attempt, payment, eventId);
			if (result.status === 'processed' && result.notifyCustomer) {
				const [row] = await tx
					.select({ userId: printrequests.userId })
					.from(printrequests)
					.where(eq(printrequests.id, attempt.entityId))
					.limit(1);
				if (row?.userId) {
					printToNotify = {
						id: attempt.entityId,
						userId: row.userId,
						amountInr: paiseToRupees(attempt.amountPaise)
					};
				}
			}
			return result.status;
		}

		return 'ignored' as const;
	});

	return { status, orderToNotify, printToNotify };
}

async function handleFailed(
	db: Database,
	payment: ReturnType<typeof paymentFromPayload> & {},
	eventId?: string | null
) {
	return db.transaction(async (tx) => {
		const attempt = await findAttemptByProviderOrderId(tx, payment.providerOrderId);
		if (!attempt) return 'ignored' as const;
		if (attempt.status !== PAYMENT_ATTEMPT_STATUS.PENDING) return 'already_processed' as const;

		await markAttemptFailed(tx, attempt.id, payment.failureReason);

		if (attempt.kind === PAYMENT_ATTEMPT_KIND.CART_ORDER) {
			const [order] = await tx
				.select()
				.from(orders)
				.where(eq(orders.id, attempt.entityId))
				.for('update')
				.limit(1);

			if (!order || order.status !== CART_ORDER_STATUS.PAYMENT_PENDING) {
				return 'ignored' as const;
			}

			await tx
				.update(orders)
				.set({ status: CART_ORDER_STATUS.FAILED, updatedAt: sql`now()` })
				.where(eq(orders.id, order.id));
			await tx
				.update(carts)
				.set({ status: CART_ORDER_STATUS.FAILED, updatedAt: sql`now()` })
				.where(eq(carts.id, order.cartId));
			await writeAudit(tx, {
				actorUserId: null,
				actorClientId: null,
				entityType: 'order',
				entityId: order.id,
				action: 'failed_webhook',
				fromState: CART_ORDER_STATUS.PAYMENT_PENDING,
				toState: CART_ORDER_STATUS.FAILED,
				providerIds: { razorpayOrderId: payment.providerOrderId },
				meta: {
					reason: truncateAuditReason(payment.failureReason),
					...(eventId ? { razorpayEventId: eventId } : {})
				}
			});
		}

		if (attempt.kind === PAYMENT_ATTEMPT_KIND.PRINT_REQUEST) {
			const [row] = await tx
				.select()
				.from(printrequests)
				.where(eq(printrequests.id, attempt.entityId))
				.for('update')
				.limit(1);

			if (!row || row.requestStage !== 'quoted') return 'ignored' as const;

			const failedEvent = {
				...buildPaymentFailedEvent(payment.providerOrderId, payment.failureReason),
				by: 'system'
			};

			await tx
				.update(printrequests)
				.set({
					activePaymentAttemptId: null,
					lastUpdated: sql`now()`
				})
				.where(eq(printrequests.id, row.id));

			await insertPrintRequestEvent(tx, {
				printRequestId: row.id,
				type: 'payment_failed',
				actorUserId: null,
				actorRole: 'system',
				providerOrderId: payment.providerOrderId,
				reason: failedEvent.reason,
				metadata: {
					...(failedEvent.extra ?? {}),
					source: 'razorpay_webhook',
					...(eventId ? { razorpayEventId: eventId } : {})
				}
			});

			await appendLegacyPrintRequestEvent(tx, row.id, failedEvent);

			await writeAudit(tx, {
				actorUserId: null,
				actorClientId: null,
				entityType: 'print_request',
				entityId: row.id,
				action: 'payment_failed_webhook',
				fromState: row.requestStage,
				toState: row.requestStage,
				providerIds: { razorpayOrderId: payment.providerOrderId },
				meta: {
					reason: truncateAuditReason(payment.failureReason),
					...(eventId ? { razorpayEventId: eventId } : {})
				}
			});
		}

		return 'processed' as const;
	});
}

export function createRazorpayWebhookService(
	db: Database,
	options?: RazorpayWebhookServiceOptions
): RazorpayWebhookService {
	return {
		async handle(payload, eventId) {
			const payment = paymentFromPayload(payload);
			if (!payment) {
				return { ok: false, status: 400, error: 'invalid_payload' };
			}

			if (payment.event === 'payment.captured') {
				const result = await handleCaptured(db, payment, eventId);
				if (result.orderToNotify && options?.emailService && options.env) {
					notifyOrderReceived(db, options.emailService, options.env, result.orderToNotify);
				}
				if (result.printToNotify && options?.emailService && options.env) {
					notifyPrintPaymentReceived(
						db,
						options.emailService,
						options.env,
						result.printToNotify.id,
						result.printToNotify.userId,
						result.printToNotify.amountInr
					);
				}
				return { ok: true, status: result.status };
			}

			if (payment.event === 'payment.failed') {
				const status = await handleFailed(db, payment, eventId);
				return { ok: true, status };
			}

			return { ok: true, status: 'ignored' };
		}
	};
}
