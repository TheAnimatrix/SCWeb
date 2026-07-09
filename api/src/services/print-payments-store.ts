import { and, eq, sql } from 'drizzle-orm';
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
import type { RazorpayClient } from './razorpay-client.js';
import { truncateAuditReason, writeAudit } from './audit.js';
import { storeLog } from '../middleware/logging.js';
import type { Env } from '../env.js';
import type { EmailService } from './email.js';
import { notifyPrintPaymentReceived, getPrintRequestRecipient } from './order-notifications.js';
import {
	createPaymentAttempt,
	findPaymentAttemptById,
	findActivePaymentAttemptForEntity,
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
	emailService?: EmailService;
	env?: Env;
};

export type CreatePrintPaymentOrderResult =
	| { ok: true; response: CreatePrintPaymentOrderResponse }
	| { ok: false; status: 404; body: { error: 'not_found' } }
	| { ok: false; status: 403; body: { error: 'forbidden' } }
	| { ok: false; status: 409; body: { error: 'not_payable' } }
	| { ok: false; status: 400; body: { error: 'no_quote' | 'invalid_quote' } }
	| { ok: false; status: 500; body: { error: 'razorpay_order_failed' } };

export type ConfirmPrintPaymentResult =
	| { ok: true; response: ConfirmPrintPaymentResponse }
	| { ok: false; status: 404; body: { error: 'not_found' } }
	| { ok: false; status: 403; body: { error: 'forbidden' } }
	| { ok: false; status: 400; body: { error: 'order_mismatch' | 'no_order' | 'reorder_required' } };

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

function isUniqueViolation(error: unknown): boolean {
	return (
		typeof error === 'object' &&
		error !== null &&
		'code' in error &&
		(error as { code: string }).code === '23505'
	);
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

			try {
				const result = await db.transaction(async (tx) => {
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
							response: { status: 'already_paid' as const }
						};
					}

					const pendingAttempt = row.activePaymentAttemptId
						? await findPaymentAttemptById(tx, row.activePaymentAttemptId)
						: await findActivePaymentAttemptForEntity(
								tx,
								PAYMENT_ATTEMPT_KIND.PRINT_REQUEST,
								printRequestId
							);

					if (!pendingAttempt) {
						return {
							ok: false as const,
							status: 400 as const,
							body: { error: 'no_order' as const }
						};
					}

					const storedOrderId = pendingAttempt.providerOrderId;
					if (storedOrderId !== razorpayOrderId) {
						return {
							ok: false as const,
							status: 400 as const,
							body: { error: 'order_mismatch' as const }
						};
					}

					const orderAmount = paiseToRupees(pendingAttempt.amountPaise);

					const latestQuote = getLatestQuote(row.events);
					if (latestQuote !== null && latestQuote !== orderAmount) {
						storeLog('warn', 'print_payments.quote_drift', {
							printRequestId,
							orderAmount,
							latestQuote
						});
					}

					const paidEvent = buildPaidEvent(razorpayOrderId, razorpayPaymentId, orderAmount);

					const claimed = await tx
						.update(printrequests)
						.set({
							requestStage: 'paid',
							lastUpdated: sql`now()`
						})
						.where(
							and(eq(printrequests.id, printRequestId), eq(printrequests.requestStage, 'quoted'))
						)
						.returning({ id: printrequests.id });

					if (claimed.length === 0) {
						const [current] = await tx
							.select({ requestStage: printrequests.requestStage })
							.from(printrequests)
							.where(eq(printrequests.id, printRequestId))
							.limit(1);

						if (current?.requestStage === 'paid') {
							return {
								ok: true as const,
								response: { status: 'already_paid' as const }
							};
						}

						return {
							ok: false as const,
							status: 403 as const,
							body: { error: 'forbidden' as const }
						};
					}

					await markPaymentAttemptPaid(tx, razorpayOrderId, razorpayPaymentId);

					await insertPrintRequestEvent(tx, {
						printRequestId,
						type: 'paid',
						actorUserId: userId,
						actorRole: 'user',
						amountPaise: pendingAttempt.amountPaise,
						providerOrderId: razorpayOrderId,
						providerPaymentId: razorpayPaymentId,
						reason: paidEvent.reason,
						metadata: paidEvent.extra ?? null
					});

					await appendLegacyPrintRequestEvent(tx, printRequestId, paidEvent);

					await writeAudit(tx, {
						actorUserId: userId,
						actorClientId: actor.clientId,
						entityType: 'print_request',
						entityId: printRequestId,
						action: 'paid',
						fromState: row.requestStage,
						toState: 'paid',
						providerIds: {
							razorpayOrderId,
							razorpayPaymentId
						}
					});

					return {
						ok: true as const,
						response: { status: 'paid' as const }
					};
				});

				if (
					result.ok &&
					result.response.status === 'paid' &&
					options?.emailService &&
					options.env
				) {
					const [paidRow] = await db
						.select({
							activePaymentAttemptId: printrequests.activePaymentAttemptId
						})
						.from(printrequests)
						.where(eq(printrequests.id, printRequestId))
						.limit(1);

					const paidAttempt = paidRow?.activePaymentAttemptId
						? await findPaymentAttemptById(db, paidRow.activePaymentAttemptId)
						: null;

					const amountInr =
						paidAttempt?.status === PAYMENT_ATTEMPT_STATUS.PAID
							? paiseToRupees(paidAttempt.amountPaise)
							: null;

					if (amountInr !== null) {
						const parties = await getPrintRequestRecipient(db, printRequestId);
						if (parties) {
							notifyPrintPaymentReceived(
								db,
								options.emailService,
								options.env,
								printRequestId,
								parties,
								amountInr
							);
						}
					}
				}

				return result;
			} catch (error) {
				if (isUniqueViolation(error)) {
					return {
						ok: true,
						response: { status: 'already_paid' }
					};
				}
				throw error;
			}
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
