import { config } from 'dotenv';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { resolve } from 'node:path';
import { CART_ORDER_STATUS } from '../contracts/cart.js';
import { createDb } from '../db/index.js';
import { cart } from '../db/schema/cart.js';
import { cartItems } from '../db/schema/cartItems.js';
import { carts2 } from '../db/schema/carts.js';

config({ path: resolve(process.cwd(), '../.env') });
config({ path: resolve(process.cwd(), '.env') });
process.env.DATABASE_URL ??= process.env.POSTGRES_URL;

type LegacyCartItem = {
	product_id?: string;
	qty?: number;
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

async function main() {
	const { loadEnv } = await import('../env.js');
	const env = loadEnv();
	const { db, close } = createDb(env);

	let insertedCarts = 0;
	let insertedItems = 0;
	let skippedCarts = 0;

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
				skippedCarts++;
				continue;
			}

			const [alreadyMigrated] = await db
				.select({ id: carts2.id })
				.from(carts2)
				.where(
					and(
						eq(carts2.status, CART_ORDER_STATUS.ACTIVE),
						userId
							? eq(carts2.userId, userId)
							: and(isNull(carts2.userId), eq(carts2.clientId, clientId!))
					)
				)
				.limit(1);

			if (alreadyMigrated) {
				skippedCarts++;
				continue;
			}

			const items = parseLegacyList(legacy.list).filter(
				(item): item is { product_id: string; qty: number } =>
					typeof item.product_id === 'string' &&
					typeof item.qty === 'number' &&
					item.qty >= 1
			);

			if (items.length === 0) {
				skippedCarts++;
				continue;
			}

			const migrated = await db.transaction(async (tx) => {
				const conflictTarget = userId
					? {
							target: carts2.userId,
							where: sql`status = 'active' AND user_id IS NOT NULL`
						}
					: {
							target: carts2.clientId,
							where: sql`status = 'active' AND user_id IS NULL`
						};

				const [newCart] = await tx
					.insert(carts2)
					.values({
						userId,
						clientId,
						status: CART_ORDER_STATUS.ACTIVE,
						createdAt: legacy.createdAt,
						updatedAt: updatedAtValue(legacy.updatedAt, legacy.createdAt)
					})
					.onConflictDoNothing(conflictTarget)
					.returning({ id: carts2.id });

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
				skippedCarts++;
				continue;
			}

			insertedCarts++;
			insertedItems += migrated.itemCount;
		}

		console.log(
			`Backfill complete: ${insertedCarts} carts, ${insertedItems} items inserted; ${skippedCarts} carts skipped.`
		);
	} finally {
		await close();
	}
}

main().catch((error) => {
	console.error('Backfill failed:', error);
	process.exit(1);
});
