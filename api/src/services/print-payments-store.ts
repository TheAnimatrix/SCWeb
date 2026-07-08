import { and, eq, sql } from 'drizzle-orm';
import type { CheckoutAddress } from '../contracts/address.js';
import type {
	ConfirmPrintPaymentResponse,
	CreatePrintPaymentOrderResponse,
	FailPrintPaymentResponse
} from '../contracts/print-payments.js';
import { rupeesToPaise } from '../contracts/money.js';
import type { Database } from '../db/index.js';
import { printrequests } from '../db/schema/printrequests.js';
import { purchases } from '../db/schema/purchases.js';
import type { Actor } from '../types/context.js';
import type { RazorpayClient } from './razorpay-client.js';
import {
	buildOrderCreatedEvent,
	buildPaidEvent,
	buildPaymentFailedEvent,
	getLatestQuote,
	getLatestQuoteRejection,
	getOrderCreatedAmount,
	getPrintRequestAddressPart,
	isPayablePrintRequestStage,
	isPrintRequestOwnedBy,
	normalizePrintAddress,
	normalizePrintEvents,
	shouldReuseRazorpayOrder
} from './print-payments.js';

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

export function createPrintPaymentsStore(
	db: Database,
	razorpayClient: RazorpayClient
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

				if (shouldReuseRazorpayOrder(row.orderId, row.events, latestQuote)) {
					await tx
						.update(printrequests)
						.set({
							address: normalizedAddress,
							lastUpdated: sql`now()`
						})
						.where(eq(printrequests.id, printRequestId));

					return {
						kind: 'reuse' as const,
						razorpayOrderId: row.orderId!,
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
					amount: latestQuote,
					events: normalizePrintEvents(row.events)
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

				await db
					.update(printrequests)
					.set({
						orderId: razorpayOrder.id,
						events: [...prepared.events, orderCreatedEvent],
						lastUpdated: sql`now()`
					})
					.where(eq(printrequests.id, printRequestId));

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
				return await db.transaction(async (tx) => {
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

					if (!row.orderId) {
						return {
							ok: false as const,
							status: 400 as const,
							body: { error: 'no_order' as const }
						};
					}

					if (row.orderId !== razorpayOrderId) {
						return {
							ok: false as const,
							status: 400 as const,
							body: { error: 'order_mismatch' as const }
						};
					}

					const orderAmount = getOrderCreatedAmount(row.events, row.orderId);
					if (orderAmount === null) {
						return {
							ok: false as const,
							status: 400 as const,
							body: { error: 'reorder_required' as const }
						};
					}

					const latestQuote = getLatestQuote(row.events);
					if (latestQuote !== null && latestQuote !== orderAmount) {
						console.warn(
							JSON.stringify({
								event: 'quote_drift',
								printRequestId,
								orderAmount,
								latestQuote
							})
						);
					}

					const paidEvent = buildPaidEvent(razorpayOrderId, razorpayPaymentId, orderAmount);
					const updatedEvents = [...normalizePrintEvents(row.events), paidEvent];

					const claimed = await tx
						.update(printrequests)
						.set({
							requestStage: 'paid',
							paymentId: razorpayPaymentId,
							orderId: razorpayOrderId,
							events: updatedEvents,
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

					const purchaseInsert = {
						paymentStatus: 'paid',
						paymentMethod: 'razorpay:PrintRequest',
						paymentId: razorpayOrderId,
						paymentIdB: razorpayPaymentId,
						billingAddress: getPrintRequestAddressPart(row.address, 'billing'),
						shippingAddress: getPrintRequestAddressPart(row.address, 'shipping'),
						clientId: actor.clientId ?? 'N/A',
						cartId: printRequestId,
						amount: orderAmount,
						uid: userId
					};

					try {
						await tx.insert(purchases).values(purchaseInsert);
					} catch (error) {
						if (isUniqueViolation(error)) {
							return {
								ok: true as const,
								response: { status: 'already_paid' as const }
							};
						}
						throw error;
					}

					return {
						ok: true as const,
						response: { status: 'paid' as const }
					};
				});
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

				if (!isPayablePrintRequestStage(row.requestStage) || !row.orderId) {
					return {
						ok: true as const,
						response: { status: row.requestStage ?? 'quoted' }
					};
				}

				if (row.orderId !== razorpayOrderId) {
					return {
						ok: true as const,
						response: { status: row.requestStage ?? 'quoted' }
					};
				}

				const failedEvent = buildPaymentFailedEvent(razorpayOrderId, reason);
				const updatedEvents = [...normalizePrintEvents(row.events), failedEvent];

				await tx
					.update(printrequests)
					.set({
						orderId: null,
						events: updatedEvents,
						lastUpdated: sql`now()`
					})
					.where(
						and(eq(printrequests.id, printRequestId), eq(printrequests.requestStage, 'quoted'))
					);

				return {
					ok: true as const,
					response: { status: 'quoted' as const }
				};
			});
		}
	};
}
