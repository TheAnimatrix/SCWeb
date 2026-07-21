import { and, eq, inArray, isNull, notInArray, sql } from 'drizzle-orm';
import type { IndexColumn } from 'drizzle-orm/pg-core';
import {
	CART_ORDER_STATUS,
	type GetCartResponse,
	type MergeCartResponse,
	type UpsertCartItemBody
} from '../contracts/cart.js';
import type { Database, DbExecutor } from '../db/index.js';
import { cartItems } from '../db/schema/cartItems.js';
import { carts } from '../db/schema/carts.js';
import { products } from '../db/schema/products.js';
import { users } from '../db/schema/users.js';
import type { Actor } from '../types/context.js';
import {
	actorType,
	buildCartView,
	buildGetCartResponse,
	classifyMergeScenario,
	hasActor,
	mergeCartLines,
	resolveItemMutation,
	stockLimitFromProduct,
	type MergeLine,
	type ProductSnapshot
} from './cart.js';
import { writeAudit } from './audit.js';
import {
	cancelStrayPaymentPendingCarts,
	findPaymentPendingCartRow,
	reactivatePaymentPendingCart
} from './abandoned-checkout.js';

export type UpsertCartItemResult =
	| { ok: true; response: GetCartResponse }
	| { ok: false; status: 409; body: { error: 'insufficient_stock'; limit: number } }
	| { ok: false; status: 404; body: { error: 'product_not_found' } };

export type MergeCartResult =
	| { ok: true; response: MergeCartResponse }
	| { ok: false; status: 403; body: { error: string; message: string } };

export interface CartStore {
	getCart(actor: Actor): Promise<GetCartResponse>;
	upsertCartItem(
		actor: Actor,
		productId: string,
		body: UpsertCartItemBody
	): Promise<UpsertCartItemResult>;
	mergeCart(actor: Actor, clientId: string): Promise<MergeCartResult>;
}

function partialUniqueConflict(target: IndexColumn, targetWhere: ReturnType<typeof sql>) {
	return { target, where: targetWhere };
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

async function findGuestActiveCart(db: DbExecutor, clientId: string) {
	const [row] = await db
		.select()
		.from(carts)
		.where(
			and(
				eq(carts.status, CART_ORDER_STATUS.ACTIVE),
				isNull(carts.userId),
				eq(carts.clientId, clientId)
			)
		)
		.limit(1);

	return row ?? null;
}

async function findUserActiveCart(db: DbExecutor, userId: string) {
	const [row] = await db
		.select()
		.from(carts)
		.where(and(eq(carts.status, CART_ORDER_STATUS.ACTIVE), eq(carts.userId, userId)))
		.limit(1);

	return row ?? null;
}

async function getCartLines(db: DbExecutor, cartId: string) {
	const rows = await db
		.select({
			qty: cartItems.qty,
			product: products,
			authorTier: users.tier
		})
		.from(cartItems)
		.innerJoin(products, eq(cartItems.productId, products.id))
		.leftJoin(users, eq(products.uid, users.id))
		.where(eq(cartItems.cartId, cartId));

	return rows.map((row) => ({
		qty: row.qty,
		product: {
			...(row.product as ProductSnapshot),
			authorTier: row.authorTier
		}
	}));
}

async function buildResponseForCart(
	db: DbExecutor,
	cart: { id: string; status: string }
): Promise<GetCartResponse> {
	const lines = await getCartLines(db, cart.id);
	return buildGetCartResponse(buildCartView(cart, lines));
}

async function getOrCreateActiveCart(db: DbExecutor, actor: Actor) {
	const existing = await findActiveCartRow(db, actor);
	if (existing) {
		await cancelStrayPaymentPendingCarts(db, actor, existing.id);
		return existing;
	}

	const pending = await findPaymentPendingCartRow(db, actor);
	if (pending) {
		return reactivatePaymentPendingCart(db, actor, pending);
	}

	const active = CART_ORDER_STATUS.ACTIVE;
	const values = actor.userId
		? {
				userId: actor.userId,
				clientId: actor.clientId,
				status: active as typeof CART_ORDER_STATUS.ACTIVE
			}
		: {
				clientId: actor.clientId!,
				status: active as typeof CART_ORDER_STATUS.ACTIVE
			};

	const conflictTarget = actor.userId
		? partialUniqueConflict(carts.userId, sql`status = ${active} AND user_id IS NOT NULL`)
		: partialUniqueConflict(carts.clientId, sql`status = ${active} AND user_id IS NULL`);

	const [inserted] = await db
		.insert(carts)
		.values(values)
		.onConflictDoNothing(conflictTarget)
		.returning();

	if (inserted) return inserted;

	const raced = await findActiveCartRow(db, actor);
	if (!raced) {
		throw new Error('active cart missing after conflict resolution');
	}

	return raced;
}

async function loadStockLimits(tx: DbExecutor, productIds: string[]): Promise<Map<string, number>> {
	if (productIds.length === 0) {
		return new Map();
	}

	const productRows = await tx.select().from(products).where(inArray(products.id, productIds));

	return new Map(
		productRows.map((product) => [product.id, stockLimitFromProduct(product as ProductSnapshot)])
	);
}

async function clampCartItemsToStock(tx: DbExecutor, cartId: string) {
	const lines = await tx
		.select({ productId: cartItems.productId, qty: cartItems.qty })
		.from(cartItems)
		.where(eq(cartItems.cartId, cartId));

	if (lines.length === 0) return;

	const limits = await loadStockLimits(
		tx,
		lines.map((line) => line.productId)
	);

	for (const line of lines) {
		const limit = limits.get(line.productId) ?? 0;
		const clampedQty = Math.min(line.qty, limit);

		if (clampedQty <= 0) {
			await tx
				.delete(cartItems)
				.where(and(eq(cartItems.cartId, cartId), eq(cartItems.productId, line.productId)));
		} else if (clampedQty !== line.qty) {
			await tx
				.update(cartItems)
				.set({ qty: clampedQty, updatedAt: sql`now()` })
				.where(and(eq(cartItems.cartId, cartId), eq(cartItems.productId, line.productId)));
		}
	}
}

async function applyMergedLinesToUserCart(
	tx: DbExecutor,
	userCartId: string,
	mergedLines: MergeLine[]
) {
	if (mergedLines.length === 0) {
		await tx.delete(cartItems).where(eq(cartItems.cartId, userCartId));
		return;
	}

	const mergedProductIds = mergedLines.map((line) => line.productId);

	for (const line of mergedLines) {
		await tx
			.insert(cartItems)
			.values({
				cartId: userCartId,
				productId: line.productId,
				qty: line.qty
			})
			.onConflictDoUpdate({
				target: [cartItems.cartId, cartItems.productId],
				set: {
					qty: line.qty,
					updatedAt: sql`now()`
				}
			});
	}

	await tx
		.delete(cartItems)
		.where(
			and(eq(cartItems.cartId, userCartId), notInArray(cartItems.productId, mergedProductIds))
		);
}

async function auditCartMerge(
	tx: DbExecutor,
	actor: Actor,
	userCartId: string,
	guestCartId: string
) {
	await writeAudit(tx, {
		actorUserId: actor.userId,
		actorClientId: actor.clientId,
		entityType: 'cart',
		entityId: userCartId,
		action: 'merged',
		fromState: CART_ORDER_STATUS.ACTIVE,
		toState: CART_ORDER_STATUS.ACTIVE,
		meta: { guestCartId }
	});
}

async function mergeBothCarts(
	tx: DbExecutor,
	actor: Actor,
	guestCart: { id: string },
	userCart: { id: string }
) {
	const guestLines = await tx
		.select({ productId: cartItems.productId, qty: cartItems.qty })
		.from(cartItems)
		.where(eq(cartItems.cartId, guestCart.id));

	const userLines = await tx
		.select({ productId: cartItems.productId, qty: cartItems.qty })
		.from(cartItems)
		.where(eq(cartItems.cartId, userCart.id));

	const productIds = [
		...new Set([
			...guestLines.map((line) => line.productId),
			...userLines.map((line) => line.productId)
		])
	];

	const limits = await loadStockLimits(tx, productIds);

	const mergedLines = mergeCartLines(
		guestLines,
		userLines,
		(productId) => limits.get(productId) ?? 0
	);

	await applyMergedLinesToUserCart(tx, userCart.id, mergedLines);
	await tx.delete(carts).where(eq(carts.id, guestCart.id));
	await auditCartMerge(tx, actor, userCart.id, guestCart.id);
}

export function createCartStore(db: Database): CartStore {
	return {
		async getCart(actor) {
			const cart = await findActiveCartRow(db, actor);
			if (!cart) {
				return buildGetCartResponse(null);
			}

			await cancelStrayPaymentPendingCarts(db, actor, cart.id);
			return buildResponseForCart(db, cart);
		},

		async upsertCartItem(actor, productId, body) {
			return db.transaction(async (tx) => {
				// Cross-request oversell is finally enforced at checkout; this row lock
				// closes the concurrent-oversell window within the PUT transaction.
				const [product] = await tx
					.select()
					.from(products)
					.where(eq(products.id, productId))
					.for('update')
					.limit(1);

				if (!product) {
					return {
						ok: false as const,
						status: 404 as const,
						body: { error: 'product_not_found' as const }
					};
				}

				const cart = await getOrCreateActiveCart(tx, actor);

				const [existingItem] = await tx
					.select({ qty: cartItems.qty })
					.from(cartItems)
					.where(and(eq(cartItems.cartId, cart.id), eq(cartItems.productId, productId)))
					.limit(1);

				const stockLimit = stockLimitFromProduct(product as ProductSnapshot);
				const mutation = resolveItemMutation({
					currentQty: existingItem?.qty,
					qty: body.qty,
					mode: body.mode,
					stockLimit
				});

				if ('action' in mutation && mutation.action === 'reject') {
					return {
						ok: false as const,
						status: 409 as const,
						body: { error: 'insufficient_stock' as const, limit: mutation.limit }
					};
				}

				if (mutation.action === 'delete') {
					await tx
						.delete(cartItems)
						.where(and(eq(cartItems.cartId, cart.id), eq(cartItems.productId, productId)));
				} else {
					await tx
						.insert(cartItems)
						.values({
							cartId: cart.id,
							productId,
							qty: mutation.qty
						})
						.onConflictDoUpdate({
							target: [cartItems.cartId, cartItems.productId],
							set: {
								qty: mutation.qty,
								updatedAt: sql`now()`
							}
						});
				}

				const response = await buildResponseForCart(tx, cart);
				return { ok: true as const, response };
			});
		},

		async mergeCart(actor, clientId) {
			if (!actor.userId) {
				throw new Error('mergeCart requires authenticated user');
			}

			if (actor.clientId !== clientId) {
				return {
					ok: false as const,
					status: 403 as const,
					body: {
						error: 'forbidden',
						message: 'clientId does not match the authenticated actor'
					}
				};
			}

			return db.transaction(async (tx) => {
				const guestCart = await findGuestActiveCart(tx, clientId);
				const userCart = await findUserActiveCart(tx, actor.userId!);
				const scenario = classifyMergeScenario(Boolean(guestCart), Boolean(userCart));

				if (scenario === 'neither' || scenario === 'only_user') {
					return { ok: true as const, response: { merged: false } };
				}

				if (scenario === 'only_guest' && guestCart) {
					try {
						await tx
							.update(carts)
							.set({
								userId: actor.userId,
								updatedAt: sql`now()`
							})
							.where(eq(carts.id, guestCart.id));

						await writeAudit(tx, {
							actorUserId: actor.userId,
							actorClientId: actor.clientId,
							entityType: 'cart',
							entityId: guestCart.id,
							action: 'guest_claimed',
							fromState: CART_ORDER_STATUS.ACTIVE,
							toState: CART_ORDER_STATUS.ACTIVE,
							meta: { guestClientId: clientId }
						});

						await clampCartItemsToStock(tx, guestCart.id);
						return { ok: true as const, response: { merged: true } };
					} catch (error) {
						if (!isUniqueViolation(error)) {
							throw error;
						}

						const racedGuest = await findGuestActiveCart(tx, clientId);
						const racedUser = await findUserActiveCart(tx, actor.userId!);

						if (racedGuest && racedUser) {
							await mergeBothCarts(tx, actor, racedGuest, racedUser);
							return { ok: true as const, response: { merged: true } };
						}

						if (racedUser && !racedGuest) {
							return { ok: true as const, response: { merged: false } };
						}

						throw error;
					}
				}

				if (scenario === 'both' && guestCart && userCart) {
					await mergeBothCarts(tx, actor, guestCart, userCart);
					return { ok: true as const, response: { merged: true } };
				}

				return { ok: true as const, response: { merged: false } };
			});
		}
	};
}

export { hasActor, actorType };
