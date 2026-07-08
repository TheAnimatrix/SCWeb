import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
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
	type ProductSnapshot
} from './cart.js';

export type UpsertCartItemResult =
	| { ok: true; response: GetCartResponse }
	| { ok: false; status: 409; body: { error: 'insufficient_stock'; limit: number } };

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
			product: products
		})
		.from(cartItems)
		.innerJoin(products, eq(cartItems.productId, products.id))
		.where(eq(cartItems.cartId, cartId));

	return rows.map((row) => ({
		qty: row.qty,
		product: row.product as ProductSnapshot
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
	if (existing) return existing;

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

export function createCartStore(db: Database): CartStore {
	return {
		async getCart(actor) {
			const cart = await findActiveCartRow(db, actor);
			if (!cart) {
				return buildGetCartResponse(null);
			}

			return buildResponseForCart(db, cart);
		},

		async upsertCartItem(actor, productId, body) {
			return db.transaction(async (tx) => {
				const [product] = await tx
					.select()
					.from(products)
					.where(eq(products.id, productId))
					.limit(1);

				if (!product) {
					throw new Error(`product not found: ${productId}`);
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
					await tx
						.update(carts)
						.set({
							userId: actor.userId,
							updatedAt: sql`now()`
						})
						.where(eq(carts.id, guestCart.id));

					return { ok: true as const, response: { merged: true } };
				}

				if (scenario === 'both' && guestCart && userCart) {
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

					const productRows =
						productIds.length > 0
							? await tx.select().from(products).where(inArray(products.id, productIds))
							: [];

					const limits = new Map(
						productRows.map((product) => [
							product.id,
							stockLimitFromProduct(product as ProductSnapshot)
						])
					);

					const mergedLines = mergeCartLines(
						guestLines,
						userLines,
						(productId) => limits.get(productId) ?? 0
					);

					for (const line of mergedLines) {
						await tx
							.insert(cartItems)
							.values({
								cartId: userCart.id,
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

					await tx.delete(carts).where(eq(carts.id, guestCart.id));
					return { ok: true as const, response: { merged: true } };
				}

				return { ok: true as const, response: { merged: false } };
			});
		}
	};
}

export { hasActor, actorType };
