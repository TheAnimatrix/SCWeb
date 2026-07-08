import { config } from 'dotenv';
import { and, eq, isNull, sql, type SQL } from 'drizzle-orm';
import type { IndexColumn } from 'drizzle-orm/pg-core';
import { resolve } from 'node:path';
import { CART_ORDER_STATUS } from '../contracts/cart.js';
import { createDb } from '../db/index.js';
import { cart } from '../db/schema/cart.js';
import { cartItems } from '../db/schema/cartItems.js';
import { carts } from '../db/schema/carts.js';

config({ path: resolve(process.cwd(), '../.env') });
config({ path: resolve(process.cwd(), '.env') });
process.env.DATABASE_URL ??= process.env.POSTGRES_URL;

type LegacyCartItem = {
	product_id?: string;
	qty?: number;
};

type SkippedCart = {
	legacyCartId: string;
	reason: string;
};

function ownerKey(row: { uid: string | null; clientId: string | null }): string | null {
	if (row.uid) return `user:${row.uid}`;
	if (row.clientId) return `client:${row.clientId}`;
	return null;
}

function parseLegacyList(list: unknown): LegacyCartItem[] {
	return Array.isArray(list) ? (list as LegacyCartItem[]) : [];
}

function updatedAtValue(updatedAt: string | null, createdAt: string): string {
	return updatedAt ?? createdAt;
}

function skipReason(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

/** Maps partial-index `targetWhere` to drizzle's onConflictDoNothing `where` clause. */
function partialUniqueConflict(target: IndexColumn, targetWhere: SQL) {
	return { target, where: targetWhere };
}

async function main() {
	const { loadEnv } = await import('../env.js');
	const env = loadEnv();
	const { db, close } = createDb(env);

	let insertedCarts = 0;
	let insertedItems = 0;
	const skipped: SkippedCart[] = [];

	try {
		const legacyCarts = await db
			.select()
			.from(cart)
			.where(
				and(
					eq(cart.status, CART_ORDER_STATUS.ACTIVE),
					sql`${cart.list} IS NOT NULL AND jsonb_typeof(${cart.list}) = 'array' AND jsonb_array_length(${cart.list}) > 0`
				)
			);

		const winners = new Map<string, (typeof legacyCarts)[number]>();
		for (const row of legacyCarts) {
			const key = ownerKey(row);
			if (!key) continue;

			const existing = winners.get(key);
			if (!existing) {
				winners.set(key, row);
				continue;
			}

			const rowUpdated = updatedAtValue(row.updatedAt, row.createdAt);
			const existingUpdated = updatedAtValue(existing.updatedAt, existing.createdAt);
			if (rowUpdated.localeCompare(existingUpdated) > 0) {
				winners.set(key, row);
			}
		}

		for (const legacy of winners.values()) {
			const userId = legacy.uid;
			const clientId = legacy.clientId;

			if (!userId && !clientId) {
				skipped.push({
					legacyCartId: legacy.id,
					reason: 'no owner (user_id and client_id both null)'
				});
				continue;
			}

			try {
				const [alreadyMigrated] = await db
					.select({ id: carts.id })
					.from(carts)
					.where(
						and(
							eq(carts.status, CART_ORDER_STATUS.ACTIVE),
							userId
								? eq(carts.userId, userId)
								: and(isNull(carts.userId), eq(carts.clientId, clientId!))
						)
					)
					.limit(1);

				if (alreadyMigrated) {
					skipped.push({ legacyCartId: legacy.id, reason: 'already migrated' });
					continue;
				}

				const items = parseLegacyList(legacy.list).filter(
					(item): item is { product_id: string; qty: number } =>
						typeof item.product_id === 'string' &&
						typeof item.qty === 'number' &&
						Number.isInteger(item.qty) &&
						item.qty >= 1
				);

				if (items.length === 0) {
					skipped.push({ legacyCartId: legacy.id, reason: 'no valid line items' });
					continue;
				}

				const migrated = await db.transaction(async (tx) => {
					const active = CART_ORDER_STATUS.ACTIVE;
					const conflictTarget = userId
						? partialUniqueConflict(carts.userId, sql`status = ${active} AND user_id IS NOT NULL`)
						: partialUniqueConflict(carts.clientId, sql`status = ${active} AND user_id IS NULL`);

					const [newCart] = await tx
						.insert(carts)
						.values({
							userId,
							clientId,
							status: CART_ORDER_STATUS.ACTIVE,
							createdAt: legacy.createdAt,
							updatedAt: updatedAtValue(legacy.updatedAt, legacy.createdAt)
						})
						.onConflictDoNothing(conflictTarget)
						.returning({ id: carts.id });

					if (!newCart) {
						return { cartInserted: false, itemCount: 0 };
					}

					let itemCount = 0;
					for (const item of items) {
						const inserted = await tx
							.insert(cartItems)
							.values({
								cartId: newCart.id,
								productId: item.product_id,
								qty: item.qty
							})
							.onConflictDoNothing()
							.returning({ cartId: cartItems.cartId });

						if (inserted.length > 0) {
							itemCount++;
						}
					}

					return { cartInserted: true, itemCount };
				});

				if (!migrated.cartInserted) {
					skipped.push({
						legacyCartId: legacy.id,
						reason: 'conflict on insert (active cart already exists)'
					});
					continue;
				}

				insertedCarts++;
				insertedItems += migrated.itemCount;
			} catch (error) {
				skipped.push({ legacyCartId: legacy.id, reason: skipReason(error) });
			}
		}

		console.log(
			`Backfill complete: ${insertedCarts} carts migrated, ${insertedItems} items inserted.`
		);
		if (skipped.length > 0) {
			console.log(`Skipped (${skipped.length}):`);
			for (const entry of skipped) {
				console.log(`  - ${entry.legacyCartId}: ${entry.reason}`);
			}
		} else {
			console.log('Skipped: none');
		}
	} finally {
		await close();
	}
}

main().catch((error) => {
	console.error('Backfill failed:', error);
	process.exit(1);
});
