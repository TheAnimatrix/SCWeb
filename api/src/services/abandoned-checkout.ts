import { and, eq, isNull, ne, sql } from 'drizzle-orm';
import { CART_ORDER_STATUS } from '../contracts/cart.js';
import type { DbExecutor } from '../db/index.js';
import { carts } from '../db/schema/carts.js';
import { orders } from '../db/schema/orders.js';
import type { Actor } from '../types/context.js';
import { writeAudit } from './audit.js';
import {
	findPaymentAttemptById,
	markPaymentAttemptFailed,
	resolveProviderOrderId
} from './payment-attempts.js';

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
	const [order] = await tx
		.select()
		.from(orders)
		.where(
			and(eq(orders.cartId, cartId), eq(orders.status, CART_ORDER_STATUS.PAYMENT_PENDING))
		)
		.limit(1);

	if (!order) return;

	await tx
		.update(orders)
		.set({ status: CART_ORDER_STATUS.FAILED, updatedAt: sql`now()` })
		.where(eq(orders.id, order.id));

	if (order.activePaymentAttemptId) {
		const attempt = await findPaymentAttemptById(tx, order.activePaymentAttemptId);
		const providerOrderId = resolveProviderOrderId(attempt);
		if (providerOrderId) {
			await markPaymentAttemptFailed(tx, providerOrderId, reason);
		}
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

export async function reactivatePaymentPendingCart(
	tx: DbExecutor,
	actor: Actor,
	cart: { id: string }
) {
	await failPaymentPendingOrderForCart(tx, actor, cart.id, 'checkout_resumed');

	await tx
		.update(carts)
		.set({ status: CART_ORDER_STATUS.ACTIVE, updatedAt: sql`now()` })
		.where(eq(carts.id, cart.id));

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
			and(
				eq(carts.status, CART_ORDER_STATUS.PAYMENT_PENDING),
				owner,
				ne(carts.id, keepCartId)
			)
		);

	for (const cart of strayCarts) {
		await abandonPaymentPendingCart(tx, actor, cart.id, 'superseded_by_active_cart');
	}
}
