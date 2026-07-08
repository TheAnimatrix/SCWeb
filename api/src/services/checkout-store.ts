import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import type { CheckoutAddress } from '../contracts/address.js';
import type {
	ConfirmCheckoutResponse,
	CreateCheckoutOrderResponse,
	FailCheckoutResponse
} from '../contracts/checkout.js';
import { CART_ORDER_STATUS } from '../contracts/cart.js';
import { rupeesToPaise } from '../contracts/money.js';
import type { Database, DbExecutor } from '../db/index.js';
import { cartItems } from '../db/schema/cartItems.js';
import { carts } from '../db/schema/carts.js';
import { orderItems } from '../db/schema/orderItems.js';
import { orders } from '../db/schema/orders.js';
import { products } from '../db/schema/products.js';
import type { Actor } from '../types/context.js';
import type { ProductSnapshot } from './cart.js';
import {
	buildOrderItemSnapshots,
	computeOrderTotals,
	isOrderOwnedBy,
	normalizeCheckoutAddress,
	resolveFailOrderStatus,
	shouldDecrementStock,
	shouldReuseRazorpayOrder,
	validateCheckoutLines,
	type CheckoutLine
} from './checkout.js';
import type { RazorpayClient } from './razorpay-client.js';

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
	createOrder(actor: Actor, address: CheckoutAddress): Promise<CreateOrderResult>;
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

function activeCartCondition(actor: Actor) {
	const active = CART_ORDER_STATUS.ACTIVE;

	if (actor.userId) {
		return and(eq(carts.status, active), eq(carts.userId, actor.userId));
	}

	if (actor.clientId) {
		return and(eq(carts.status, active), isNull(carts.userId), eq(carts.clientId, actor.clientId));
	}

	return null;
}

async function findActiveCartRow(db: DbExecutor, actor: Actor) {
	const condition = activeCartCondition(actor);
	if (!condition) return null;

	const [row] = await db.select().from(carts).where(condition).limit(1);
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
			unitPrice: item.unitPrice,
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

export function createCheckoutStore(db: Database, razorpayClient: RazorpayClient): CheckoutStore {
	return {
		async createOrder(actor, address) {
			const normalizedAddress = normalizeCheckoutAddress(address);

			const prepared = await db.transaction(async (tx) => {
				const cart = await findActiveCartRow(tx, actor);
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

				if (existingOrder && shouldReuseRazorpayOrder(existingOrder.razorpayOrderId)) {
					return {
						kind: 'reuse' as const,
						orderId: existingOrder.id,
						razorpayOrderId: existingOrder.razorpayOrderId!,
						total: existingOrder.total
					};
				}

				let orderId: string;

				if (existingOrder) {
					await tx
						.update(orders)
						.set({
							address: normalizedAddress,
							subtotal: totals.subtotal,
							deliveryFee: totals.deliveryFee,
							total: totals.total,
							updatedAt: sql`now()`
						})
						.where(eq(orders.id, existingOrder.id));

					await replaceOrderItems(tx, existingOrder.id, snapshots);
					orderId = existingOrder.id;
				} else {
					const [inserted] = await tx
						.insert(orders)
						.values({
							cartId: cart.id,
							userId: cart.userId,
							clientId: cart.clientId,
							status: CART_ORDER_STATUS.PAYMENT_PENDING,
							address: normalizedAddress,
							subtotal: totals.subtotal,
							deliveryFee: totals.deliveryFee,
							total: totals.total
						})
						.returning();

					await replaceOrderItems(tx, inserted.id, snapshots);

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
					total: totals.total,
					razorpayOrderId: existingOrder?.razorpayOrderId ?? null
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
				return {
					ok: true,
					response: {
						orderId: prepared.orderId,
						razorpayOrderId: prepared.razorpayOrderId,
						amountPaise: rupeesToPaise(prepared.total),
						currency: 'INR'
					}
				};
			}

			if (prepared.razorpayOrderId) {
				return {
					ok: true,
					response: {
						orderId: prepared.orderId,
						razorpayOrderId: prepared.razorpayOrderId,
						amountPaise: rupeesToPaise(prepared.total),
						currency: 'INR'
					}
				};
			}

			try {
				const razorpayOrder = await razorpayClient.createOrder(
					rupeesToPaise(prepared.total),
					prepared.orderId
				);

				await db
					.update(orders)
					.set({
						razorpayOrderId: razorpayOrder.id,
						updatedAt: sql`now()`
					})
					.where(eq(orders.id, prepared.orderId));

				return {
					ok: true,
					response: {
						orderId: prepared.orderId,
						razorpayOrderId: razorpayOrder.id,
						amountPaise: razorpayOrder.amount,
						currency: 'INR'
					}
				};
			} catch {
				return { ok: false, status: 500, body: { error: 'razorpay_order_failed' } };
			}
		},

		async confirmOrder(actor, razorpayOrderId, razorpayPaymentId) {
			try {
				return await db.transaction(async (tx) => {
					const [order] = await tx
						.select()
						.from(orders)
						.where(eq(orders.razorpayOrderId, razorpayOrderId))
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

					const lines = await tx
						.select({
							productId: orderItems.productId,
							qty: orderItems.qty,
							stock: products.stock
						})
						.from(orderItems)
						.innerJoin(products, eq(orderItems.productId, products.id))
						.where(eq(orderItems.orderId, order.id));

					for (const line of lines) {
						if (!shouldDecrementStock(line.stock)) {
							continue;
						}

						const decremented = await decrementProductStock(tx, line.productId, line.qty);
						if (!decremented) {
							console.error(
								JSON.stringify({
									level: 'error',
									message: 'checkout.confirm.stock_conflict',
									orderId: order.id,
									razorpayOrderId,
									razorpayPaymentId,
									productId: line.productId,
									qty: line.qty
								})
							);
							return {
								ok: false as const,
								status: 409 as const,
								body: { error: 'stock_conflict' as const }
							};
						}
					}

					try {
						await tx
							.update(orders)
							.set({
								status: CART_ORDER_STATUS.PAID,
								razorpayPaymentId,
								updatedAt: sql`now()`
							})
							.where(eq(orders.id, order.id));
					} catch (error) {
						if (isUniqueViolation(error)) {
							return {
								ok: true as const,
								response: { status: 'already_paid' as const }
							};
						}
						throw error;
					}

					await tx
						.update(carts)
						.set({
							status: CART_ORDER_STATUS.PAID,
							updatedAt: sql`now()`
						})
						.where(eq(carts.id, order.cartId));

					await tx.delete(cartItems).where(eq(cartItems.cartId, order.cartId));

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

		async failOrder(actor, razorpayOrderId, reason) {
			return db.transaction(async (tx) => {
				const [order] = await tx
					.select()
					.from(orders)
					.where(eq(orders.razorpayOrderId, razorpayOrderId))
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

					console.warn(
						JSON.stringify({
							level: 'warn',
							message: 'checkout.order.failed',
							orderId: order.id,
							razorpayOrderId,
							reason: reason ?? null
						})
					);
				}

				return {
					ok: true as const,
					response: { status: nextStatus }
				};
			});
		}
	};
}
