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
import {
	lookupCapturedPayment,
	type RazorpayClient,
	type RazorpayOrderPayment
} from './razorpay-client.js';
import { externalFailureReason, failPendingAttempt } from './checkout-store.js';
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
	| { ok: false; status: 500; body: { error: 'razorpay_order_failed' } }
	/** Razorpay could not say whether an earlier payment window was paid; nothing new was started. */
	| { ok: false; status: 503; body: { error: 'payment_check_unavailable' } };

export type ConfirmPrintPaymentResult =
	| { ok: true; response: ConfirmPrintPaymentResponse }
	| { ok: false; status: 404; body: { error: 'not_found' } }
	| { ok: false; status: 403; body: { error: 'forbidden' } }
	| { ok: false; status: 400; body: { error: 'order_mismatch' | 'no_order' | 'reorder_required' } }
	/** Captured, but the request was already paid or can no longer be paid. Recorded for a refund. */
	| { ok: false; status: 409; body: { error: 'duplicate_payment' } }
	/** Captured for an amount that is not the current quote. Recorded for a refund. */
	| { ok: false; status: 409; body: { error: 'payment_mismatch' } };

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

/** The request's current quote in paise, or null when it has no usable quote. */
function currentQuotePaise(events: unknown): number | null {
	try {
		const quote = getLatestQuote(events);
		return quote === null ? null : rupeesToPaise(quote);
	} catch {
		return null;
	}
}

export type PrintPaymentSettlement =
	| { kind: 'paid'; amountPaise: number }
	| { kind: 'already_paid' }
	| { kind: 'attention'; reason: 'duplicate_capture' | 'entity_not_payable' | 'amount_mismatch' };

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

	if (
		attempt.kind !== PAYMENT_ATTEMPT_KIND.PRINT_REQUEST ||
		attempt.entityId !== row.id
	) {
		return { kind: 'attention', reason: 'entity_not_payable' };
	}

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

	// The maker may have re-quoted after this payment window opened. Only the current quote pays
	// for the request; an older amount is recorded for a refund.
	if (currentQuotePaise(row.events) !== attempt.amountPaise) {
		storeLog('warn', 'print_payments.quote_drift', {
			printRequestId: row.id,
			razorpayOrderId,
			attemptAmountPaise: attempt.amountPaise,
			quotePaise: currentQuotePaise(row.events)
		});
		return { kind: 'attention', reason: 'amount_mismatch' };
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
	/** Applies a payment Razorpay reports as captured. Returns true when the request is now paid. */
	async function applyReconciledCapture(
		printRequestId: string,
		razorpayOrderId: string,
		captured: RazorpayOrderPayment
	): Promise<boolean> {
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

	/**
	 * Asks Razorpay whether one of the request's latest unpaid Razorpay orders was paid after all,
	 * and applies it. `paid`: the request is now paid. `unknown`: Razorpay could not answer, so no
	 * payment window may be offered. `clear`: checkout can go on. A request with no earlier
	 * Razorpay order is never sent to Razorpay here.
	 */
	async function reconcileUnresolvedPrintPayments(
		printRequestId: string
	): Promise<'paid' | 'unknown' | 'clear'> {
		const candidates = await db
			.select({ providerOrderId: paymentAttempts.providerOrderId })
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
			.limit(3);
		if (candidates.length === 0) return 'clear';

		const lookups = await Promise.all(
			candidates.map((candidate) =>
				lookupCapturedPayment(razorpayClient, candidate.providerOrderId)
			)
		);

		let paid = false;
		let unknown = false;
		for (const [index, lookup] of lookups.entries()) {
			const razorpayOrderId = candidates[index]!.providerOrderId;
			if (lookup.kind === 'unknown') {
				unknown = true;
				storeLog('warn', 'print_payments.order.payment_check_unavailable', {
					printRequestId,
					razorpayOrderId
				});
				continue;
			}
			if (lookup.kind !== 'captured') continue;
			if (await applyReconciledCapture(printRequestId, razorpayOrderId, lookup.payment)) {
				paid = true;
			}
		}

		return paid ? 'paid' : unknown ? 'unknown' : 'clear';
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

				await tx
					.update(printrequests)
					.set({
						address: normalizedAddress,
						lastUpdated: sql`now()`
					})
					.where(eq(printrequests.id, printRequestId));

				if (shouldReusePrintPaymentOrder(activeAttempt, latestQuote)) {
					return {
						kind: 'reuse' as const,
						razorpayOrderId: activeAttempt!.providerOrderId,
						amount: latestQuote
					};
				}

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

			// Before a payment window is reused or issued, make sure an earlier one was not paid
			// after all (paid in the modal after a failed attempt, browser closed before confirm).
			const reconciled = await reconcileUnresolvedPrintPayments(printRequestId);
			if (reconciled === 'paid') {
				return { ok: false, status: 409, body: { error: 'already_paid' } };
			}
			if (reconciled === 'unknown') {
				return { ok: false, status: 503, body: { error: 'payment_check_unavailable' } };
			}

			const amountPaise = rupeesToPaise(prepared.amount);

			if (prepared.kind === 'reuse') {
				// Re-read under the request lock: a payment or a re-quote may have landed meanwhile.
				const reusable = await db.transaction(async (tx) => {
					const [row] = await tx
						.select()
						.from(printrequests)
						.where(eq(printrequests.id, printRequestId))
						.for('update')
						.limit(1);
					if (!row) return 'not_payable' as const;
					if (PAID_PRINT_STAGES.includes(row.requestStage ?? '')) return 'already_paid' as const;
					if (row.requestStage !== 'quoted') return 'not_payable' as const;
					const attempt = await findPaymentAttemptByProviderOrderId(tx, prepared.razorpayOrderId);
					return attempt?.status === PAYMENT_ATTEMPT_STATUS.PENDING &&
						row.activePaymentAttemptId === attempt.id &&
						attempt.amountPaise === amountPaise &&
						currentQuotePaise(row.events) === amountPaise
						? ('reusable' as const)
						: ('create' as const);
				});
				if (reusable === 'already_paid') {
					return { ok: false, status: 409, body: { error: 'already_paid' } };
				}
				if (reusable === 'not_payable') {
					return { ok: false, status: 409, body: { error: 'not_payable' } };
				}
				if (reusable === 'reusable') {
					return {
						ok: true,
						response: {
							razorpayOrderId: prepared.razorpayOrderId,
							amountPaise,
							currency: 'INR'
						}
					};
				}
			}

			// Razorpay SDK call is intentionally outside the row lock; confirm binds to the
			// persisted order_id so orphan Razorpay orders are harmless.
			try {
				const razorpayOrder = await razorpayClient.createOrder(amountPaise, printRequestId);

				const orderCreatedEvent = buildOrderCreatedEvent(prepared.amount, razorpayOrder.id);

				const persisted = await db.transaction(async (tx) => {
					const [current] = await tx
						.select()
						.from(printrequests)
						.where(eq(printrequests.id, printRequestId))
						.for('update')
						.limit(1);

					const attempt = await createPaymentAttempt(tx, {
						kind: PAYMENT_ATTEMPT_KIND.PRINT_REQUEST,
						entityId: printRequestId,
						providerOrderId: razorpayOrder.id,
						amountPaise: razorpayOrder.amount
					});

					// A payment settled the request, or the maker re-quoted, while Razorpay was being
					// asked. Keep the Razorpay order on record as unusable and do not hand it out.
					const stillPayable =
						current?.requestStage === 'quoted' &&
						currentQuotePaise(current.events) === razorpayOrder.amount;
					if (!stillPayable) {
						await failPendingAttempt(tx, attempt.id, 'superseded_before_use');
						storeLog('warn', 'print_payments.order.changed_while_creating', {
							printRequestId,
							razorpayOrderId: razorpayOrder.id,
							requestStage: current?.requestStage ?? null
						});
						return PAID_PRINT_STAGES.includes(current?.requestStage ?? '')
							? ('already_paid' as const)
							: current?.requestStage === 'quoted'
								? ('changed' as const)
								: ('not_payable' as const);
					}

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
						fromState: current.requestStage ?? null,
						toState: current.requestStage ?? null,
						providerIds: { razorpayOrderId: razorpayOrder.id }
					});
					return 'persisted' as const;
				});

				if (persisted === 'already_paid') {
					return { ok: false, status: 409, body: { error: 'already_paid' } };
				}
				if (persisted === 'not_payable') {
					return { ok: false, status: 409, body: { error: 'not_payable' } };
				}
				if (persisted === 'changed') {
					return { ok: false, status: 500, body: { error: 'razorpay_order_failed' } };
				}

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
			if (settlement.reason === 'amount_mismatch') {
				return { ok: false, status: 409, body: { error: 'payment_mismatch' } };
			}
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

				// Re-read under the request lock; only a pending attempt becomes failed.
				const attempt = await findPaymentAttemptByProviderOrderId(tx, razorpayOrderId);
				if (!attempt || !(await failPendingAttempt(tx, attempt.id, externalFailureReason(reason)))) {
					return {
						ok: true as const,
						response: { status: row.requestStage ?? 'quoted' }
					};
				}

				const failedEvent = buildPaymentFailedEvent(razorpayOrderId, reason);

				await tx
					.update(printrequests)
					.set({
						activePaymentAttemptId: null,
						lastUpdated: sql`now()`
					})
					.where(
						and(eq(printrequests.id, printRequestId), eq(printrequests.requestStage, 'quoted'))
					);

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
