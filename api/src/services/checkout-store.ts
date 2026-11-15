import { and, desc, eq, inArray, isNull, ne, sql } from 'drizzle-orm';
import type { CheckoutOrderAddresses } from '../contracts/checkout.js';
import type {
	CheckoutNeedsSupport,
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
	type OrderItemSnapshot,
	type OrderTotals,
	shouldDecrementStock,
	shouldReuseRazorpayOrder,
	validateCheckoutLines,
	type CheckoutLine
} from './checkout.js';
import {
	lookupCapturedPayment,
	type RazorpayClient,
	type RazorpayOrderPayment
} from './razorpay-client.js';
import {
	createPaymentAttempt,
	findPaymentAttemptById,
	findPaymentAttemptByProviderOrderId,
	markPaymentAttemptPaid,
	PAYMENT_ATTEMPT_KIND,
	PAYMENT_ATTEMPT_STATUS,
	resolveProviderOrderId
} from './payment-attempts.js';
import { truncateAuditReason, writeAudit } from './audit.js';
import { storeLog } from '../middleware/logging.js';
import type { MailService } from './mail.js';
import { notifyOrderReceived } from './order-notifications.js';
import {
	findPaymentAttention,
	recordPaymentAttention,
	type PaymentAttention,
	type PaymentAttentionReason
} from './payment-attention.js';
import { auditLog } from '../db/schema/auditLog.js';

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
	| {
			ok: false;
			status: 409;
			/** The previous Razorpay order turned out to be paid; no new order was created. */
			body: { error: 'already_paid'; orderId: string; paymentId: string | null };
	  }
	| { ok: false; status: 500; body: { error: 'razorpay_order_failed' } }
	| {
			ok: false;
			status: 503;
			/**
			 * Razorpay could not say whether an earlier payment window for this cart was paid. No new
			 * payment was started; the buyer should wait and try again.
			 */
			body: { error: 'payment_check_unavailable' };
	  };

export type ConfirmOrderResult =
	| { ok: true; response: ConfirmCheckoutResponse }
	| { ok: false; status: 404; body: { error: 'order_not_found' } }
	| { ok: false; status: 403; body: { error: 'forbidden' } }
	| { ok: false; status: 409; body: { error: 'stock_conflict'; orderId: string } }
	| {
			ok: false;
			status: 409;
			/** The cart was already paid by another payment; this one is recorded for a refund. */
			body: { error: 'duplicate_payment'; orderId: string };
	  }
	| {
			ok: false;
			status: 409;
			/** The amount paid is not the order's current total; recorded for a refund. */
			body: { error: 'payment_mismatch'; orderId: string };
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

/** An open transaction that can also start a nested one (a savepoint). */
export type Tx = Parameters<Parameters<Database['transaction']>[0]>[0];

type OrderRow = typeof orders.$inferSelect;
type PaymentAttemptRow = typeof paymentAttempts.$inferSelect;

/** Audit action written when an order is paid but its stock could not be reserved. */
export const STOCK_CONFLICT_AUDIT_ACTION = 'paid_stock_conflict';

/** Statuses meaning the cart has been paid for by this order. */
const CART_PAID_STATUSES = [CART_ORDER_STATUS.PAID, CART_ORDER_STATUS.FULFILLED];

/**
 * `failure_reason` prefix for an unpaid attempt whose Razorpay order was issued for an earlier
 * version of the order (items, quantities, prices, delivery fee or addresses changed since). A
 * capture on it is never fulfilled; it is recorded for a refund as `stale_order`.
 */
export const SUPERSEDED_ATTEMPT_REASON = 'superseded_by_newer_checkout';

export function isSupersededAttempt(attempt: {
	status: string;
	failureReason: string | null;
}): boolean {
	return (
		attempt.status === PAYMENT_ATTEMPT_STATUS.FAILED &&
		(attempt.failureReason ?? '').startsWith(SUPERSEDED_ATTEMPT_REASON)
	);
}

/** A failure reason from the browser or Razorpay can never pass for the superseded marker. */
export function externalFailureReason(reason: string | null | undefined): string | null {
	if (!reason) return null;
	const truncated = truncateAuditReason(reason) ?? reason;
	return truncated.startsWith(SUPERSEDED_ATTEMPT_REASON) ? `reported: ${truncated}` : truncated;
}

/**
 * Moves one attempt from pending to failed. Never touches a paid, superseded or already failed
 * attempt. Returns false when the attempt was not pending.
 */
export async function failPendingAttempt(
	tx: DbExecutor,
	attemptId: string,
	reason: string | null
): Promise<boolean> {
	const updated = await tx
		.update(paymentAttempts)
		.set({
			status: PAYMENT_ATTEMPT_STATUS.FAILED,
			failureReason: reason,
			updatedAt: sql`now()`
		})
		.where(
			and(
				eq(paymentAttempts.id, attemptId),
				eq(paymentAttempts.status, PAYMENT_ATTEMPT_STATUS.PENDING)
			)
		)
		.returning({ id: paymentAttempts.id });
	return updated.length > 0;
}

/** Every unpaid attempt on the order stops being able to pay for it. */
async function supersedeOrderAttempts(tx: DbExecutor, orderId: string): Promise<void> {
	await tx
		.update(paymentAttempts)
		.set({
			status: PAYMENT_ATTEMPT_STATUS.FAILED,
			failureReason: sql`${SUPERSEDED_ATTEMPT_REASON} || coalesce('; ' || ${paymentAttempts.failureReason}, '')`,
			updatedAt: sql`now()`
		})
		.where(
			and(
				eq(paymentAttempts.kind, PAYMENT_ATTEMPT_KIND.CART_ORDER),
				eq(paymentAttempts.entityId, orderId),
				inArray(paymentAttempts.status, [
					PAYMENT_ATTEMPT_STATUS.PENDING,
					PAYMENT_ATTEMPT_STATUS.FAILED
				]),
				sql`coalesce(${paymentAttempts.failureReason}, '') not like ${`${SUPERSEDED_ATTEMPT_REASON}%`}`
			)
		);
}

/**
 * Locks a cart order for anything that changes its payment state, cart row first and then the
 * order. Checkout creation takes the same cart lock, so settlement, failure and creation for one
 * cart run one at a time and always in the same lock order.
 */
export async function lockCartOrderForPayment(
	tx: DbExecutor,
	orderId: string
): Promise<OrderRow | null> {
	const [ref] = await tx
		.select({ cartId: orders.cartId })
		.from(orders)
		.where(eq(orders.id, orderId))
		.limit(1);
	if (!ref) return null;

	await tx.select({ id: carts.id }).from(carts).where(eq(carts.id, ref.cartId)).for('update');

	const [order] = await tx
		.select()
		.from(orders)
		.where(eq(orders.id, orderId))
		.for('update')
		.limit(1);
	return order ?? null;
}

/** The paid (or fulfilled) order for a cart and the payment that paid it, if any. */
async function findPaidPaymentForCart(
	tx: DbExecutor,
	cartId: string
): Promise<{ orderId: string; paymentId: string | null } | null> {
	const [row] = await tx
		.select({ orderId: orders.id, paymentId: paymentAttempts.providerPaymentId })
		.from(orders)
		.leftJoin(paymentAttempts, eq(paymentAttempts.id, orders.activePaymentAttemptId))
		.where(and(eq(orders.cartId, cartId), inArray(orders.status, CART_PAID_STATUSES)))
		.limit(1);
	return row ? { orderId: row.orderId, paymentId: row.paymentId ?? null } : null;
}

/** What a checkout request is asking the buyer to pay for. */
type OrderSnapshot = {
	items: Pick<OrderItemSnapshot, 'productId' | 'qty' | 'unitPricePaise'>[];
	totals: OrderTotals;
	addresses: CheckoutOrderAddresses;
};

function sameOrderLines(left: OrderSnapshot['items'], right: OrderSnapshot['items']): boolean {
	if (left.length !== right.length) return false;
	const key = (line: OrderSnapshot['items'][number]) =>
		`${line.productId}:${line.qty}:${line.unitPricePaise}`;
	const a = left.map(key).sort();
	const b = right.map(key).sort();
	return a.every((value, index) => value === b[index]);
}

/** True when the stored order is exactly this snapshot: items, quantities, prices, fee, addresses. */
async function orderMatchesSnapshot(
	tx: DbExecutor,
	order: OrderRow,
	snapshot: OrderSnapshot
): Promise<boolean> {
	if (
		order.subtotalPaise !== snapshot.totals.subtotalPaise ||
		order.deliveryFeePaise !== snapshot.totals.deliveryFeePaise ||
		order.totalPaise !== snapshot.totals.totalPaise ||
		!checkoutOrderAddressesEqual(order.address, snapshot.addresses)
	) {
		return false;
	}
	const items = await tx
		.select({
			productId: orderItems.productId,
			qty: orderItems.qty,
			unitPricePaise: orderItems.unitPricePaise
		})
		.from(orderItems)
		.where(eq(orderItems.orderId, order.id));
	return sameOrderLines(items, snapshot.items);
}

class StockConflictError extends Error {
	constructor(
		readonly productId: string,
		readonly qty: number
	) {
		super('stock_conflict');
	}
}

export type CartPaymentSettlement =
	| { kind: 'paid'; orderId: string }
	| { kind: 'paid_stock_conflict'; orderId: string }
	| { kind: 'already_paid'; orderId: string; stockConflict: boolean }
	| {
			kind: 'attention';
			orderId: string;
			reason: 'duplicate_capture' | 'amount_mismatch' | 'entity_not_payable' | 'stale_order';
			/** The order that holds the cart's payment, when that is why this one was refused. */
			paidOrderId: string | null;
	  };

export async function orderHasStockConflict(db: DbExecutor, orderId: string): Promise<boolean> {
	const [row] = await db
		.select({ id: auditLog.id })
		.from(auditLog)
		.where(
			and(
				eq(auditLog.entityType, 'order'),
				eq(auditLog.entityId, orderId),
				eq(auditLog.action, STOCK_CONFLICT_AUDIT_ACTION)
			)
		)
		.limit(1);
	return Boolean(row);
}

/**
 * Applies a captured Razorpay payment to its cart order. Shared by the browser confirm, the
 * `payment.captured` webhook and the reconcile step before a new Razorpay order is issued.
 * `order` must already be locked FOR UPDATE by the caller.
 *
 * Never throws for a payment that cannot be applied: it returns `attention`, and the caller
 * records it with recordPaymentAttention once the transaction has finished.
 */
export async function settleCartPayment(
	tx: Tx,
	input: {
		attempt: PaymentAttemptRow;
		order: OrderRow;
		razorpayPaymentId: string;
		actorUserId: string | null;
		actorClientId: string | null;
		paidAction: string;
		paidMeta?: Record<string, unknown> | null;
		conflictMeta?: Record<string, unknown>;
	}
): Promise<CartPaymentSettlement> {
	const { order, razorpayPaymentId } = input;
	// Re-read under the order lock: a concurrent confirm or webhook for the same payment may
	// have settled it after the caller first read the attempt.
	const attempt = (await findPaymentAttemptById(tx, input.attempt.id)) ?? input.attempt;
	const razorpayOrderId = attempt.providerOrderId;
	const attention = (
		reason: 'duplicate_capture' | 'amount_mismatch' | 'entity_not_payable' | 'stale_order',
		paidOrderId: string | null = null
	): CartPaymentSettlement => ({ kind: 'attention', orderId: order.id, reason, paidOrderId });

	if (attempt.kind !== PAYMENT_ATTEMPT_KIND.CART_ORDER || attempt.entityId !== order.id) {
		return attention('entity_not_payable');
	}

	if (attempt.status === PAYMENT_ATTEMPT_STATUS.PAID) {
		if (attempt.providerPaymentId === razorpayPaymentId) {
			return {
				kind: 'already_paid',
				orderId: order.id,
				stockConflict: await orderHasStockConflict(tx, order.id)
			};
		}
		// A second payment on a Razorpay order that is already settled.
		return attention('duplicate_capture', order.id);
	}

	// The Razorpay order was issued for an earlier version of this order (an old payment window
	// still open after the items, prices or address changed). Never fulfil the new snapshot with it.
	if (isSupersededAttempt(attempt)) {
		return attention('stale_order');
	}

	if ((CART_PAID_STATUSES as string[]).includes(order.status)) {
		// Paid by a different Razorpay order attached to the same local order.
		return attention('duplicate_capture', order.id);
	}

	if (
		order.status !== CART_ORDER_STATUS.PAYMENT_PENDING &&
		order.status !== CART_ORDER_STATUS.FAILED
	) {
		return attention('entity_not_payable');
	}

	// Another order for this cart was paid (or already fulfilled): this payment is a duplicate.
	// The unique index only covers `paid`, so fulfilled orders have to be checked here.
	const [paidSibling] = await tx
		.select({ id: orders.id })
		.from(orders)
		.where(
			and(
				eq(orders.cartId, order.cartId),
				ne(orders.id, order.id),
				inArray(orders.status, CART_PAID_STATUSES)
			)
		)
		.limit(1);
	if (paidSibling) {
		return attention('duplicate_capture', paidSibling.id);
	}

	// An older Razorpay order can still be paid after the order was repriced. Only fulfil when
	// the amount paid is the amount of the order as it stands now.
	if (attempt.amountPaise !== order.totalPaise) {
		return attention('amount_mismatch');
	}

	let claimed: { id: string }[];
	try {
		claimed = await tx.transaction(async (sp) =>
			sp
				.update(orders)
				.set({
					status: CART_ORDER_STATUS.PAID,
					activePaymentAttemptId: attempt.id,
					updatedAt: sql`now()`
				})
				.where(
					and(
						eq(orders.id, order.id),
						inArray(orders.status, [CART_ORDER_STATUS.PAYMENT_PENDING, CART_ORDER_STATUS.FAILED])
					)
				)
				.returning({ id: orders.id })
		);
	} catch (error) {
		if (!isUniqueViolation(error)) throw error;
		// orders_one_paid_per_cart_idx: a concurrent payment for another order of this cart won.
		const [winner] = await tx
			.select({ id: orders.id })
			.from(orders)
			.where(and(eq(orders.cartId, order.cartId), eq(orders.status, CART_ORDER_STATUS.PAID)))
			.limit(1);
		return attention('duplicate_capture', winner?.id ?? null);
	}

	if (claimed.length === 0) {
		return attention('entity_not_payable');
	}

	await markPaymentAttemptPaid(tx, razorpayOrderId, razorpayPaymentId);

	await writeAudit(tx, {
		actorUserId: input.actorUserId,
		actorClientId: input.actorClientId,
		entityType: 'order',
		entityId: order.id,
		action: input.paidAction,
		fromState: order.status,
		toState: CART_ORDER_STATUS.PAID,
		providerIds: { razorpayOrderId, razorpayPaymentId },
		meta: input.paidMeta ?? null
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

	// All or nothing: if one line cannot be reserved, none of the decrements stay.
	let stockConflict: StockConflictError | null = null;
	try {
		await tx.transaction(async (sp) => {
			for (const line of lines) {
				if (!shouldDecrementStock(line.stock)) continue;
				const decremented = await decrementProductStock(sp, line.productId, line.qty);
				if (!decremented) throw new StockConflictError(line.productId, line.qty);
			}
		});
	} catch (error) {
		if (!(error instanceof StockConflictError)) throw error;
		stockConflict = error;
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
		storeLog('error', 'checkout.paid.stock_conflict', {
			orderId: order.id,
			razorpayOrderId,
			razorpayPaymentId,
			productId: stockConflict.productId,
			qty: stockConflict.qty,
			requiresManualSupport: true
		});

		await writeAudit(tx, {
			actorUserId: input.actorUserId,
			actorClientId: input.actorClientId,
			entityType: 'order',
			entityId: order.id,
			action: STOCK_CONFLICT_AUDIT_ACTION,
			fromState: CART_ORDER_STATUS.PAID,
			toState: CART_ORDER_STATUS.PAID,
			providerIds: { razorpayOrderId, razorpayPaymentId },
			meta: {
				productId: stockConflict.productId,
				qty: stockConflict.qty,
				requiresManualSupport: true,
				...(input.conflictMeta ?? {})
			}
		});

		return { kind: 'paid_stock_conflict', orderId: order.id };
	}

	return { kind: 'paid', orderId: order.id };
}

/** Maps a settlement to the browser confirm response; sends the receipt only for a clean `paid`. */
function confirmResultFromSettlement(
	db: Database,
	mail: MailService | undefined,
	settlement: CartPaymentSettlement
): ConfirmOrderResult {
	switch (settlement.kind) {
		case 'paid':
			if (mail) notifyOrderReceived(db, mail, settlement.orderId);
			return { ok: true, response: { status: 'paid', orderId: settlement.orderId } };
		case 'already_paid':
			// A repeated confirm must not hide a stock conflict behind a plain success.
			if (settlement.stockConflict) {
				return {
					ok: false,
					status: 409,
					body: { error: 'stock_conflict', orderId: settlement.orderId }
				};
			}
			return { ok: true, response: { status: 'already_paid', orderId: settlement.orderId } };
		case 'paid_stock_conflict':
			return {
				ok: false,
				status: 409,
				body: { error: 'stock_conflict', orderId: settlement.orderId }
			};
		case 'attention':
			if (settlement.reason === 'amount_mismatch' || settlement.reason === 'stale_order') {
				return {
					ok: false,
					status: 409,
					body: { error: 'payment_mismatch', orderId: settlement.orderId }
				};
			}
			return {
				ok: false,
				status: 409,
				body: {
					error: 'duplicate_payment',
					orderId: settlement.paidOrderId ?? settlement.orderId
				}
			};
	}
}

/** Turns a settlement that needs a person into a durable attention record and an e-mail. */
export async function recordCartSettlementAttention(
	db: Database,
	mail: MailService | undefined,
	settlement: CartPaymentSettlement,
	payment: {
		razorpayOrderId: string;
		razorpayPaymentId: string;
		amountPaise: number | null;
		detectedBy: PaymentAttention['detectedBy'];
	}
): Promise<void> {
	// A repeated settlement that still reports a stock conflict records it again (idempotent): the
	// first delivery may have committed the paid order but died before writing the record.
	const stockConflict =
		settlement.kind === 'paid_stock_conflict' ||
		(settlement.kind === 'already_paid' && settlement.stockConflict);
	if (settlement.kind !== 'attention' && !stockConflict) return;
	await recordPaymentAttention(db, mail, {
		razorpayPaymentId: payment.razorpayPaymentId,
		razorpayOrderId: payment.razorpayOrderId,
		amountPaise: payment.amountPaise,
		entityType: 'order',
		entityId: settlement.orderId,
		reason: settlement.kind === 'attention' ? settlement.reason : 'stock_conflict',
		detectedBy: payment.detectedBy,
		details:
			settlement.kind === 'attention' && settlement.paidOrderId
				? { paidOrderId: settlement.paidOrderId }
				: undefined
	});
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


function needsSupportForAttention(reason: PaymentAttentionReason): CheckoutNeedsSupport {
	switch (reason) {
		case 'stock_conflict':
			return 'stock_conflict';
		case 'duplicate_capture':
			return 'duplicate_payment';
		case 'amount_mismatch':
		case 'stale_order':
			return 'payment_mismatch';
		case 'entity_not_payable':
			return 'not_payable';
	}
}

/** How many of a cart's latest unpaid Razorpay orders are checked before a new one is issued. */
const RECONCILE_ATTEMPT_LIMIT = 3;

export function createCheckoutStore(
	db: Database,
	razorpayClient: RazorpayClient,
	options?: CheckoutStoreOptions
): CheckoutStore {
	/** Applies a payment Razorpay reports as captured. Returns the result to send, or null to go on. */
	async function applyReconciledCapture(
		razorpayOrderId: string,
		captured: RazorpayOrderPayment
	): Promise<CreateOrderResult | null> {
		storeLog('warn', 'checkout.order.reconciled_capture', {
			razorpayOrderId,
			razorpayPaymentId: captured.id
		});

		const settlement = await db.transaction(async (tx) => {
			const attempt = await findPaymentAttemptByProviderOrderId(tx, razorpayOrderId);
			if (attempt?.kind !== PAYMENT_ATTEMPT_KIND.CART_ORDER) return null;
			const order = await lockCartOrderForPayment(tx, attempt.entityId);
			if (!order) return null;
			return settleCartPayment(tx, {
				attempt,
				order,
				razorpayPaymentId: captured.id,
				actorUserId: null,
				actorClientId: null,
				paidAction: 'paid_reconciled'
			});
		});
		if (!settlement) return null;

		await recordCartSettlementAttention(db, options?.mail, settlement, {
			razorpayOrderId,
			razorpayPaymentId: captured.id,
			amountPaise: captured.amount,
			detectedBy: 'reconcile'
		});

		if (settlement.kind === 'attention') {
			// Recorded for a refund. The cart as it stands still needs paying for.
			return null;
		}

		if (settlement.kind === 'paid' && options?.mail) {
			notifyOrderReceived(db, options.mail, settlement.orderId);
		}

		return {
			ok: false,
			status: 409,
			body: { error: 'already_paid', orderId: settlement.orderId, paymentId: captured.id }
		};
	}

	/**
	 * Asks Razorpay whether one of the cart's latest unpaid Razorpay orders was paid after all
	 * (paid in the modal after a failure, browser closed before confirm). Applies any captured
	 * payment. Returns `already_paid` when the cart is now paid, 503 when Razorpay could not answer
	 * for one of them, and null when checkout can go on. A cart with no earlier Razorpay order is
	 * never sent to Razorpay here.
	 */
	async function reconcileUnresolvedCartPayments(
		cartId: string
	): Promise<CreateOrderResult | null> {
		const candidates = await db
			.select({ providerOrderId: paymentAttempts.providerOrderId })
			.from(paymentAttempts)
			.innerJoin(orders, eq(orders.id, paymentAttempts.entityId))
			.where(
				and(
					eq(paymentAttempts.kind, PAYMENT_ATTEMPT_KIND.CART_ORDER),
					eq(orders.cartId, cartId),
					inArray(paymentAttempts.status, [
						PAYMENT_ATTEMPT_STATUS.PENDING,
						PAYMENT_ATTEMPT_STATUS.FAILED
					])
				)
			)
			.orderBy(desc(paymentAttempts.createdAt))
			.limit(RECONCILE_ATTEMPT_LIMIT);
		if (candidates.length === 0) return null;

		const lookups = await Promise.all(
			candidates.map((candidate) =>
				lookupCapturedPayment(razorpayClient, candidate.providerOrderId)
			)
		);

		let result: CreateOrderResult | null = null;
		let unknown = false;
		for (const [index, lookup] of lookups.entries()) {
			const razorpayOrderId = candidates[index]!.providerOrderId;
			if (lookup.kind === 'unknown') {
				unknown = true;
				storeLog('warn', 'checkout.order.payment_check_unavailable', { cartId, razorpayOrderId });
				continue;
			}
			if (lookup.kind !== 'captured') continue;
			const applied = await applyReconciledCapture(razorpayOrderId, lookup.payment);
			result ??= applied;
		}

		if (result) return result;
		if (unknown) return { ok: false, status: 503, body: { error: 'payment_check_unavailable' } };
		return null;
	}

	/**
	 * Under the cart lock: is the reused Razorpay order still the order's live, unpaid attempt?
	 * Returns `already_paid` when a payment settled the cart meanwhile.
	 */
	async function checkReusableAttempt(prepared: {
		cartId: string;
		orderId: string;
		razorpayOrderId: string;
	}): Promise<'reusable' | 'not_reusable' | CreateOrderResult> {
		return db.transaction(async (tx) => {
			const order = await lockCartOrderForPayment(tx, prepared.orderId);
			const paid = await findPaidPaymentForCart(tx, prepared.cartId);
			if (paid) {
				return {
					ok: false as const,
					status: 409 as const,
					body: { error: 'already_paid' as const, ...paid }
				};
			}
			const attempt = await findPaymentAttemptByProviderOrderId(tx, prepared.razorpayOrderId);
			return order?.status === CART_ORDER_STATUS.PAYMENT_PENDING &&
				attempt?.status === PAYMENT_ATTEMPT_STATUS.PENDING &&
				order.activePaymentAttemptId === attempt.id
				? 'reusable'
				: 'not_reusable';
		});
	}

	/**
	 * Stores the new Razorpay order as the order's active attempt, unless a payment settled the cart
	 * or another request changed the order while Razorpay was being asked. In that case the Razorpay
	 * order is stored as superseded (a capture on it is recorded, never fulfilled) and not returned.
	 */
	async function persistNewAttempt(
		prepared: { cartId: string; orderId: string; snapshot: OrderSnapshot },
		razorpayOrder: { id: string; amount: number }
	): Promise<'persisted' | 'changed' | CreateOrderResult> {
		return db.transaction(async (tx) => {
			const order = await lockCartOrderForPayment(tx, prepared.orderId);
			const paid = await findPaidPaymentForCart(tx, prepared.cartId);
			const current =
				!paid &&
				order?.status === CART_ORDER_STATUS.PAYMENT_PENDING &&
				(await orderMatchesSnapshot(tx, order, prepared.snapshot));

			if (current) {
				await persistCheckoutPaymentAttempt(
					tx,
					prepared.orderId,
					razorpayOrder.id,
					razorpayOrder.amount
				);
				return 'persisted' as const;
			}

			if (order) {
				const orphan = await createPaymentAttempt(tx, {
					kind: PAYMENT_ATTEMPT_KIND.CART_ORDER,
					entityId: order.id,
					providerOrderId: razorpayOrder.id,
					amountPaise: razorpayOrder.amount
				});
				await tx
					.update(paymentAttempts)
					.set({
						status: PAYMENT_ATTEMPT_STATUS.FAILED,
						failureReason: SUPERSEDED_ATTEMPT_REASON
					})
					.where(eq(paymentAttempts.id, orphan.id));
			}

			storeLog('warn', 'checkout.order.changed_while_creating', {
				orderId: prepared.orderId,
				razorpayOrderId: razorpayOrder.id,
				paidOrderId: paid ? paid.orderId : null
			});

			if (paid) {
				return {
					ok: false as const,
					status: 409 as const,
					body: { error: 'already_paid' as const, ...paid }
				};
			}
			return 'changed' as const;
		});
	}

	return {
		async createOrder(actor, addresses, options) {
			const refreshPayment = options?.refreshPayment === true;
			const normalizedAddresses = normalizeCheckoutOrderAddresses(
				addresses.shipping,
				addresses.billing
			);

			// Before anything is reused or issued, make sure an earlier payment window for this cart
			// was not paid after all. Razorpay is asked outside any database transaction.
			const cartRef = await findCheckoutCartRow(db, actor);
			if (cartRef) {
				const reconciled = await reconcileUnresolvedCartPayments(cartRef.id);
				if (reconciled) return reconciled;
			}

			const prepared = await db.transaction(async (tx) => {
				// Settlement takes this lock too (lockCartOrderForPayment): a payment that commits
				// first is seen here, and one that arrives later waits until this transaction ends.
				const found = (await findCheckoutCartRow(tx, actor)) ?? cartRef;
				const [cart] = found
					? await tx.select().from(carts).where(eq(carts.id, found.id)).for('update').limit(1)
					: [];
				if (
					!cart ||
					(cart.status !== CART_ORDER_STATUS.ACTIVE &&
						cart.status !== CART_ORDER_STATUS.PAYMENT_PENDING)
				) {
					const paid = cart ? await findPaidPaymentForCart(tx, cart.id) : null;
					return paid
						? { kind: 'already_paid' as const, ...paid }
						: { kind: 'cart_empty' as const };
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
				const snapshot: OrderSnapshot = {
					items: snapshots,
					totals,
					addresses: normalizedAddresses
				};
				const existingOrder = await findPaymentPendingOrderForCart(tx, cart.id);

				if (existingOrder) {
					const previousTotalPaise = existingOrder.totalPaise;
					const addressChanged = !checkoutOrderAddressesEqual(
						existingOrder.address,
						normalizedAddresses
					);
					const unchanged = await orderMatchesSnapshot(tx, existingOrder, snapshot);

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

					if (!unchanged) {
						// Earlier payment windows were for a different order: none may pay for this one.
						await supersedeOrderAttempts(tx, existingOrder.id);
					}

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

					const storedRazorpayOrderId = unchanged
						? await resolveStoredRazorpayOrderId(tx, existingOrder)
						: null;

					if (!refreshPayment && shouldReuseRazorpayOrder(storedRazorpayOrderId)) {
						return {
							kind: 'reuse' as const,
							cartId: cart.id,
							orderId: existingOrder.id,
							razorpayOrderId: storedRazorpayOrderId!,
							totalPaise: totals.totalPaise,
							snapshot
						};
					}

					return {
						kind: 'created' as const,
						cartId: cart.id,
						orderId: existingOrder.id,
						totalPaise: totals.totalPaise,
						snapshot
					};
				}

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

				return {
					kind: 'created' as const,
					cartId: cart.id,
					orderId: inserted.id,
					totalPaise: totals.totalPaise,
					snapshot
				};
			});

			if (prepared.kind === 'cart_empty') {
				return { ok: false, status: 400, body: { error: 'cart_empty' } };
			}

			if (prepared.kind === 'already_paid') {
				return {
					ok: false,
					status: 409,
					body: { error: 'already_paid', orderId: prepared.orderId, paymentId: prepared.paymentId }
				};
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
					const check = await checkReusableAttempt(prepared);
					if (check === 'reusable') {
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
					if (check !== 'not_reusable') return check;
				} else {
					storeLog('warn', 'checkout.order.stale_razorpay_order', {
						orderId: prepared.orderId,
						razorpayOrderId: prepared.razorpayOrderId,
						expectedAmountPaise,
						actualAmountPaise: existingRazorpayOrder?.amount ?? null
					});
				}
			}

			try {
				const razorpayOrder = await razorpayClient.createOrder(
					prepared.totalPaise,
					prepared.orderId
				);

				const persisted = await persistNewAttempt(prepared, razorpayOrder);
				if (persisted === 'changed') {
					// Another checkout request changed this order meanwhile. Nothing was charged; the
					// buyer presses Pay again and gets a payment window for the order as it is now.
					return { ok: false, status: 500, body: { error: 'razorpay_order_failed' } };
				}
				if (persisted !== 'persisted') return persisted;

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
		},

		async confirmOrder(actor, razorpayOrderId, razorpayPaymentId) {
			const outcome = await db.transaction(async (tx) => {
				const attempt = await findPaymentAttemptByProviderOrderId(tx, razorpayOrderId);
				if (attempt?.kind !== PAYMENT_ATTEMPT_KIND.CART_ORDER) {
					return { kind: 'not_found' as const };
				}

				const order = await lockCartOrderForPayment(tx, attempt.entityId);

				if (!order) {
					return { kind: 'not_found' as const };
				}

				if (!isOrderOwnedBy(order, actor)) {
					return { kind: 'forbidden' as const };
				}

				const settlement = await settleCartPayment(tx, {
					attempt,
					order,
					razorpayPaymentId,
					actorUserId: actor.userId,
					actorClientId: actor.clientId,
					paidAction: 'paid'
				});

				return { kind: 'settled' as const, settlement, amountPaise: attempt.amountPaise };
			});

			if (outcome.kind === 'not_found') {
				return { ok: false, status: 404, body: { error: 'order_not_found' } };
			}
			if (outcome.kind === 'forbidden') {
				return { ok: false, status: 403, body: { error: 'forbidden' } };
			}

			const { settlement } = outcome;
			await recordCartSettlementAttention(db, options?.mail, settlement, {
				razorpayOrderId,
				razorpayPaymentId,
				amountPaise: outcome.amountPaise,
				detectedBy: 'confirm'
			});

			return confirmResultFromSettlement(db, options?.mail, settlement);
		},

		async getOrderStatus(actor, query) {
			// A payment recorded for a refund was never stored on an attempt: resolve its order
			// through the Razorpay order it was paid on. Ownership is checked on that order below.
			const attention = query.paymentId ? await findPaymentAttention(db, query.paymentId) : null;

			let attempt: PaymentAttemptRow | null = null;
			if (query.paymentId) {
				const [byPayment] = await db
					.select()
					.from(paymentAttempts)
					.where(eq(paymentAttempts.providerPaymentId, query.paymentId))
					.limit(1);
				attempt = byPayment ?? null;
				if (!attempt && attention?.razorpayOrderId) {
					attempt = await findPaymentAttemptByProviderOrderId(db, attention.razorpayOrderId);
				}
			}
			if (!attempt && query.razorpayOrderId) {
				attempt = await findPaymentAttemptByProviderOrderId(db, query.razorpayOrderId);
			}
			if (!attempt) return null;

			const attentionEntityType =
				attempt.kind === PAYMENT_ATTEMPT_KIND.CART_ORDER ? 'order' : 'print_request';
			const paymentAttention =
				attention &&
				attention.entityType === attentionEntityType &&
				attention.entityId === attempt.entityId
					? needsSupportForAttention(attention.reason)
					: null;

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
					paid: paymentAttention === null && attempt.status === PAYMENT_ATTEMPT_STATUS.PAID,
					needsSupport: paymentAttention === 'stock_conflict' ? 'not_payable' : paymentAttention
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
				needsSupport:
					paymentAttention ??
					((await orderHasStockConflict(db, order.id)) ? 'stock_conflict' : null),
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
				const found = await findPaymentAttemptByProviderOrderId(tx, razorpayOrderId);
				// Same lock order as settlement: cart, then order. Everything below is read under it.
				const order =
					found?.kind === PAYMENT_ATTEMPT_KIND.CART_ORDER
						? await lockCartOrderForPayment(tx, found.entityId)
						: null;

				if (!found || !order) {
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

				// Only a pending attempt becomes failed; a paid or superseded one is left alone.
				const attemptFailed = await failPendingAttempt(
					tx,
					found.id,
					externalFailureReason(reason)
				);

				// The order fails only when this was its live payment window. A paid or fulfilled
				// order, or one already paying through a newer Razorpay order, is never downgraded.
				if (
					attemptFailed &&
					order.status === CART_ORDER_STATUS.PAYMENT_PENDING &&
					order.activePaymentAttemptId === found.id
				) {
					await tx
						.update(orders)
						.set({
							status: CART_ORDER_STATUS.FAILED,
							updatedAt: sql`now()`
						})
						.where(
							and(eq(orders.id, order.id), eq(orders.status, CART_ORDER_STATUS.PAYMENT_PENDING))
						);

					// The order failed, not the cart: hand the cart back so "Try again" still has
					// the buyer's items (a FAILED cart is never reloaded and the items were lost).
					await reopenCartAfterFailedPayment(tx, order.cartId);

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

					return {
						ok: true as const,
						response: { status: CART_ORDER_STATUS.FAILED as string }
					};
				}

				return {
					ok: true as const,
					response: { status: resolveFailOrderStatus(order.status) }
				};
			});
		}
	};
}
