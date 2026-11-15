import { and, eq, isNull, ne, sql } from 'drizzle-orm';
import { CART_ORDER_STATUS } from '../contracts/cart.js';
import { PAYMENT_ATTEMPT_STATUS } from '../contracts/payment-attempts.js';
import type { DbExecutor } from '../db/index.js';
import { carts } from '../db/schema/carts.js';
import { orders } from '../db/schema/orders.js';
import { paymentAttempts } from '../db/schema/paymentAttempts.js';
import type { Actor } from '../types/context.js';
import { writeAudit } from './audit.js';

export function actorCartOwnerCondition(actor: Actor) {
	if (actor.userId) {
		return eq(carts.userId, actor.userId);
	}

	if (actor.clientId) {
		return and(isNull(carts.userId), eq(carts.clientId, actor.clientId));
	}

	return null;
}

export async function findPaymentPendingCartRow(db: DbExecutor, actor: Actor) {
	const owner = actorCartOwnerCondition(actor);
	if (!owner) return null;

	const [row] = await db
		.select()
		.from(carts)
		.where(and(eq(carts.status, CART_ORDER_STATUS.PAYMENT_PENDING), owner))
		.limit(1);

	return row ?? null;
}

async function failPaymentPendingOrderForCart(
	tx: DbExecutor,
	actor: Actor,
	cartId: string,
	reason: string
) {
	// A payment can be captured at any moment, and this helper also runs outside a transaction
	// (from getCart). So nothing here reads a row and then writes by id: each statement is one
	// conditional update that only moves something that is still waiting for payment. An order or
	// attempt that has just been paid is left exactly as it is.
	//
	// Inside a transaction the cart row is locked first, the same order settlement uses (cart,
	// then order). Taking the order first could deadlock against a capture that is settling.
	await tx.select({ id: carts.id }).from(carts).where(eq(carts.id, cartId)).for('update');

	const [order] = await tx
		.update(orders)
		.set({ status: CART_ORDER_STATUS.FAILED, updatedAt: sql`now()` })
		.where(and(eq(orders.cartId, cartId), eq(orders.status, CART_ORDER_STATUS.PAYMENT_PENDING)))
		.returning({ id: orders.id, activePaymentAttemptId: orders.activePaymentAttemptId });

	if (!order) return;

	if (order.activePaymentAttemptId) {
		await tx
			.update(paymentAttempts)
			.set({
				status: PAYMENT_ATTEMPT_STATUS.FAILED,
				failureReason: reason,
				updatedAt: sql`now()`
			})
			.where(
				and(
					eq(paymentAttempts.id, order.activePaymentAttemptId),
					eq(paymentAttempts.status, PAYMENT_ATTEMPT_STATUS.PENDING)
				)
			);
	}

	await writeAudit(tx, {
		actorUserId: actor.userId,
		actorClientId: actor.clientId,
		entityType: 'order',
		entityId: order.id,
		action: 'failed',
		fromState: CART_ORDER_STATUS.PAYMENT_PENDING,
		toState: CART_ORDER_STATUS.FAILED,
		meta: { reason }
	});
}

export async function abandonPaymentPendingCart(
	tx: DbExecutor,
	actor: Actor,
	cartId: string,
	reason: string
) {
	await failPaymentPendingOrderForCart(tx, actor, cartId, reason);

	await tx
		.update(carts)
		.set({ status: CART_ORDER_STATUS.FAILED, updatedAt: sql`now()` })
		.where(and(eq(carts.id, cartId), eq(carts.status, CART_ORDER_STATUS.PAYMENT_PENDING)));
}

export async function reactivatePaymentPendingCart<T extends { id: string }>(
	tx: DbExecutor,
	actor: Actor,
	cart: T
) {
	await failPaymentPendingOrderForCart(tx, actor, cart.id, 'checkout_resumed');

	// Only a cart that is still waiting for payment goes back to active. If its payment was
	// captured in the meantime the cart is paid, and the caller starts a fresh one.
	const [reactivated] = await tx
		.update(carts)
		.set({ status: CART_ORDER_STATUS.ACTIVE, updatedAt: sql`now()` })
		.where(and(eq(carts.id, cart.id), eq(carts.status, CART_ORDER_STATUS.PAYMENT_PENDING)))
		.returning({ id: carts.id });
	if (!reactivated) return null;

	return { ...cart, status: CART_ORDER_STATUS.ACTIVE as typeof CART_ORDER_STATUS.ACTIVE };
}

export async function cancelStrayPaymentPendingCarts(
	tx: DbExecutor,
	actor: Actor,
	keepCartId: string
) {
	const owner = actorCartOwnerCondition(actor);
	if (!owner) return;

	const strayCarts = await tx
		.select({ id: carts.id })
		.from(carts)
		.where(
			and(eq(carts.status, CART_ORDER_STATUS.PAYMENT_PENDING), owner, ne(carts.id, keepCartId))
		);

	for (const cart of strayCarts) {
		await abandonPaymentPendingCart(tx, actor, cart.id, 'superseded_by_active_cart');
	}
}
