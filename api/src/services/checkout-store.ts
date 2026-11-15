import { and, eq, inArray, isNull, ne, sql } from 'drizzle-orm';
import type { CheckoutOrderAddresses } from '../contracts/checkout.js';
import type {
	CheckoutOrderStatusResponse,
	ConfirmCheckoutResponse,
	CreateCheckoutOrderResponse,
	FailCheckoutResponse
} from '../contracts/checkout.js';
import { CART_ORDER_STATUS } from '../contracts/cart.js';
import { paiseToRupees } from '../contracts/money.js';
import type { Database, DbExecutor } from '../db/index.js';
import { isUniqueViolation } from '../lib/pg-errors.js';
import { cartItems } from '../db/schema/cartItems.js';
import { carts } from '../db/schema/carts.js';
import { orderItems } from '../db/schema/orderItems.js';
import { orders } from '../db/schema/orders.js';
import { paymentAttempts } from '../db/schema/paymentAttempts.js';
import { printrequests } from '../db/schema/printrequests.js';
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
	| {
			ok: false;
			status: 409;
			body: { error: 'listing_not_available'; productId: string };
	  }
	| { ok: false; status: 500; body: { error: 'razorpay_order_failed' } };

export type ConfirmOrderResult =
	| { ok: true; response: ConfirmCheckoutResponse }
	| { ok: false; status: 404; body: { error: 'order_not_found' } }
	| { ok: false; status: 403; body: { error: 'forbidden' } }
	| { ok: false; status: 409; body: { error: 'stock_conflict'; orderId: string } }
	| {
			ok: false;
			status: 409;
			/** The cart was already paid by another order; this payment needs a refund. */
			body: { error: 'duplicate_payment'; orderId: string };
	  };

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
	/** Owner-only lookup used by the payment result pages. Returns null when not found or not owned. */
	getOrderStatus(
		actor: Actor,
		query: { paymentId?: string; razorpayOrderId?: string }
	): Promise<CheckoutOrderStatusResponse | null>;
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

	const [order] = await tx.select().from(orders).where(eq(orders.id, attempt.entityId)).limit(1);

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

/**
 * After a failed payment, put the cart back to ACTIVE so the buyer keeps their items.
 * Falls back to FAILED (the old behaviour) if the owner already has another active cart,
 * because only one active cart per owner is allowed.
 */
export async function reopenCartAfterFailedPayment(tx: DbExecutor, cartId: string): Promise<void> {
	const [cart] = await tx.select().from(carts).where(eq(carts.id, cartId)).limit(1);
	if (!cart) return;
	if (
		cart.status !== CART_ORDER_STATUS.PAYMENT_PENDING &&
		cart.status !== CART_ORDER_STATUS.FAILED
	) {
		return;
	}

	const owner = cart.userId
		? eq(carts.userId, cart.userId)
		: cart.clientId
			? and(isNull(carts.userId), eq(carts.clientId, cart.clientId))
			: null;

	let nextStatus: typeof CART_ORDER_STATUS.ACTIVE | typeof CART_ORDER_STATUS.FAILED =
		CART_ORDER_STATUS.FAILED;

	if (owner) {
		const [otherActive] = await tx
			.select({ id: carts.id })
			.from(carts)
			.where(and(eq(carts.status, CART_ORDER_STATUS.ACTIVE), owner, ne(carts.id, cartId)))
			.limit(1);
		if (!otherActive) nextStatus = CART_ORDER_STATUS.ACTIVE;
	}

	await tx
		.update(carts)
		.set({ status: nextStatus, updatedAt: sql`now()` })
		.where(eq(carts.id, cartId));
}

type StoredAddress = {
	name?: unknown;
	line1?: unknown;
	line2?: unknown;
	city?: unknown;
	state?: unknown;
	pincode?: unknown;
	email?: unknown;
};

function stringOrNull(value: unknown): string | null {
	return typeof value === 'string' && value.length > 0 ? value : null;
}

function shippingFromStoredAddress(stored: unknown): StoredAddress | null {
	if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return null;
	const record = stored as Record<string, unknown>;
	const shipping = 'shipping' in record ? record.shipping : record;
	if (!shipping || typeof shipping !== 'object') return null;
	return shipping as StoredAddress;
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
				const unavailable = lockedProducts.find((product) => product.listingState !== 'live');
				if (unavailable || lockedProducts.length !== productIds.length) {
					const missingId =
						unavailable?.id ?? productIds.find((id) => !productById.has(id)) ?? productIds[0];
					return {
						kind: 'listing_not_available' as const,
						productId: missingId
					};
				}

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

			if (prepared.kind === 'listing_not_available') {
				return {
					ok: false,
					status: 409,
					body: {
						error: 'listing_not_available',
						productId: prepared.productId
					}
				};
			}

			if (prepared.kind === 'reuse') {
				const expectedAmountPaise = prepared.totalPaise;
				const existingRazorpayOrder = await razorpayClient.fetchOrder(prepared.razorpayOrderId);
				if (existingRazorpayOrder && existingRazorpayOrder.amount === expectedAmountPaise) {
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
							response: { status: 'already_paid' as const, orderId: order.id }
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
						// A unique violation here means another order for this cart is already paid
						// (orders_one_paid_per_cart_idx). Handled outside the aborted transaction.
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
								response: { status: 'already_paid' as const, orderId: order.id }
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
							body: { error: 'stock_conflict', orderId: order.id }
						};
					}

					return {
						ok: true as const,
						response: { status: 'paid' as const, orderId: order.id }
					};
				});

				if (result.ok && result.response.status === 'paid' && options?.mail) {
					notifyOrderReceived(db, options.mail, result.response.orderId);
				}

				return result;
			} catch (error) {
				if (isUniqueViolation(error)) {
					// Another order for this cart is already paid (orders_one_paid_per_cart_idx), so
					// this second captured payment is not attached to any paid order and needs a refund.
					const located = await findCheckoutOrderByProviderOrderId(db, razorpayOrderId);
					const [paidForCart] = located
						? await db
								.select({ id: orders.id })
								.from(orders)
								.where(
									and(eq(orders.cartId, located.cartId), eq(orders.status, CART_ORDER_STATUS.PAID))
								)
								.limit(1)
						: [];
					if (paidForCart) {
						storeLog('error', 'checkout.confirm.duplicate_payment', {
							orderId: located?.id ?? null,
							paidOrderId: paidForCart.id,
							razorpayOrderId,
							razorpayPaymentId,
							requiresRefund: true
						});
						return {
							ok: false,
							status: 409,
							body: { error: 'duplicate_payment', orderId: paidForCart.id }
						};
					}
				}
				throw error;
			}
		},

		async getOrderStatus(actor, query) {
			const condition = query.paymentId
				? eq(paymentAttempts.providerPaymentId, query.paymentId)
				: query.razorpayOrderId
					? eq(paymentAttempts.providerOrderId, query.razorpayOrderId)
					: null;
			if (!condition) return null;

			const [attempt] = await db.select().from(paymentAttempts).where(condition).limit(1);
			if (!attempt) return null;

			if (attempt.kind === PAYMENT_ATTEMPT_KIND.PRINT_REQUEST) {
				if (!actor.userId) return null;
				const [request] = await db
					.select({ id: printrequests.id, userId: printrequests.userId })
					.from(printrequests)
					.where(eq(printrequests.id, attempt.entityId))
					.limit(1);
				if (!request || request.userId !== actor.userId) return null;
				return {
					kind: 'print_request',
					printRequestId: request.id,
					paid: attempt.status === PAYMENT_ATTEMPT_STATUS.PAID
				};
			}

			if (attempt.kind !== PAYMENT_ATTEMPT_KIND.CART_ORDER) return null;

			const [order] = await db
				.select()
				.from(orders)
				.where(eq(orders.id, attempt.entityId))
				.limit(1);
			if (!order || !isOrderOwnedBy(order, actor)) return null;

			const items = await db
				.select({
					productId: orderItems.productId,
					name: orderItems.productName,
					qty: orderItems.qty,
					unitPricePaise: orderItems.unitPricePaise
				})
				.from(orderItems)
				.where(eq(orderItems.orderId, order.id));

			const shipping = shippingFromStoredAddress(order.address);

			return {
				kind: 'cart_order',
				orderId: order.id,
				status: order.status,
				items: items.map((item) => ({
					productId: item.productId,
					name: item.name,
					qty: item.qty,
					unitPriceRupees: paiseToRupees(item.unitPricePaise)
				})),
				subtotalRupees: paiseToRupees(order.subtotalPaise),
				deliveryFeeRupees: paiseToRupees(order.deliveryFeePaise),
				totalRupees: paiseToRupees(order.totalPaise),
				shipping: shipping
					? {
							name: stringOrNull(shipping.name),
							line1: stringOrNull(shipping.line1),
							line2: stringOrNull(shipping.line2),
							city: stringOrNull(shipping.city),
							state: stringOrNull(shipping.state),
							pincode: stringOrNull(shipping.pincode)
						}
					: null,
				email: shipping ? stringOrNull(shipping.email) : null,
				createdAt: order.createdAt
			};
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

					// The order failed, not the cart: hand the cart back so "Try again" still has
					// the buyer's items (a FAILED cart is never reloaded and the items were lost).
					await reopenCartAfterFailedPayment(tx, order.cartId);

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
