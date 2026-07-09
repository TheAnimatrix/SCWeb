import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import type { CheckoutAddress } from '../contracts/address.js';
import type { CheckoutOrderAddresses } from '../contracts/checkout.js';
import type {
	ConfirmCheckoutResponse,
	CreateCheckoutOrderResponse,
	FailCheckoutResponse
} from '../contracts/checkout.js';
import { CART_ORDER_STATUS } from '../contracts/cart.js';
import { rupeesToPaise, paiseToRupees } from '../contracts/money.js';
import type { Database, DbExecutor } from '../db/index.js';
import { cartItems } from '../db/schema/cartItems.js';
import { carts } from '../db/schema/carts.js';
import { orderItems } from '../db/schema/orderItems.js';
import { orders } from '../db/schema/orders.js';
import { paymentAttempts } from '../db/schema/paymentAttempts.js';
import { products } from '../db/schema/products.js';
import type { Actor } from '../types/context.js';
import type { ProductSnapshot } from './cart.js';
import {
	buildOrderItemSnapshots,
	computeOrderTotals,
	checkoutOrderAddressesEqual,
	isOrderOwnedBy,
	normalizeCheckoutOrderAddresses,
	resolveFailOrderStatus,
	shouldDecrementStock,
	shouldReuseRazorpayOrder,
	validateCheckoutLines,
	type CheckoutLine
} from './checkout.js';
import type { RazorpayClient } from './razorpay-client.js';
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
import { truncateAuditReason, writeAudit } from './audit.js';
import { storeLog } from '../middleware/logging.js';
import type { MailService } from './mail.js';
import { notifyOrderReceived } from './order-notifications.js';

export type CheckoutStoreOptions = {
	mail?: MailService;
};

export type CreateOrderResult =
	| { ok: true; response: CreateCheckoutOrderResponse }
	| { ok: false; status: 400; body: { error: 'cart_empty' } }
	| {
			ok: false;
			status: 409;
			body: { error: 'insufficient_stock'; productId: string; limit: number };
	  }
	| { ok: false; status: 500; body: { error: 'razorpay_order_failed' } };

export type ConfirmOrderResult =
	| { ok: true; response: ConfirmCheckoutResponse }
	| { ok: false; status: 404; body: { error: 'order_not_found' } }
	| { ok: false; status: 403; body: { error: 'forbidden' } }
	| { ok: false; status: 409; body: { error: 'stock_conflict' } };

export type FailOrderResult =
	| { ok: true; response: FailCheckoutResponse }
	| { ok: false; status: 404; body: { error: 'order_not_found' } }
	| { ok: false; status: 403; body: { error: 'forbidden' } };

export interface CheckoutStore {
	createOrder(
		actor: Actor,
		addresses: CheckoutOrderAddresses,
		options?: { refreshPayment?: boolean }
	): Promise<CreateOrderResult>;
	confirmOrder(
		actor: Actor,
		razorpayOrderId: string,
		razorpayPaymentId: string
	): Promise<ConfirmOrderResult>;
	failOrder(actor: Actor, razorpayOrderId: string, reason?: string): Promise<FailOrderResult>;
}

function isUniqueViolation(error: unknown): boolean {
	return (
		typeof error === 'object' &&
		error !== null &&
		'code' in error &&
		(error as { code: string }).code === '23505'
	);
}

function checkoutCartCondition(actor: Actor) {
	const checkoutStatuses = [CART_ORDER_STATUS.ACTIVE, CART_ORDER_STATUS.PAYMENT_PENDING];

	if (actor.userId) {
		return and(inArray(carts.status, checkoutStatuses), eq(carts.userId, actor.userId));
	}

	if (actor.clientId) {
		return and(
			inArray(carts.status, checkoutStatuses),
			isNull(carts.userId),
			eq(carts.clientId, actor.clientId)
		);
	}

	return null;
}

async function findCheckoutCartRow(db: DbExecutor, actor: Actor) {
	const condition = checkoutCartCondition(actor);
	if (!condition) return null;

	const [row] = await db
		.select()
		.from(carts)
		.where(condition)
		.orderBy(
			sql`CASE WHEN ${carts.status} = ${CART_ORDER_STATUS.ACTIVE} THEN 0 ELSE 1 END`,
			carts.updatedAt
		)
		.limit(1);

	return row ?? null;
}

async function getCartLines(db: DbExecutor, cartId: string): Promise<CheckoutLine[]> {
	const rows = await db
		.select({
			qty: cartItems.qty,
			product: products
		})
		.from(cartItems)
		.innerJoin(products, eq(cartItems.productId, products.id))
		.where(eq(cartItems.cartId, cartId));

	return rows.map((row) => ({
		productId: row.product.id,
		qty: row.qty,
		product: row.product as ProductSnapshot
	}));
}

async function findPaymentPendingOrderForCart(db: DbExecutor, cartId: string) {
	const [row] = await db
		.select()
		.from(orders)
		.where(and(eq(orders.cartId, cartId), eq(orders.status, CART_ORDER_STATUS.PAYMENT_PENDING)))
		.limit(1);

	return row ?? null;
}

async function replaceOrderItems(
	tx: DbExecutor,
	orderId: string,
	snapshots: ReturnType<typeof buildOrderItemSnapshots>
) {
	await tx.delete(orderItems).where(eq(orderItems.orderId, orderId));

	if (snapshots.length === 0) return;

	await tx.insert(orderItems).values(
		snapshots.map((item) => ({
			orderId,
			productId: item.productId,
			productName: item.productName,
			unitPricePaise: item.unitPricePaise,
			qty: item.qty
		}))
	);
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

async function resolveStoredRazorpayOrderId(
	tx: DbExecutor,
	order: { activePaymentAttemptId: string | null }
): Promise<string | null> {
	if (!order.activePaymentAttemptId) {
		return null;
	}

	const attempt = await findPaymentAttemptById(tx, order.activePaymentAttemptId);
	const providerOrderId = resolveProviderOrderId(attempt);
	if (providerOrderId && attempt?.status !== PAYMENT_ATTEMPT_STATUS.FAILED) {
		return providerOrderId;
	}

	return null;
}

async function findCheckoutOrderByProviderOrderId(tx: DbExecutor, razorpayOrderId: string) {
	const attempt = await findPaymentAttemptByProviderOrderId(tx, razorpayOrderId);
	if (attempt?.kind !== PAYMENT_ATTEMPT_KIND.CART_ORDER) {
		return null;
	}

	const [order] = await tx
		.select()
		.from(orders)
		.where(eq(orders.id, attempt.entityId))
		.limit(1);

	return order ?? null;
}

async function persistCheckoutPaymentAttempt(
	tx: DbExecutor,
	orderId: string,
	providerOrderId: string,
	amountPaise: number
) {
	const attempt = await createPaymentAttempt(tx, {
		kind: PAYMENT_ATTEMPT_KIND.CART_ORDER,
		entityId: orderId,
		providerOrderId,
		amountPaise
	});

	await tx
		.update(orders)
		.set({
			activePaymentAttemptId: attempt.id,
			updatedAt: sql`now()`
		})
		.where(eq(orders.id, orderId));

	return attempt;
}

export function createCheckoutStore(
	db: Database,
	razorpayClient: RazorpayClient,
	options?: CheckoutStoreOptions
): CheckoutStore {
	return {
		async createOrder(actor, addresses, options) {
			const refreshPayment = options?.refreshPayment === true;
			const normalizedAddresses = normalizeCheckoutOrderAddresses(
				addresses.shipping,
				addresses.billing
			);

			const prepared = await db.transaction(async (tx) => {
				const cart = await findCheckoutCartRow(tx, actor);
				if (!cart) {
					return { kind: 'cart_empty' as const };
				}

				const lines = await getCartLines(tx, cart.id);
				if (lines.length === 0) {
					return { kind: 'cart_empty' as const };
				}

				const productIds = lines.map((line) => line.productId);
				const lockedProducts = await tx
					.select()
					.from(products)
					.where(inArray(products.id, productIds))
					.for('update');

				const productById = new Map(lockedProducts.map((product) => [product.id, product]));
				const lockedLines = lines.map((line) => ({
					...line,
					product: (productById.get(line.productId) ?? line.product) as ProductSnapshot
				}));

				const stockFailure = validateCheckoutLines(lockedLines);
				if (stockFailure) {
					return { kind: 'insufficient_stock' as const, failure: stockFailure };
				}

				const snapshots = buildOrderItemSnapshots(lockedLines);
				const totals = computeOrderTotals(snapshots);
				const existingOrder = await findPaymentPendingOrderForCart(tx, cart.id);

				let orderId: string;

				if (existingOrder) {
					const previousTotalPaise = existingOrder.totalPaise;
					const addressChanged = !checkoutOrderAddressesEqual(
						existingOrder.address,
						normalizedAddresses
					);

					await tx
						.update(orders)
						.set({
							address: normalizedAddresses,
							subtotalPaise: totals.subtotalPaise,
							deliveryFeePaise: totals.deliveryFeePaise,
							totalPaise: totals.totalPaise,
							updatedAt: sql`now()`
						})
						.where(eq(orders.id, existingOrder.id));

					await replaceOrderItems(tx, existingOrder.id, snapshots);
					orderId = existingOrder.id;

					const auditMeta: Record<string, unknown> = { addressChanged };
					if (totals.totalPaise !== previousTotalPaise) {
						auditMeta.previousTotalPaise = previousTotalPaise;
						auditMeta.totalPaise = totals.totalPaise;
					}

					await writeAudit(tx, {
						actorUserId: actor.userId,
						actorClientId: actor.clientId,
						entityType: 'order',
						entityId: existingOrder.id,
						action: 'updated',
						fromState: CART_ORDER_STATUS.PAYMENT_PENDING,
						toState: CART_ORDER_STATUS.PAYMENT_PENDING,
						meta: auditMeta
					});

					const storedRazorpayOrderId = await resolveStoredRazorpayOrderId(tx, existingOrder);

					if (
						!refreshPayment &&
						shouldReuseRazorpayOrder(storedRazorpayOrderId) &&
						totals.totalPaise === previousTotalPaise
					) {
						return {
							kind: 'reuse' as const,
							orderId,
							razorpayOrderId: storedRazorpayOrderId!,
							totalPaise: totals.totalPaise
						};
					}

					return {
						kind: 'created' as const,
						orderId,
						totalPaise: totals.totalPaise,
						razorpayOrderId: null
					};
				} else {
					const [inserted] = await tx
						.insert(orders)
						.values({
							cartId: cart.id,
							userId: cart.userId,
							clientId: cart.clientId,
							status: CART_ORDER_STATUS.PAYMENT_PENDING,
							address: normalizedAddresses,
							subtotalPaise: totals.subtotalPaise,
							deliveryFeePaise: totals.deliveryFeePaise,
							totalPaise: totals.totalPaise
						})
						.returning();

					await replaceOrderItems(tx, inserted.id, snapshots);

					await writeAudit(tx, {
						actorUserId: actor.userId,
						actorClientId: actor.clientId,
						entityType: 'order',
						entityId: inserted.id,
						action: 'created',
						fromState: null,
						toState: CART_ORDER_STATUS.PAYMENT_PENDING,
						meta: { cartId: cart.id, totalPaise: totals.totalPaise }
					});

					await tx
						.update(carts)
						.set({
							status: CART_ORDER_STATUS.PAYMENT_PENDING,
							updatedAt: sql`now()`
						})
						.where(eq(carts.id, cart.id));

					orderId = inserted.id;
				}

				return {
					kind: 'created' as const,
					orderId,
					totalPaise: totals.totalPaise,
					razorpayOrderId: null
				};
			});

			if (prepared.kind === 'cart_empty') {
				return { ok: false, status: 400, body: { error: 'cart_empty' } };
			}

			if (prepared.kind === 'insufficient_stock') {
				return {
					ok: false,
					status: 409,
					body: {
						error: 'insufficient_stock',
						productId: prepared.failure.productId,
						limit: prepared.failure.limit
					}
				};
			}

			if (prepared.kind === 'reuse') {
				const expectedAmountPaise = prepared.totalPaise;
				const existingRazorpayOrder = await razorpayClient.fetchOrder(prepared.razorpayOrderId);
				if (
					existingRazorpayOrder &&
					existingRazorpayOrder.amount === expectedAmountPaise
				) {
					return {
						ok: true,
						response: {
							orderId: prepared.orderId,
							razorpayOrderId: existingRazorpayOrder.id,
							amountPaise: expectedAmountPaise,
							totalRupees: paiseToRupees(prepared.totalPaise),
							currency: 'INR'
						}
					};
				}

				storeLog('warn', 'checkout.order.stale_razorpay_order', {
					orderId: prepared.orderId,
					razorpayOrderId: prepared.razorpayOrderId,
					expectedAmountPaise,
					actualAmountPaise: existingRazorpayOrder?.amount ?? null
				});
			}

			if (prepared.kind === 'reuse' || prepared.kind === 'created') {
				try {
					const razorpayOrder = await razorpayClient.createOrder(
						prepared.totalPaise,
						prepared.orderId
					);

					await db.transaction(async (tx) => {
						await persistCheckoutPaymentAttempt(
							tx,
							prepared.orderId,
							razorpayOrder.id,
							razorpayOrder.amount
						);
					});

					return {
						ok: true,
						response: {
							orderId: prepared.orderId,
							razorpayOrderId: razorpayOrder.id,
							amountPaise: prepared.totalPaise,
							totalRupees: paiseToRupees(prepared.totalPaise),
							currency: 'INR'
						}
					};
				} catch (error) {
					const razorpayError =
						typeof error === 'object' && error !== null && 'error' in error
							? (error as { statusCode?: number; error?: { description?: string; code?: string } })
							: null;

					storeLog('error', 'checkout.order.razorpay_failed', {
						orderId: prepared.orderId,
						statusCode: razorpayError?.statusCode ?? null,
						code: razorpayError?.error?.code ?? null,
						description: razorpayError?.error?.description ?? null,
						message: error instanceof Error ? error.message : String(error)
					});

					return { ok: false, status: 500, body: { error: 'razorpay_order_failed' } };
				}
			}

			return { ok: false, status: 500, body: { error: 'razorpay_order_failed' } };
		},

		async confirmOrder(actor, razorpayOrderId, razorpayPaymentId) {
			try {
				const result = await db.transaction(async (tx): Promise<ConfirmOrderResult> => {
					const located = await findCheckoutOrderByProviderOrderId(tx, razorpayOrderId);
					if (!located) {
						return {
							ok: false as const,
							status: 404 as const,
							body: { error: 'order_not_found' as const }
						};
					}

					const [order] = await tx
						.select()
						.from(orders)
						.where(eq(orders.id, located.id))
						.for('update')
						.limit(1);

					if (!order) {
						return {
							ok: false as const,
							status: 404 as const,
							body: { error: 'order_not_found' as const }
						};
					}

					if (!isOrderOwnedBy(order, actor)) {
						return {
							ok: false as const,
							status: 403 as const,
							body: { error: 'forbidden' as const }
						};
					}

					if (order.status === CART_ORDER_STATUS.PAID) {
						return {
							ok: true as const,
							response: { status: 'already_paid' as const }
						};
					}

					let claimed: { id: string }[];

					try {
						claimed = await tx
							.update(orders)
							.set({
								status: CART_ORDER_STATUS.PAID,
								updatedAt: sql`now()`
							})
							.where(
								and(
									eq(orders.id, order.id),
									inArray(orders.status, [
										CART_ORDER_STATUS.PAYMENT_PENDING,
										CART_ORDER_STATUS.FAILED
									])
								)
							)
							.returning({ id: orders.id });
					} catch (error) {
						if (isUniqueViolation(error)) {
							return {
								ok: true as const,
								response: { status: 'already_paid' as const }
							};
						}
						throw error;
					}

					if (claimed.length === 0) {
						const [current] = await tx
							.select({ status: orders.status })
							.from(orders)
							.where(eq(orders.id, order.id))
							.limit(1);

						if (current?.status === CART_ORDER_STATUS.PAID) {
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

					await writeAudit(tx, {
						actorUserId: actor.userId,
						actorClientId: actor.clientId,
						entityType: 'order',
						entityId: order.id,
						action: 'paid',
						fromState: order.status,
						toState: CART_ORDER_STATUS.PAID,
						providerIds: {
							razorpayOrderId,
							razorpayPaymentId
						}
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
						if (!shouldDecrementStock(line.stock)) {
							continue;
						}

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
						storeLog('error', 'checkout.confirm.stock_conflict', {
							orderId: order.id,
							razorpayOrderId,
							razorpayPaymentId,
							productId: stockConflict.productId,
							qty: stockConflict.qty,
							requiresManualSupport: true
						});

						await writeAudit(tx, {
							actorUserId: actor.userId,
							actorClientId: actor.clientId,
							entityType: 'order',
							entityId: order.id,
							action: 'paid_stock_conflict',
							fromState: CART_ORDER_STATUS.PAID,
							toState: CART_ORDER_STATUS.PAID,
							providerIds: {
								razorpayOrderId,
								razorpayPaymentId
							},
							meta: {
								productId: stockConflict.productId,
								qty: stockConflict.qty,
								requiresManualSupport: true
							}
						});

						return {
							ok: false,
							status: 409,
							body: { error: 'stock_conflict' }
						};
					}

					return {
						ok: true as const,
						response: { status: 'paid' as const }
					};
				});

				if (result.ok && result.response.status === 'paid' && options?.mail) {
					const [paidOrder] = await db
						.select({ id: orders.id })
						.from(orders)
						.innerJoin(
							paymentAttempts,
							eq(paymentAttempts.id, orders.activePaymentAttemptId)
						)
						.where(eq(paymentAttempts.providerOrderId, razorpayOrderId))
						.limit(1);

					if (paidOrder) {
						notifyOrderReceived(db, options.mail, paidOrder.id);
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

		async failOrder(actor, razorpayOrderId, reason) {
			return db.transaction(async (tx) => {
				const order = await findCheckoutOrderByProviderOrderId(tx, razorpayOrderId);

				if (!order) {
					return {
						ok: false as const,
						status: 404 as const,
						body: { error: 'order_not_found' as const }
					};
				}

				if (!isOrderOwnedBy(order, actor)) {
					return {
						ok: false as const,
						status: 403 as const,
						body: { error: 'forbidden' as const }
					};
				}

				const nextStatus = resolveFailOrderStatus(order.status);

				if (
					nextStatus === CART_ORDER_STATUS.FAILED &&
					order.status === CART_ORDER_STATUS.PAYMENT_PENDING
				) {
					await tx
						.update(orders)
						.set({
							status: CART_ORDER_STATUS.FAILED,
							updatedAt: sql`now()`
						})
						.where(eq(orders.id, order.id));

					await tx
						.update(carts)
						.set({
							status: CART_ORDER_STATUS.FAILED,
							updatedAt: sql`now()`
						})
						.where(eq(carts.id, order.cartId));

					await markPaymentAttemptFailed(tx, razorpayOrderId, reason);

					await writeAudit(tx, {
						actorUserId: actor.userId,
						actorClientId: actor.clientId,
						entityType: 'order',
						entityId: order.id,
						action: 'failed',
						fromState: CART_ORDER_STATUS.PAYMENT_PENDING,
						toState: CART_ORDER_STATUS.FAILED,
						providerIds: { razorpayOrderId },
						meta: reason ? { reason: truncateAuditReason(reason) } : null
					});

					storeLog('warn', 'checkout.order.failed', {
						orderId: order.id,
						razorpayOrderId,
						reason: reason ?? null
					});
				}

				return {
					ok: true as const,
					response: { status: nextStatus }
				};
			});
		}
	};
}
