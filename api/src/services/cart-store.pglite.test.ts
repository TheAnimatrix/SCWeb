import { PGlite } from '@electric-sql/pglite';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CART_ORDER_STATUS } from '../contracts/cart.js';
import type { Database } from '../db/index.js';
import * as schema from '../db/schema/index.js';
import { cartItems } from '../db/schema/cartItems.js';
import { carts } from '../db/schema/carts.js';
import { products } from '../db/schema/products.js';
import { createCartStore } from './cart-store.js';

const USER_ID = '11111111-1111-1111-1111-111111111111';
const CLIENT_A = 'client-a';
const CLIENT_B = 'client-b';
const PRODUCT_1 = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const PRODUCT_2 = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const PRODUCT_3 = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const UNKNOWN_PRODUCT = '99999999-9999-9999-9999-999999999999';

const PRODUCTS_STUB_SQL = `
CREATE TABLE IF NOT EXISTS "products" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text,
	"price" jsonb,
	"stock" jsonb,
	"images" jsonb,
	"author" text,
	"type" text,
	"guarantee" text,
	"rel" text,
	"tags" jsonb,
	"offer" jsonb,
	"rating" jsonb,
	"documentation" jsonb,
	"faq" jsonb,
	"uid" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
`;

const migrationSql = readFileSync(
	resolve(import.meta.dirname, '../../drizzle/0001_cart_checkout_tables.sql'),
	'utf8'
);

type TestDb = {
	client: PGlite;
	db: Database;
};

async function createTestDb(): Promise<TestDb> {
	const client = new PGlite();
	await client.exec(PRODUCTS_STUB_SQL);

	const statements = migrationSql
		.split('--> statement-breakpoint')
		.map((statement) => statement.trim())
		.filter(Boolean);

	for (const statement of statements) {
		await client.exec(statement);
	}

	const db = drizzle(client, { schema }) as unknown as Database;
	return { client, db };
}

async function seedProduct(db: Database, id: string, stockCount: number, name = 'Test product') {
	await db.insert(products).values({
		id,
		name,
		author: 'test_maker',
		guarantee: '7-day guarantee',
		price: { new: 100, old: 120 },
		stock: { count: stockCount, status: 'in stock' },
		images: [{ url: 'https://example.com/item.png' }]
	});
}

async function seedGuestCartLine(db: Database, clientId: string, productId: string, qty: number) {
	const [guestCart] = await db
		.insert(carts)
		.values({ clientId, status: CART_ORDER_STATUS.ACTIVE })
		.returning();

	await db.insert(cartItems).values({
		cartId: guestCart.id,
		productId,
		qty
	});

	return guestCart;
}

async function seedUserCartLine(db: Database, userId: string, productId: string, qty: number) {
	const [userCart] = await db
		.insert(carts)
		.values({ userId, status: CART_ORDER_STATUS.ACTIVE })
		.returning();

	await db.insert(cartItems).values({
		cartId: userCart.id,
		productId,
		qty
	});

	return userCart;
}

describe('CartStore (PGlite)', () => {
	let testDb: TestDb;

	beforeEach(async () => {
		testDb = await createTestDb();
	});

	afterEach(async () => {
		await testDb.client.close();
	});

	describe('actor scoping', () => {
		it('isolates guest and user carts', async () => {
			const store = createCartStore(testDb.db);
			await seedProduct(testDb.db, PRODUCT_1, 5);
			await seedProduct(testDb.db, PRODUCT_2, 5);

			await store.upsertCartItem({ userId: USER_ID, clientId: CLIENT_A }, PRODUCT_1, {
				qty: 2,
				mode: 'set'
			});
			await store.upsertCartItem({ userId: null, clientId: CLIENT_B }, PRODUCT_2, {
				qty: 1,
				mode: 'set'
			});

			const guestView = await store.getCart({ userId: null, clientId: CLIENT_B });
			const userView = await store.getCart({ userId: USER_ID, clientId: CLIENT_A });
			const crossGuestView = await store.getCart({ userId: null, clientId: CLIENT_A });

			expect(guestView.cart?.items).toHaveLength(1);
			expect(guestView.cart?.items[0]?.productId).toBe(PRODUCT_2);
			expect(guestView.cart?.items[0]?.author).toBe('test_maker');
			expect(guestView.cart?.items[0]?.guarantee).toBe('7-day guarantee');
			expect(userView.cart?.items).toHaveLength(1);
			expect(userView.cart?.items[0]?.productId).toBe(PRODUCT_1);
			expect(crossGuestView.cart).toBeNull();
		});
	});

	describe('lazy creation race', () => {
		it('creates a single active cart across sequential upserts', async () => {
			const store = createCartStore(testDb.db);
			await seedProduct(testDb.db, PRODUCT_1, 5);

			const actor = { userId: null, clientId: 'race-client' };
			const first = await store.upsertCartItem(actor, PRODUCT_1, { qty: 1, mode: 'set' });
			const second = await store.upsertCartItem(actor, PRODUCT_1, { qty: 2, mode: 'add' });

			expect(first.ok).toBe(true);
			expect(second.ok).toBe(true);
			if (!first.ok || !second.ok) return;

			expect(second.response.cart?.id).toBe(first.response.cart?.id);

			const cartRows = await testDb.db
				.select()
				.from(carts)
				.where(eq(carts.clientId, 'race-client'));

			expect(cartRows).toHaveLength(1);
		});

		it('enforces the partial unique index on active user carts', async () => {
			await testDb.db.insert(carts).values({
				userId: USER_ID,
				status: CART_ORDER_STATUS.ACTIVE
			});

			await expect(
				testDb.db.insert(carts).values({
					userId: USER_ID,
					status: CART_ORDER_STATUS.ACTIVE
				})
			).rejects.toMatchObject({ code: '23505' });
		});
	});

	describe('merge branches', () => {
		it('claims only_guest carts with post-merge clamping', async () => {
			const store = createCartStore(testDb.db);
			await seedProduct(testDb.db, PRODUCT_1, 5);
			await seedGuestCartLine(testDb.db, CLIENT_A, PRODUCT_1, 10);

			const result = await store.mergeCart({ userId: USER_ID, clientId: CLIENT_A }, CLIENT_A);

			expect(result).toEqual({ ok: true, response: { merged: true } });

			const userView = await store.getCart({ userId: USER_ID, clientId: CLIENT_A });
			expect(userView.cart?.items).toEqual([
				expect.objectContaining({ productId: PRODUCT_1, qty: 5 })
			]);
		});

		it('merges both carts with sum, clamp, and zero-delete', async () => {
			const store = createCartStore(testDb.db);
			await seedProduct(testDb.db, PRODUCT_1, 5);
			await seedProduct(testDb.db, PRODUCT_2, 0);

			const userCart = await seedUserCartLine(testDb.db, USER_ID, PRODUCT_1, 3);
			await testDb.db.insert(cartItems).values({
				cartId: userCart.id,
				productId: PRODUCT_2,
				qty: 4
			});
			const guestCart = await seedGuestCartLine(testDb.db, CLIENT_A, PRODUCT_1, 4);

			const result = await store.mergeCart({ userId: USER_ID, clientId: CLIENT_A }, CLIENT_A);

			expect(result).toEqual({ ok: true, response: { merged: true } });

			const remainingGuestCarts = await testDb.db
				.select()
				.from(carts)
				.where(eq(carts.id, guestCart.id));
			expect(remainingGuestCarts).toHaveLength(0);

			const userView = await store.getCart({ userId: USER_ID, clientId: CLIENT_A });
			expect(userView.cart?.items).toEqual([
				expect.objectContaining({ productId: PRODUCT_1, qty: 5 })
			]);

			const staleRows = await testDb.db
				.select()
				.from(cartItems)
				.where(eq(cartItems.productId, PRODUCT_2));
			expect(staleRows).toHaveLength(0);
		});

		it('is idempotent when re-merging after guest cart is gone', async () => {
			const store = createCartStore(testDb.db);
			await seedProduct(testDb.db, PRODUCT_1, 5);

			await store.upsertCartItem({ userId: null, clientId: CLIENT_A }, PRODUCT_1, {
				qty: 1,
				mode: 'set'
			});

			const first = await store.mergeCart({ userId: USER_ID, clientId: CLIENT_A }, CLIENT_A);
			const second = await store.mergeCart({ userId: USER_ID, clientId: CLIENT_A }, CLIENT_A);

			expect(first).toEqual({ ok: true, response: { merged: true } });
			expect(second).toEqual({ ok: true, response: { merged: false } });
		});
	});

	describe('upsertCartItem', () => {
		it('rejects quantities above stock', async () => {
			const store = createCartStore(testDb.db);
			await seedProduct(testDb.db, PRODUCT_3, 2);

			const result = await store.upsertCartItem({ userId: null, clientId: CLIENT_B }, PRODUCT_3, {
				qty: 5,
				mode: 'set'
			});

			expect(result).toEqual({
				ok: false,
				status: 409,
				body: { error: 'insufficient_stock', limit: 2 }
			});
		});

		it('returns not-found for unknown products', async () => {
			const store = createCartStore(testDb.db);

			const result = await store.upsertCartItem(
				{ userId: null, clientId: CLIENT_B },
				UNKNOWN_PRODUCT,
				{ qty: 1, mode: 'set' }
			);

			expect(result).toEqual({
				ok: false,
				status: 404,
				body: { error: 'product_not_found' }
			});
		});
	});
});
