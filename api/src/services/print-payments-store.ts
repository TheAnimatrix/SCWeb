import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import type { CheckoutAddress } from '../contracts/address.js';
import type {
	ConfirmPrintPaymentResponse,
	CreatePrintPaymentOrderResponse,
	FailPrintPaymentResponse
} from '../contracts/print-payments.js';
import { rupeesToPaise, paiseToRupees } from '../contracts/money.js';
import type { Database, DbExecutor } from '../db/index.js';
import { printrequests } from '../db/schema/printrequests.js';
import type { Actor } from '../types/context.js';
import { findCapturedPayment, type RazorpayClient } from './razorpay-client.js';
import { paymentAttempts } from '../db/schema/paymentAttempts.js';
import { recordPaymentAttention, type PaymentAttention } from './payment-attention.js';
import { truncateAuditReason, writeAudit } from './audit.js';
import { storeLog } from '../middleware/logging.js';
import type { MailService } from './mail.js';
import { notifyPrintPaymentReceived, getPrintRequestRecipient } from './order-notifications.js';
import {
	createPaymentAttempt,
	findPaymentAttemptById,
	findPaymentAttemptByProviderOrderId,
	markPaymentAttemptFailed,
	markPaymentAttemptPaid,
	PAYMENT_ATTEMPT_KIND,
	PAYMENT_ATTEMPT_STATUS,
	resolveProviderOrderId
} from './payment-attempts.js';
import { insertPrintRequestEvent, appendLegacyPrintRequestEvent } from './print-request-events.js';
import {
	buildOrderCreatedEvent,
	buildPaidEvent,
	buildPaymentFailedEvent,
	getLatestQuote,
	getLatestQuoteRejection,
	isPayablePrintRequestStage,
	isPrintRequestOwnedBy,
	normalizePrintAddress,
	shouldReusePrintPaymentOrder
} from './print-payments.js';

export type PrintPaymentsStoreOptions = {
	mail?: MailService;
};

export type CreatePrintPaymentOrderResult =
	| { ok: true; response: CreatePrintPaymentOrderResponse }
	| { ok: false; status: 404; body: { error: 'not_found' } }
	| { ok: false; status: 403; body: { error: 'forbidden' } }
	| { ok: false; status: 409; body: { error: 'not_payable' } }
	| { ok: false; status: 400; body: { error: 'no_quote' | 'invalid_quote' } }
	/** The previous Razorpay order turned out to be paid; the request is now paid. */
	| { ok: false; status: 409; body: { error: 'already_paid' } }
	| { ok: false; status: 500; body: { error: 'razorpay_order_failed' } };

export type ConfirmPrintPaymentResult =
	| { ok: true; response: ConfirmPrintPaymentResponse }
	| { ok: false; status: 404; body: { error: 'not_found' } }
	| { ok: false; status: 403; body: { error: 'forbidden' } }
	| { ok: false; status: 400; body: { error: 'order_mismatch' | 'no_order' | 'reorder_required' } }
	/** Captured, but the request was already paid or can no longer be paid. Recorded for a refund. */
	| { ok: false; status: 409; body: { error: 'duplicate_payment' } };

export type FailPrintPaymentResult =
	| { ok: true; response: FailPrintPaymentResponse }
	| { ok: false; status: 404; body: { error: 'not_found' } }
	| { ok: false; status: 403; body: { error: 'forbidden' } };

export interface PrintPaymentsStore {
	createOrder(
		actor: Actor,
		printRequestId: string,
		address: CheckoutAddress
	): Promise<CreatePrintPaymentOrderResult>;
	confirmPayment(
		actor: Actor,
		printRequestId: string,
		razorpayOrderId: string,
		razorpayPaymentId: string
	): Promise<ConfirmPrintPaymentResult>;
	failPayment(
		actor: Actor,
		printRequestId: string,
		razorpayOrderId: string,
		reason?: string
	): Promise<FailPrintPaymentResult>;
}

type PrintRequestRow = typeof printrequests.$inferSelect;
type PaymentAttemptRow = Awaited<ReturnType<typeof findPaymentAttemptById>> & {};

const PAID_PRINT_STAGES = ['paid', 'paid_externally', 'shipped', 'completed'];

export type PrintPaymentSettlement =
	| { kind: 'paid'; amountPaise: number }
	| { kind: 'already_paid' }
	| { kind: 'attention'; reason: 'duplicate_capture' | 'entity_not_payable' };

export type PrintPaymentSource =
	| { kind: 'confirm'; userId: string; clientId: string | null }
	| { kind: 'webhook'; eventId?: string | null }
	| { kind: 'reconcile' };

/**
 * Applies a captured Razorpay payment to its print request. Shared by the browser confirm, the
 * `payment.captured` webhook and the reconcile step. `row` must be locked FOR UPDATE and
 * `attempt` must belong to it. An attempt marked failed can still become paid: Razorpay lets the
 * buyer retry inside the same modal after a failed attempt.
 */
export async function settlePrintPayment(
	tx: DbExecutor,
	input: {
		attempt: PaymentAttemptRow;
		row: PrintRequestRow;
		razorpayPaymentId: string;
		source: PrintPaymentSource;
	}
): Promise<PrintPaymentSettlement> {
	const { row, razorpayPaymentId, source } = input;
	// Re-read under the request lock: a concurrent confirm or webhook for the same payment may
	// have settled it after the caller first read the attempt.
	const attempt = (await findPaymentAttemptById(tx, input.attempt.id)) ?? input.attempt;
	const razorpayOrderId = attempt.providerOrderId;

	if (attempt.status === PAYMENT_ATTEMPT_STATUS.PAID) {
		return attempt.providerPaymentId === razorpayPaymentId
			? { kind: 'already_paid' }
			: { kind: 'attention', reason: 'duplicate_capture' };
	}

	if (row.requestStage !== 'quoted') {
		// Paid already by another Razorpay order, or no longer payable (cancelled, for example).
		return {
			kind: 'attention',
			reason: PAID_PRINT_STAGES.includes(row.requestStage ?? '')
				? 'duplicate_capture'
				: 'entity_not_payable'
		};
	}

	const claimed = await tx
		.update(printrequests)
		.set({
			requestStage: 'paid',
			activePaymentAttemptId: attempt.id,
			lastUpdated: sql`now()`
		})
		.where(and(eq(printrequests.id, row.id), eq(printrequests.requestStage, 'quoted')))
		.returning({ id: printrequests.id });

	if (claimed.length === 0) {
		return { kind: 'attention', reason: 'entity_not_payable' };
	}

	await markPaymentAttemptPaid(tx, razorpayOrderId, razorpayPaymentId);

	const amountInr = paiseToRupees(attempt.amountPaise);
	const baseEvent = buildPaidEvent(razorpayOrderId, razorpayPaymentId, amountInr);
	const paidEvent =
		source.kind === 'confirm'
			? baseEvent
			: {
					...baseEvent,
					by: 'system',
					reason:
						source.kind === 'webhook'
							? 'Payment confirmed by Razorpay webhook'
							: 'Payment found on Razorpay before a new order was created'
				};
	const sourceMeta =
		source.kind === 'webhook'
			? { source: 'razorpay_webhook', ...(source.eventId ? { razorpayEventId: source.eventId } : {}) }
			: source.kind === 'reconcile'
				? { source: 'reconcile' }
				: null;

	await insertPrintRequestEvent(tx, {
		printRequestId: row.id,
		type: 'paid',
		actorUserId: source.kind === 'confirm' ? source.userId : null,
		actorRole: source.kind === 'confirm' ? 'user' : 'system',
		amountPaise: attempt.amountPaise,
		providerOrderId: razorpayOrderId,
		providerPaymentId: razorpayPaymentId,
		reason: paidEvent.reason,
		metadata: sourceMeta ? { ...(paidEvent.extra ?? {}), ...sourceMeta } : (paidEvent.extra ?? null)
	});

	await appendLegacyPrintRequestEvent(tx, row.id, paidEvent);

	await writeAudit(tx, {
		actorUserId: source.kind === 'confirm' ? source.userId : null,
		actorClientId: source.kind === 'confirm' ? source.clientId : null,
		entityType: 'print_request',
		entityId: row.id,
		action:
			source.kind === 'confirm'
				? 'paid'
				: source.kind === 'webhook'
					? 'paid_webhook'
					: 'paid_reconciled',
		fromState: row.requestStage,
		toState: 'paid',
		providerIds: { razorpayOrderId, razorpayPaymentId },
		meta:
			source.kind === 'webhook' && source.eventId ? { razorpayEventId: source.eventId } : null
	});

	return { kind: 'paid', amountPaise: attempt.amountPaise };
}

export async function recordPrintSettlementAttention(
	db: Database,
	mail: MailService | undefined,
	settlement: PrintPaymentSettlement,
	payment: {
		printRequestId: string;
		razorpayOrderId: string;
		razorpayPaymentId: string;
		amountPaise: number | null;
		detectedBy: PaymentAttention['detectedBy'];
	}
): Promise<void> {
	if (settlement.kind !== 'attention') return;
	await recordPaymentAttention(db, mail, {
		razorpayPaymentId: payment.razorpayPaymentId,
		razorpayOrderId: payment.razorpayOrderId,
		amountPaise: payment.amountPaise,
		entityType: 'print_request',
		entityId: payment.printRequestId,
		reason: settlement.reason,
		detectedBy: payment.detectedBy
	});
}

/** Sends the "payment received" e-mails for a print request that was just paid. */
export async function notifyPrintPaid(
	db: Database,
	mail: MailService | undefined,
	printRequestId: string,
	amountPaise: number
): Promise<void> {
	if (!mail) return;
	const parties = await getPrintRequestRecipient(db, printRequestId);
	if (!parties) return;
	notifyPrintPaymentReceived(db, mail, printRequestId, parties, paiseToRupees(amountPaise));
}

async function resolveStoredPrintRazorpayOrderId(
	tx: DbExecutor,
	row: { activePaymentAttemptId: string | null }
): Promise<string | null> {
	if (!row.activePaymentAttemptId) {
		return null;
	}

	const attempt = await findPaymentAttemptById(tx, row.activePaymentAttemptId);
	const providerOrderId = resolveProviderOrderId(attempt);
	if (providerOrderId && attempt?.status !== PAYMENT_ATTEMPT_STATUS.FAILED) {
		return providerOrderId;
	}

	return null;
}

export function createPrintPaymentsStore(
	db: Database,
	razorpayClient: RazorpayClient,
	options?: PrintPaymentsStoreOptions
): PrintPaymentsStore {
	/**
	 * Asks Razorpay whether the request's latest unresolved Razorpay order was paid. Applies the
	 * payment and returns true when it was (the request is now paid). Returns false when there is
	 * nothing to reconcile, Razorpay could not be asked, or the payment was recorded for a refund.
	 */
	async function reconcileUnresolvedPrintPayment(printRequestId: string): Promise<boolean> {
		const [candidate] = await db
			.select()
			.from(paymentAttempts)
			.where(
				and(
					eq(paymentAttempts.kind, PAYMENT_ATTEMPT_KIND.PRINT_REQUEST),
					eq(paymentAttempts.entityId, printRequestId),
					inArray(paymentAttempts.status, [
						PAYMENT_ATTEMPT_STATUS.PENDING,
						PAYMENT_ATTEMPT_STATUS.FAILED
					])
				)
			)
			.orderBy(desc(paymentAttempts.createdAt))
			.limit(1);
		if (!candidate) return false;

		const razorpayOrderId = candidate.providerOrderId;
		const captured = await findCapturedPayment(razorpayClient, razorpayOrderId).catch(() => null);
		if (!captured) return false;

		storeLog('warn', 'print_payments.order.reconciled_capture', {
			printRequestId,
			razorpayOrderId,
			razorpayPaymentId: captured.id
		});

		const settlement = await db.transaction(async (tx) => {
			const [row] = await tx
				.select()
				.from(printrequests)
				.where(eq(printrequests.id, printRequestId))
				.for('update')
				.limit(1);
			const attempt = await findPaymentAttemptByProviderOrderId(tx, razorpayOrderId);
			if (!row || !attempt) return null;
			return settlePrintPayment(tx, {
				attempt,
				row,
				razorpayPaymentId: captured.id,
				source: { kind: 'reconcile' }
			});
		});
		if (!settlement) return false;

		if (settlement.kind === 'paid') {
			await notifyPrintPaid(db, options?.mail, printRequestId, settlement.amountPaise);
			return true;
		}
		if (settlement.kind === 'already_paid') return true;

		await recordPrintSettlementAttention(db, options?.mail, settlement, {
			printRequestId,
			razorpayOrderId,
			razorpayPaymentId: captured.id,
			amountPaise: captured.amount,
			detectedBy: 'reconcile'
		});
		return false;
	}

	return {
		async createOrder(actor, printRequestId, address) {
			const userId = actor.userId;
			if (!userId) {
				return { ok: false, status: 403, body: { error: 'forbidden' } };
			}

			const prepared = await db.transaction(async (tx) => {
				const [row] = await tx
					.select()
					.from(printrequests)
					.where(eq(printrequests.id, printRequestId))
					.for('update')
					.limit(1);

				if (!row) {
					return { kind: 'not_found' as const };
				}

				if (!isPrintRequestOwnedBy(row, userId)) {
					return { kind: 'forbidden' as const };
				}

				if (!isPayablePrintRequestStage(row.requestStage)) {
					return { kind: 'not_payable' as const };
				}

				const quoteRejection = getLatestQuoteRejection(row.events);
				if (quoteRejection === 'invalid_quote') {
					return { kind: 'invalid_quote' as const };
				}
				const latestQuote = getLatestQuote(row.events);
				if (latestQuote === null) {
					return { kind: 'no_quote' as const };
				}

				const normalizedAddress = normalizePrintAddress(address);

				const activeAttempt = row.activePaymentAttemptId
					? await findPaymentAttemptById(tx, row.activePaymentAttemptId)
					: null;

				if (shouldReusePrintPaymentOrder(activeAttempt, latestQuote)) {
					const storedOrderId = activeAttempt!.providerOrderId;
					await tx
						.update(printrequests)
						.set({
							address: normalizedAddress,
							lastUpdated: sql`now()`
						})
						.where(eq(printrequests.id, printRequestId));

					return {
						kind: 'reuse' as const,
						razorpayOrderId: storedOrderId,
						amount: latestQuote
					};
				}

				await tx
					.update(printrequests)
					.set({
						address: normalizedAddress,
						lastUpdated: sql`now()`
					})
					.where(eq(printrequests.id, printRequestId));

				return {
					kind: 'create' as const,
					amount: latestQuote
				};
			});

			if (prepared.kind === 'not_found') {
				return { ok: false, status: 404, body: { error: 'not_found' } };
			}
			if (prepared.kind === 'forbidden') {
				return { ok: false, status: 403, body: { error: 'forbidden' } };
			}
			if (prepared.kind === 'not_payable') {
				return { ok: false, status: 409, body: { error: 'not_payable' } };
			}
			if (prepared.kind === 'no_quote') {
				return { ok: false, status: 400, body: { error: 'no_quote' } };
			}
			if (prepared.kind === 'invalid_quote') {
				return { ok: false, status: 400, body: { error: 'invalid_quote' } };
			}

			if (prepared.kind === 'reuse') {
				return {
					ok: true,
					response: {
						razorpayOrderId: prepared.razorpayOrderId,
						amountPaise: rupeesToPaise(prepared.amount),
						currency: 'INR'
					}
				};
			}

			// Before issuing a new Razorpay order, make sure the previous one was not paid after all
			// (paid in the modal after a failed attempt, browser closed before confirm).
			if (await reconcileUnresolvedPrintPayment(printRequestId)) {
				return { ok: false, status: 409, body: { error: 'already_paid' } };
			}

			// Razorpay SDK call is intentionally outside the row lock; confirm binds to the
			// persisted order_id so orphan Razorpay orders are harmless.
			try {
				const razorpayOrder = await razorpayClient.createOrder(
					rupeesToPaise(prepared.amount),
					printRequestId
				);

				const orderCreatedEvent = buildOrderCreatedEvent(prepared.amount, razorpayOrder.id);

				await db.transaction(async (tx) => {
					const [current] = await tx
						.select({ requestStage: printrequests.requestStage })
						.from(printrequests)
						.where(eq(printrequests.id, printRequestId))
						.limit(1);

					const attempt = await createPaymentAttempt(tx, {
						kind: PAYMENT_ATTEMPT_KIND.PRINT_REQUEST,
						entityId: printRequestId,
						providerOrderId: razorpayOrder.id,
						amountPaise: razorpayOrder.amount
					});

					await tx
						.update(printrequests)
						.set({
							activePaymentAttemptId: attempt.id,
							lastUpdated: sql`now()`
						})
						.where(eq(printrequests.id, printRequestId));

					await insertPrintRequestEvent(tx, {
						printRequestId,
						type: 'order_created',
						actorUserId: userId,
						actorRole: 'user',
						amountPaise: razorpayOrder.amount,
						providerOrderId: razorpayOrder.id,
						reason: orderCreatedEvent.reason,
						metadata: orderCreatedEvent.extra ?? null
					});

					await appendLegacyPrintRequestEvent(tx, printRequestId, orderCreatedEvent);

					await writeAudit(tx, {
						actorUserId: userId,
						actorClientId: actor.clientId,
						entityType: 'print_request',
						entityId: printRequestId,
						action: 'payment_order_created',
						fromState: current?.requestStage ?? null,
						toState: current?.requestStage ?? null,
						providerIds: { razorpayOrderId: razorpayOrder.id }
					});
				});

				return {
					ok: true,
					response: {
						razorpayOrderId: razorpayOrder.id,
						amountPaise: razorpayOrder.amount,
						currency: 'INR'
					}
				};
			} catch {
				return { ok: false, status: 500, body: { error: 'razorpay_order_failed' } };
			}
		},

		async confirmPayment(actor, printRequestId, razorpayOrderId, razorpayPaymentId) {
			const userId = actor.userId;
			if (!userId) {
				return { ok: false, status: 403, body: { error: 'forbidden' } };
			}

			const outcome = await db.transaction(async (tx) => {
				const [row] = await tx
					.select()
					.from(printrequests)
					.where(eq(printrequests.id, printRequestId))
					.for('update')
					.limit(1);

				if (!row) return { kind: 'not_found' as const };
				if (!isPrintRequestOwnedBy(row, userId)) return { kind: 'forbidden' as const };

				// Resolve the attempt by the Razorpay order that was paid, not by the request's
				// active attempt: a failed attempt in the same modal clears the active one.
				const attempt = await findPaymentAttemptByProviderOrderId(tx, razorpayOrderId);
				if (!attempt) return { kind: 'no_order' as const };
				if (
					attempt.kind !== PAYMENT_ATTEMPT_KIND.PRINT_REQUEST ||
					attempt.entityId !== printRequestId
				) {
					return { kind: 'order_mismatch' as const };
				}

				const orderAmount = paiseToRupees(attempt.amountPaise);
				const latestQuote = getLatestQuote(row.events);
				if (latestQuote !== null && latestQuote !== orderAmount) {
					storeLog('warn', 'print_payments.quote_drift', {
						printRequestId,
						orderAmount,
						latestQuote
					});
				}

				const settlement = await settlePrintPayment(tx, {
					attempt,
					row,
					razorpayPaymentId,
					source: { kind: 'confirm', userId, clientId: actor.clientId }
				});
				return { kind: 'settled' as const, settlement, amountPaise: attempt.amountPaise };
			});

			switch (outcome.kind) {
				case 'not_found':
					return { ok: false, status: 404, body: { error: 'not_found' } };
				case 'forbidden':
					return { ok: false, status: 403, body: { error: 'forbidden' } };
				case 'no_order':
					return { ok: false, status: 400, body: { error: 'no_order' } };
				case 'order_mismatch':
					return { ok: false, status: 400, body: { error: 'order_mismatch' } };
			}

			const { settlement } = outcome;
			if (settlement.kind === 'paid') {
				await notifyPrintPaid(db, options?.mail, printRequestId, settlement.amountPaise);
				return { ok: true, response: { status: 'paid' } };
			}
			if (settlement.kind === 'already_paid') {
				return { ok: true, response: { status: 'already_paid' } };
			}

			await recordPrintSettlementAttention(db, options?.mail, settlement, {
				printRequestId,
				razorpayOrderId,
				razorpayPaymentId,
				amountPaise: outcome.amountPaise,
				detectedBy: 'confirm'
			});
			return { ok: false, status: 409, body: { error: 'duplicate_payment' } };
		},

		async failPayment(actor, printRequestId, razorpayOrderId, reason) {
			const userId = actor.userId;
			if (!userId) {
				return { ok: false, status: 403, body: { error: 'forbidden' } };
			}

			return db.transaction(async (tx) => {
				const [row] = await tx
					.select()
					.from(printrequests)
					.where(eq(printrequests.id, printRequestId))
					.for('update')
					.limit(1);

				if (!row) {
					return {
						ok: false as const,
						status: 404 as const,
						body: { error: 'not_found' as const }
					};
				}

				if (!isPrintRequestOwnedBy(row, userId)) {
					return {
						ok: false as const,
						status: 403 as const,
						body: { error: 'forbidden' as const }
					};
				}

				if (row.requestStage === 'paid') {
					return {
						ok: true as const,
						response: { status: 'paid' as const }
					};
				}

				if (!isPayablePrintRequestStage(row.requestStage)) {
					return {
						ok: true as const,
						response: { status: row.requestStage ?? 'quoted' }
					};
				}

				const storedOrderId = await resolveStoredPrintRazorpayOrderId(tx, row);
				if (!storedOrderId || storedOrderId !== razorpayOrderId) {
					return {
						ok: true as const,
						response: { status: row.requestStage ?? 'quoted' }
					};
				}

				const failedEvent = buildPaymentFailedEvent(razorpayOrderId, reason);

				const changed = await tx
					.update(printrequests)
					.set({
						activePaymentAttemptId: null,
						lastUpdated: sql`now()`
					})
					.where(
						and(eq(printrequests.id, printRequestId), eq(printrequests.requestStage, 'quoted'))
					)
					.returning({ id: printrequests.id });

				if (changed.length === 0) {
					return {
						ok: true as const,
						response: { status: row.requestStage ?? 'quoted' }
					};
				}

				await markPaymentAttemptFailed(tx, razorpayOrderId, reason);

				await insertPrintRequestEvent(tx, {
					printRequestId,
					type: 'payment_failed',
					actorUserId: userId,
					actorRole: 'user',
					providerOrderId: razorpayOrderId,
					reason: failedEvent.reason,
					metadata: failedEvent.extra ?? null
				});

				await appendLegacyPrintRequestEvent(tx, printRequestId, failedEvent);

				await writeAudit(tx, {
					actorUserId: userId,
					actorClientId: actor.clientId,
					entityType: 'print_request',
					entityId: printRequestId,
					action: 'payment_failed',
					fromState: row.requestStage,
					toState: row.requestStage,
					providerIds: { razorpayOrderId },
					meta: reason ? { reason: truncateAuditReason(reason) } : null
				});

				return {
					ok: true as const,
					response: { status: 'quoted' as const }
				};
			});
		}
	};
}
