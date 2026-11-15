import { and, eq, sql } from 'drizzle-orm';
import { CART_ORDER_STATUS } from '../contracts/cart.js';
import { PAYMENT_ATTEMPT_KIND, PAYMENT_ATTEMPT_STATUS } from '../contracts/payment-attempts.js';
import type { Database, DbExecutor } from '../db/index.js';
import { orders } from '../db/schema/orders.js';
import { paymentAttempts } from '../db/schema/paymentAttempts.js';
import { printrequests } from '../db/schema/printrequests.js';
import { storeLog } from '../middleware/logging.js';
import { truncateAuditReason, writeAudit } from './audit.js';
import {
	externalFailureReason,
	failPendingAttempt,
	lockCartOrderForPayment,
	recordCartSettlementAttention,
	reopenCartAfterFailedPayment,
	settleCartPayment
} from './checkout-store.js';
import type { MailService } from './mail.js';
import { notifyOrderReceived } from './order-notifications.js';
import { recordPaymentAttention } from './payment-attention.js';
import {
	notifyPrintPaid,
	recordPrintSettlementAttention,
	settlePrintPayment
} from './print-payments-store.js';
import { appendLegacyPrintRequestEvent, insertPrintRequestEvent } from './print-request-events.js';
import { buildPaymentFailedEvent } from './print-payments.js';

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

type PrintPaymentNotification = {
	id: string;
	amountPaise: number;
};

type CapturedWebhookResult = {
	status: 'processed' | 'already_processed' | 'ignored';
	orderToNotify: string | null;
	printToNotify: PrintPaymentNotification | null;
};

export type RazorpayWebhookResult =
	| { ok: true; status: 'processed' | 'ignored' | 'already_processed' }
	| { ok: false; status: 400; error: 'invalid_payload' };

export type RazorpayWebhookServiceOptions = {
	mail?: MailService;
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

async function findAttemptByProviderOrderId(tx: DbExecutor, providerOrderId: string) {
	const [attempt] = await tx
		.select()
		.from(paymentAttempts)
		.where(eq(paymentAttempts.providerOrderId, providerOrderId))
		.limit(1);

	return attempt ?? null;
}

type CapturedPayment = ReturnType<typeof paymentFromPayload> & {};

async function handleCaptured(
	db: Database,
	mail: MailService | undefined,
	payment: CapturedPayment,
	eventId?: string | null
): Promise<CapturedWebhookResult> {
	const outcome = await db.transaction(async (tx) => {
		const attempt = await findAttemptByProviderOrderId(tx, payment.providerOrderId);
		if (!attempt) {
			storeLog('warn', 'razorpay.webhook.unknown_order', {
				providerOrderId: payment.providerOrderId,
				providerPaymentId: payment.providerPaymentId
			});
			return { kind: 'ignored' as const };
		}

		const isRepeat =
			attempt.status === PAYMENT_ATTEMPT_STATUS.PAID &&
			attempt.providerPaymentId === payment.providerPaymentId;

		if (!isRepeat && (attempt.amountPaise !== payment.amountPaise || payment.currency !== 'INR')) {
			storeLog('warn', 'razorpay.webhook.payment_amount_mismatch', {
				providerOrderId: payment.providerOrderId,
				providerPaymentId: payment.providerPaymentId,
				expectedAmountPaise: attempt.amountPaise,
				actualAmountPaise: payment.amountPaise,
				currency: payment.currency
			});
			return { kind: 'amount_mismatch' as const, attempt };
		}

		if (attempt.kind === PAYMENT_ATTEMPT_KIND.CART_ORDER) {
			const order = await lockCartOrderForPayment(tx, attempt.entityId);
			if (!order) return { kind: 'missing_entity' as const, attempt };

			const settlement = await settleCartPayment(tx, {
				attempt,
				order,
				razorpayPaymentId: payment.providerPaymentId,
				actorUserId: null,
				actorClientId: null,
				paidAction: 'paid_webhook',
				paidMeta: eventId ? { razorpayEventId: eventId } : null,
				conflictMeta: {
					source: 'razorpay_webhook',
					...(eventId ? { razorpayEventId: eventId } : {})
				}
			});
			return { kind: 'cart' as const, attempt, settlement };
		}

		if (attempt.kind === PAYMENT_ATTEMPT_KIND.PRINT_REQUEST) {
			const [row] = await tx
				.select()
				.from(printrequests)
				.where(eq(printrequests.id, attempt.entityId))
				.for('update')
				.limit(1);
			if (!row) return { kind: 'missing_entity' as const, attempt };

			const settlement = await settlePrintPayment(tx, {
				attempt,
				row,
				razorpayPaymentId: payment.providerPaymentId,
				source: { kind: 'webhook', eventId }
			});
			return { kind: 'print' as const, attempt, settlement };
		}

		return { kind: 'ignored' as const };
	});

	if (outcome.kind === 'ignored') {
		return { status: 'ignored', orderToNotify: null, printToNotify: null };
	}

	const { attempt } = outcome;
	const entityType = attempt.kind === PAYMENT_ATTEMPT_KIND.CART_ORDER ? 'order' : 'print_request';
	const attentionBase = {
		razorpayPaymentId: payment.providerPaymentId,
		razorpayOrderId: payment.providerOrderId,
		amountPaise: payment.amountPaise,
		entityType,
		entityId: attempt.entityId,
		detectedBy: 'webhook'
	} as const;

	if (outcome.kind === 'amount_mismatch') {
		await recordPaymentAttention(db, mail, {
			...attentionBase,
			reason: 'amount_mismatch',
			details: { expectedAmountPaise: attempt.amountPaise, currency: payment.currency }
		});
		return { status: 'processed', orderToNotify: null, printToNotify: null };
	}

	if (outcome.kind === 'missing_entity') {
		await recordPaymentAttention(db, mail, { ...attentionBase, reason: 'entity_not_payable' });
		return { status: 'processed', orderToNotify: null, printToNotify: null };
	}

	if (outcome.kind === 'cart') {
		const { settlement } = outcome;
		await recordCartSettlementAttention(db, mail, settlement, {
			razorpayOrderId: payment.providerOrderId,
			razorpayPaymentId: payment.providerPaymentId,
			amountPaise: payment.amountPaise,
			detectedBy: 'webhook'
		});
		if (settlement.kind === 'already_paid') {
			return { status: 'already_processed', orderToNotify: null, printToNotify: null };
		}
		return {
			status: 'processed',
			// No receipt for a stock conflict: the buyer is told to write to support instead.
			orderToNotify: settlement.kind === 'paid' ? settlement.orderId : null,
			printToNotify: null
		};
	}

	const { settlement } = outcome;
	await recordPrintSettlementAttention(db, mail, settlement, {
		printRequestId: attempt.entityId,
		razorpayOrderId: payment.providerOrderId,
		razorpayPaymentId: payment.providerPaymentId,
		amountPaise: payment.amountPaise,
		detectedBy: 'webhook'
	});
	if (settlement.kind === 'already_paid') {
		return { status: 'already_processed', orderToNotify: null, printToNotify: null };
	}
	return {
		status: 'processed',
		orderToNotify: null,
		printToNotify:
			settlement.kind === 'paid'
				? { id: attempt.entityId, amountPaise: settlement.amountPaise }
				: null
	};
}

async function handleFailed(
	db: Database,
	payment: ReturnType<typeof paymentFromPayload> & {},
	eventId?: string | null
) {
	return db.transaction(async (tx) => {
		const found = await findAttemptByProviderOrderId(tx, payment.providerOrderId);
		if (!found) return 'ignored' as const;
		const failureReason = externalFailureReason(payment.failureReason);

		if (found.kind === PAYMENT_ATTEMPT_KIND.CART_ORDER) {
			// Lock the entity first, in the same order as settlement (cart, then order), and decide
			// from the attempt as it is under that lock: a capture may have committed since it was read.
			const order = await lockCartOrderForPayment(tx, found.entityId);
			if (!(await failPendingAttempt(tx, found.id, failureReason))) {
				return 'already_processed' as const;
			}

			// Only the order's live payment window fails the order; a paid order is never touched.
			if (
				!order ||
				order.status !== CART_ORDER_STATUS.PAYMENT_PENDING ||
				order.activePaymentAttemptId !== found.id
			) {
				return 'processed' as const;
			}

			await tx
				.update(orders)
				.set({ status: CART_ORDER_STATUS.FAILED, updatedAt: sql`now()` })
				.where(and(eq(orders.id, order.id), eq(orders.status, CART_ORDER_STATUS.PAYMENT_PENDING)));
			// Keep the buyer's items: reopen the cart rather than leaving it FAILED (lost).
			await reopenCartAfterFailedPayment(tx, order.cartId);
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
			return 'processed' as const;
		}

		if (found.kind === PAYMENT_ATTEMPT_KIND.PRINT_REQUEST) {
			const [row] = await tx
				.select()
				.from(printrequests)
				.where(eq(printrequests.id, found.entityId))
				.for('update')
				.limit(1);
			if (!(await failPendingAttempt(tx, found.id, failureReason))) {
				return 'already_processed' as const;
			}

			if (
				!row ||
				row.requestStage !== 'quoted' ||
				row.activePaymentAttemptId !== found.id
			) {
				return 'processed' as const;
			}

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
				.where(and(eq(printrequests.id, row.id), eq(printrequests.requestStage, 'quoted')));

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
			return 'processed' as const;
		}

		return 'ignored' as const;
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
				const result = await handleCaptured(db, options?.mail, payment, eventId);
				if (result.orderToNotify && options?.mail) {
					notifyOrderReceived(db, options.mail, result.orderToNotify);
				}
				if (result.printToNotify && options?.mail) {
					await notifyPrintPaid(
						db,
						options.mail,
						result.printToNotify.id,
						result.printToNotify.amountPaise
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
