import { PGlite } from '@electric-sql/pglite';
import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CheckoutAddress } from '../contracts/address.js';
import type { Database } from '../db/index.js';
import * as schema from '../db/schema/index.js';
import { applyInterestMigration } from '../test/interest-tables.js';
import { createCatalogStore } from './catalog-store.js';
import {
	createInterestStore,
	groupSmallPlaces,
	InterestRuleError,
	type InterestStoreDeps
} from './interest-store.js';
import type { RenderedEmail } from './mail.js';
import { createMakersStore } from './makers-store.js';

const MAKER = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const BUYER_A = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const BUYER_B = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const BUYER_C = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const PRODUCT = '11111111-1111-4111-8111-111111111111';
const ORDINARY = '22222222-2222-4222-8222-222222222222';

const STUB_SQL = `
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"username" text,
	"tier" text,
	"email" text,
	"addresses" jsonb,
	"crafts" jsonb,
	"orders" jsonb,
	"quote_daily_limit" integer,
	"created_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE TABLE "makers" (
	"id" uuid PRIMARY KEY NOT NULL,
	"display_name" text,
	"approved_state" text NOT NULL DEFAULT 'pending',
	"application" jsonb,
	"approved_at" timestamp with time zone,
	"tagline" text,
	"bio" text,
	"avatar_url" text,
	"banner_url" text,
	"location" text,
	"socials" jsonb,
	"storefront_state" text NOT NULL DEFAULT 'draft',
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL DEFAULT now(),
	"updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE TABLE "listing_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"maker_id" uuid NOT NULL,
	"from_state" text,
	"to_state" text NOT NULL,
	"reviewer_id" uuid,
	"notes" text,
	"snapshot" jsonb,
	"created_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"comment" text,
	"created_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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
	"maker_id" uuid,
	"listing_state" text NOT NULL DEFAULT 'draft',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "order_items" ("order_id" uuid NOT NULL, "product_id" uuid NOT NULL, "qty" integer);
CREATE TABLE "cart_items" ("cart_id" uuid NOT NULL, "product_id" uuid NOT NULL, "qty" integer);
`;

const auditMigrationSql = readFileSync(
	resolve(import.meta.dirname, '../../drizzle/0004_audit_log.sql'),
	'utf8'
);

function address(overrides: Partial<CheckoutAddress> = {}): CheckoutAddress {
	return {
		name: 'Asha Rao',
		line1: '12 Lake Road',
		city: 'Bengaluru',
		state: 'Karnataka',
		pincode: '560001',
		phone: '+919876543210',
		...overrides
	};
}

type Sent = { to: string; email: RenderedEmail };

function fakeDeps(
	options: { failFor?: Set<string>; gate?: Promise<void>; joinedEmailDelayMs?: number } = {}
) {
	const sent: Sent[] = [];
	const deliver = vi.fn(async (to: string, email: RenderedEmail) => {
		// The gate holds back launch and closure notices only.
		if (options.gate && !email.subject.startsWith("You're on the list")) await options.gate;
		if (options.failFor?.has(to)) throw new Error('smtp down');
		sent.push({ to, email });
	});
	const deps: InterestStoreDeps = {
		siteUrl: 'https://selfcrafted.test',
		deliver,
		joinedEmailDelayMs: options.joinedEmailDelayMs
	};
	return { deps, sent, deliver };
}

/** Lets the fire-and-forget "joined" e-mail finish. */
async function settle() {
	for (let i = 0; i < 5; i++) await new Promise((resolve) => setTimeout(resolve, 5));
}

describe('interest store (PGlite)', () => {
	let client: PGlite;
	let db: Database;

	beforeEach(async () => {
		client = new PGlite();
		await client.exec(STUB_SQL);
		for (const statement of auditMigrationSql.split('--> statement-breakpoint')) {
			if (statement.trim()) await client.exec(statement);
		}
		await applyInterestMigration(client);
		db = drizzle(client, { schema }) as unknown as Database;

		const createdAt = '2026-01-01T00:00:00Z';
		await db.insert(schema.users).values([
			{ id: MAKER, username: 'clay_maker', createdAt },
			{ id: BUYER_A, username: 'buyer_a', email: 'a@example.test', createdAt },
			{ id: BUYER_B, username: 'buyer_b', email: 'b@example.test', createdAt },
			{ id: BUYER_C, username: 'buyer_c', email: 'c@example.test', createdAt }
		]);
		await db.insert(schema.makers).values({
			id: MAKER,
			displayName: 'Clay Studio',
			approvedState: 'approved'
		});
		await db.insert(schema.products).values([
			{
				id: PRODUCT,
				name: 'Moon Lamp',
				uid: MAKER,
				makerId: MAKER,
				author: 'clay_maker',
				type: 'product',
				listingState: 'live',
				price: { new: 1499, old: 1499 },
				stock: { count: 0, status: 'out-of-stock' },
				images: [],
				tags: [],
				guarantee: '',
				rel: ''
			},
			{
				id: ORDINARY,
				name: 'Plain Mug',
				uid: MAKER,
				makerId: MAKER,
				type: 'product',
				listingState: 'live',
				price: { new: 300, old: 300 },
				stock: { count: 4, status: 'in-stock' },
				images: [],
				tags: [],
				guarantee: '',
				rel: ''
			}
		]);
		await db
			.insert(schema.interestCampaigns)
			.values({ productId: PRODUCT, targetCount: 3, shipsWithinDays: 21, note: 'Glazed by hand.' });
	});

	afterEach(async () => {
		await client.close();
	});

	async function join(
		store: ReturnType<typeof createInterestStore>,
		userId: string,
		email: string,
		addr: CheckoutAddress = address()
	) {
		return store.showInterest({ userId, productId: PRODUCT, address: addr, email });
	}

	async function interestRow(userId: string) {
		const [row] = await db
			.select()
			.from(schema.productInterests)
			.where(
				and(
					eq(schema.productInterests.productId, PRODUCT),
					eq(schema.productInterests.userId, userId)
				)
			);
		return row;
	}

	describe('buyers', () => {
		it('joins, snapshots the details and sends the "joined" e-mail once', async () => {
			const { deps, sent } = fakeDeps();
			const store = createInterestStore(db, deps);

			const result = await join(store, BUYER_A, 'a@example.test');
			expect(result).toEqual({ ok: true, response: { interested: true, interestedCount: 1 } });
			await settle();

			const row = await interestRow(BUYER_A);
			expect(row).toMatchObject({
				name: 'Asha Rao',
				email: 'a@example.test',
				phone: '+919876543210',
				withdrawnAt: null,
				notifiedAt: null
			});
			expect(row?.address.city).toBe('Bengaluru');

			expect(sent).toHaveLength(1);
			expect(sent[0]?.to).toBe('a@example.test');
			expect(sent[0]?.email.subject).toBe("You're on the list for Moon Lamp");
			expect(sent[0]?.email.text).toContain(
				'Thanks for showing interest in Moon Lamp by Clay Studio.'
			);
			expect(sent[0]?.email.text).toContain(
				'Clay Studio will produce it once 3 people show interest (1 so far), and plans to ship within 21 days of reaching that number.'
			);
			expect(sent[0]?.email.text).toContain(
				'https://selfcrafted.test/Moon_Lamp/craft/item=' + PRODUCT
			);

			await expect(store.getMyInterest(BUYER_A, PRODUCT)).resolves.toMatchObject({
				interested: true,
				since: expect.any(String)
			});
		});

		it('updates the address on a repeat without a second e-mail', async () => {
			const { deps, sent } = fakeDeps();
			const store = createInterestStore(db, deps);

			await join(store, BUYER_A, 'a@example.test');
			const again = await join(
				store,
				BUYER_A,
				'a@example.test',
				address({ city: 'Mysuru', phone: '+919999988888' })
			);
			await settle();

			expect(again).toEqual({ ok: true, response: { interested: true, interestedCount: 1 } });
			expect(sent).toHaveLength(1);
			const row = await interestRow(BUYER_A);
			expect(row?.address.city).toBe('Mysuru');
			expect(row?.phone).toBe('+919999988888');
		});

		it('withdraws idempotently and re-joins without a second "joined" e-mail', async () => {
			const { deps, sent } = fakeDeps();
			const store = createInterestStore(db, deps);

			await join(store, BUYER_A, 'a@example.test');
			await join(store, BUYER_B, 'b@example.test');

			const off = await store.withdrawInterest(BUYER_A, PRODUCT);
			expect(off).toEqual({ ok: true, response: { interested: false, interestedCount: 1 } });
			const offAgain = await store.withdrawInterest(BUYER_A, PRODUCT);
			expect(offAgain).toEqual({ ok: true, response: { interested: false, interestedCount: 1 } });
			await expect(store.getMyInterest(BUYER_A, PRODUCT)).resolves.toEqual({
				interested: false,
				since: null,
				ownListing: false
			});

			const back = await join(store, BUYER_A, 'a@example.test');
			expect(back).toEqual({ ok: true, response: { interested: true, interestedCount: 2 } });
			await settle();
			// Within 10 minutes of the last one, re-joining sends nothing.
			expect(sent.filter((mail) => mail.to === 'a@example.test')).toHaveLength(1);
			expect(await interestRow(BUYER_A)).toBeDefined();
		});

		it('refuses the maker of the listing, by uid or maker_id', async () => {
			const { deps } = fakeDeps();
			const store = createInterestStore(db, deps);

			const own = await join(store, MAKER, 'maker@example.test');
			expect(own).toMatchObject({ ok: false, status: 409, body: { error: 'own_listing' } });

			await db
				.update(schema.products)
				.set({ uid: BUYER_C, makerId: MAKER })
				.where(eq(schema.products.id, PRODUCT));
			const byMakerId = await join(store, MAKER, 'maker@example.test');
			expect(byMakerId).toMatchObject({ ok: false, body: { error: 'own_listing' } });
		});

		it('refuses ordinary, launched, closed and unlisted products', async () => {
			const { deps, sent } = fakeDeps();
			const store = createInterestStore(db, deps);

			const ordinary = await store.showInterest({
				userId: BUYER_A,
				productId: ORDINARY,
				address: address(),
				email: 'a@example.test'
			});
			expect(ordinary).toMatchObject({
				ok: false,
				status: 409,
				body: { error: 'interest_closed' }
			});

			for (const status of ['launched', 'closed']) {
				await db
					.update(schema.interestCampaigns)
					.set({ status })
					.where(eq(schema.interestCampaigns.productId, PRODUCT));
				const result = await join(store, BUYER_A, 'a@example.test');
				expect(result).toMatchObject({
					ok: false,
					status: 409,
					body: { error: 'interest_closed' }
				});
			}

			await db
				.update(schema.products)
				.set({ listingState: 'pending_review' })
				.where(eq(schema.products.id, PRODUCT));
			const hidden = await join(store, BUYER_A, 'a@example.test');
			expect(hidden).toMatchObject({
				ok: false,
				status: 404,
				body: { error: 'product_not_found' }
			});

			await settle();
			expect(sent).toHaveLength(0);
		});

		it('a failed "joined" e-mail does not fail the request', async () => {
			const { deps } = fakeDeps({ failFor: new Set(['a@example.test']) });
			const store = createInterestStore(db, deps);
			const result = await join(store, BUYER_A, 'a@example.test');
			await settle();
			expect(result.ok).toBe(true);
		});
	});

	describe('catalog', () => {
		it('carries interest on products and counts only people who have not withdrawn', async () => {
			const { deps } = fakeDeps();
			const store = createInterestStore(db, deps);
			const catalog = createCatalogStore(db);

			await join(store, BUYER_A, 'a@example.test');
			await join(store, BUYER_B, 'b@example.test');
			await join(store, BUYER_C, 'c@example.test');
			await store.withdrawInterest(BUYER_B, PRODUCT);

			const detail = await catalog.getProduct(PRODUCT);
			expect(detail?.product.interest).toEqual({
				status: 'open',
				targetCount: 3,
				interestedCount: 2,
				shipsWithinDays: 21,
				note: 'Glazed by hand.'
			});

			const ordinary = await catalog.getProduct(ORDINARY);
			expect(ordinary?.product.interest).toBeNull();

			const browse = await catalog.getBrowseCatalog({
				filter: 'all',
				sort: 'newest',
				page: 1,
				inStock: false
			});
			const card = browse.products.find((product) => product.id === PRODUCT);
			expect(card?.interest?.interestedCount).toBe(2);
		});

		it('deleting the product removes its campaign and interests', async () => {
			const { deps } = fakeDeps();
			const store = createInterestStore(db, deps);
			await join(store, BUYER_A, 'a@example.test');

			await db.delete(schema.products).where(eq(schema.products.id, PRODUCT));
			expect(await db.select().from(schema.interestCampaigns)).toHaveLength(0);
			expect(await db.select().from(schema.productInterests)).toHaveLength(0);
		});
	});

	describe('maker listing settings', () => {
		const baseListing = {
			makerId: MAKER,
			username: 'clay_maker',
			name: 'Moon Lamp',
			priceNew: 1499,
			stockCount: 0
		};

		it('creates a draft interest check and requires target and shipping time', async () => {
			const makersStore = createMakersStore(db);
			await expect(
				makersStore.upsertListing({ ...baseListing, interest: { enabled: true, target_count: 5 } })
			).rejects.toMatchObject({ code: 'invalid_payload', status: 400 });

			const listing = await makersStore.upsertListing({
				...baseListing,
				name: 'Star Lamp',
				interest: { enabled: true, target_count: 5, ships_within_days: 30, note: ' Soon. ' }
			});
			expect(listing.interest).toMatchObject({
				status: 'open',
				target_count: 5,
				ships_within_days: 30,
				note: 'Soon.',
				interested_count: 0,
				launched_at: null,
				closed_at: null
			});

			const rows = await makersStore.listMakerListings(MAKER);
			expect(rows.find((row) => row.id === listing.id)?.interest?.target_count).toBe(5);
			expect(rows.find((row) => row.id === ORDINARY)?.interest).toBeNull();
		});

		it('locks the commitment once someone has joined, but the note can change', async () => {
			const makersStore = createMakersStore(db);
			const store = createInterestStore(db, fakeDeps().deps);

			// Nobody yet: the target can change (and a live listing goes back to review).
			const changed = await makersStore.upsertListing({
				...baseListing,
				productId: PRODUCT,
				interest: { enabled: true, target_count: 4, ships_within_days: 21 }
			});
			expect(changed.listingState).toBe('pending_review');
			expect(changed.interest?.target_count).toBe(4);
			await db
				.update(schema.products)
				.set({ listingState: 'live' })
				.where(eq(schema.products.id, PRODUCT));

			await join(store, BUYER_A, 'a@example.test');

			const attempt = makersStore.upsertListing({
				...baseListing,
				productId: PRODUCT,
				interest: { enabled: true, target_count: 10, ships_within_days: 21 }
			});
			await expect(attempt).rejects.toBeInstanceOf(InterestRuleError);
			await expect(attempt).rejects.toMatchObject({ code: 'interest_locked', status: 409 });

			await expect(
				makersStore.upsertListing({
					...baseListing,
					productId: PRODUCT,
					interest: { enabled: true, target_count: 4, ships_within_days: 60 }
				})
			).rejects.toMatchObject({ code: 'interest_locked' });

			await expect(
				makersStore.upsertListing({
					...baseListing,
					productId: PRODUCT,
					interest: { enabled: false }
				})
			).rejects.toMatchObject({ code: 'interest_locked' });

			const [campaign] = await db.select().from(schema.interestCampaigns);
			expect(campaign).toMatchObject({ targetCount: 4, shipsWithinDays: 21, status: 'open' });

			// Unchanged settings save fine and do not trigger review.
			const same = await makersStore.upsertListing({
				...baseListing,
				productId: PRODUCT,
				interest: { enabled: true, target_count: 4, ships_within_days: 21 }
			});
			expect(same.listingState).toBe('live');

			const noted = await makersStore.upsertListing({
				...baseListing,
				productId: PRODUCT,
				interest: { enabled: true, target_count: 4, ships_within_days: 21, note: 'New note' }
			});
			expect(noted.interest?.note).toBe('New note');
		});

		it('only a listing that has not gone live can become an interest check', async () => {
			const makersStore = createMakersStore(db);
			await expect(
				makersStore.upsertListing({
					...baseListing,
					name: 'Plain Mug',
					priceNew: 300,
					stockCount: 4,
					productId: ORDINARY,
					interest: { enabled: true, target_count: 5, ships_within_days: 10 }
				})
			).rejects.toMatchObject({ code: 'interest_not_allowed', status: 409 });
		});
	});

	describe('launch and close', () => {
		it('launches once, sets stock, e-mails each person once and is idempotent', async () => {
			const { deps, sent } = fakeDeps();
			const store = createInterestStore(db, deps);
			await join(store, BUYER_A, 'a@example.test');
			await join(store, BUYER_B, 'b@example.test');
			await join(store, BUYER_C, 'c@example.test');
			await store.withdrawInterest(BUYER_C, PRODUCT);
			await settle();
			sent.length = 0;

			const first = await store.launch(MAKER, PRODUCT, {
				stock_count: 8,
				message: 'First batch of eight.'
			});
			expect(first).toEqual({
				ok: true,
				response: { status: 'launched', notified: 0, pending: 2 }
			});
			await store.drainNotifications();
			expect(sent.map((mail) => mail.to).sort()).toEqual(['a@example.test', 'b@example.test']);
			expect(sent[0]?.email.subject).toBe('Moon Lamp is ready to order');
			expect(sent[0]?.email.text).toContain('Price: ₹1,499, plus ₹99 delivery.');
			expect(sent[0]?.email.text).toContain('A note from Clay Studio:');
			expect(sent[0]?.email.text).toContain('First batch of eight.');

			const [product] = await db
				.select()
				.from(schema.products)
				.where(eq(schema.products.id, PRODUCT));
			expect(product?.stock).toEqual({ count: 8, status: 'in-stock' });

			// Maker sold some, then double-clicks launch: no stock reset, nobody e-mailed twice.
			await db
				.update(schema.products)
				.set({ stock: { count: 5, status: 'in-stock' } })
				.where(eq(schema.products.id, PRODUCT));
			const again = await store.launch(MAKER, PRODUCT, { stock_count: 99 });
			expect(again).toEqual({
				ok: true,
				response: { status: 'launched', notified: 2, pending: 0 }
			});
			await store.drainNotifications();
			expect(sent).toHaveLength(2);
			const [after] = await db
				.select()
				.from(schema.products)
				.where(eq(schema.products.id, PRODUCT));
			expect(after?.stock?.count).toBe(5);

			const audits = await db.select().from(schema.auditLog);
			expect(audits).toHaveLength(1);
			expect(audits[0]).toMatchObject({
				entityType: 'product',
				entityId: PRODUCT,
				action: 'interest.launched',
				toState: 'launched'
			});

			const closeAfterLaunch = await store.close(MAKER, PRODUCT, {});
			expect(closeAfterLaunch).toMatchObject({ ok: false, body: { error: 'interest_not_open' } });
		});

		it('concurrent launches e-mail each person once', async () => {
			const { deps, sent } = fakeDeps();
			const store = createInterestStore(db, deps);
			await join(store, BUYER_A, 'a@example.test');
			await join(store, BUYER_B, 'b@example.test');
			await settle();
			sent.length = 0;

			const results = await Promise.all([
				store.launch(MAKER, PRODUCT, { stock_count: 3 }),
				store.launch(MAKER, PRODUCT, { stock_count: 3 })
			]);
			expect(results.every((result) => result.ok)).toBe(true);
			await store.drainNotifications();
			// Two separate stores (two API processes) racing: still one e-mail each.
			const other = createInterestStore(db, deps);
			await other.launch(MAKER, PRODUCT, { stock_count: 3 });
			await other.drainNotifications();
			expect(sent.map((mail) => mail.to).sort()).toEqual(['a@example.test', 'b@example.test']);
			expect(await db.select().from(schema.auditLog)).toHaveLength(1);
		});

		it('a failed send leaves that person pending and a second launch retries only them', async () => {
			const failFor = new Set(['b@example.test']);
			const { deps, sent, deliver } = fakeDeps({ failFor });
			const store = createInterestStore(db, deps);
			await join(store, BUYER_A, 'a@example.test');
			await join(store, BUYER_B, 'b@example.test');
			await settle();
			sent.length = 0;
			deliver.mockClear();

			const first = await store.launch(MAKER, PRODUCT, { stock_count: 3 });
			expect(first).toEqual({
				ok: true,
				response: { status: 'launched', notified: 0, pending: 2 }
			});
			await store.drainNotifications();
			expect((await interestRow(BUYER_A))?.notifiedAt).not.toBeNull();
			expect((await interestRow(BUYER_B))?.notifiedAt).toBeNull();

			failFor.clear();
			deliver.mockClear();
			const retry = await store.launch(MAKER, PRODUCT, { stock_count: 3 });
			expect(retry).toEqual({
				ok: true,
				response: { status: 'launched', notified: 1, pending: 1 }
			});
			await store.drainNotifications();
			expect(deliver).toHaveBeenCalledTimes(1);
			expect(deliver.mock.calls[0]?.[0]).toBe('b@example.test');
		});

		it('launch needs a live listing owned by the maker', async () => {
			const store = createInterestStore(db, fakeDeps().deps);
			const notMine = await store.launch(BUYER_A, PRODUCT, { stock_count: 1 });
			expect(notMine).toMatchObject({
				ok: false,
				status: 404,
				body: { error: 'listing_not_found' }
			});

			const ordinary = await store.launch(MAKER, ORDINARY, { stock_count: 1 });
			expect(ordinary).toMatchObject({ ok: false, body: { error: 'not_an_interest_listing' } });

			await db
				.update(schema.products)
				.set({ listingState: 'pending_review' })
				.where(eq(schema.products.id, PRODUCT));
			const pending = await store.launch(MAKER, PRODUCT, { stock_count: 1 });
			expect(pending).toMatchObject({
				ok: false,
				status: 409,
				body: { error: 'listing_not_live' }
			});
		});

		it('closes, e-mails everyone, refuses new interest and stays unbuyable', async () => {
			const { deps, sent } = fakeDeps();
			const store = createInterestStore(db, deps);
			await join(store, BUYER_A, 'a@example.test');
			await settle();
			sent.length = 0;

			const closed = await store.close(MAKER, PRODUCT, { message: 'The glaze failed.' });
			expect(closed).toEqual({ ok: true, response: { status: 'closed', notified: 0, pending: 1 } });
			await store.drainNotifications();
			expect(sent[0]?.email.subject).toBe("Moon Lamp won't be produced");
			expect(sent[0]?.email.text).toContain('Clay Studio has decided not to produce Moon Lamp.');
			expect(sent[0]?.email.text).toContain('The glaze failed.');

			const again = await store.close(MAKER, PRODUCT, {});
			expect(again).toEqual({ ok: true, response: { status: 'closed', notified: 1, pending: 0 } });

			const rejoin = await join(store, BUYER_B, 'b@example.test');
			expect(rejoin).toMatchObject({ ok: false, body: { error: 'interest_closed' } });

			const launch = await store.launch(MAKER, PRODUCT, { stock_count: 2 });
			expect(launch).toMatchObject({ ok: false, body: { error: 'interest_not_open' } });

			const catalog = createCatalogStore(db);
			const detail = await catalog.getProduct(PRODUCT);
			expect(detail?.product.interest?.status).toBe('closed');

			const audits = await db.select().from(schema.auditLog);
			expect(audits.map((audit) => audit.action)).toEqual(['interest.closed']);
		});
	});

	describe('maker summary and staff views', () => {
		it('gives the maker counts by state and city with no personal data', async () => {
			const store = createInterestStore(db, fakeDeps().deps);
			await join(store, BUYER_A, 'a@example.test');
			await join(
				store,
				BUYER_B,
				'b@example.test',
				address({ name: 'Ravi K', city: 'Mysuru', phone: '+919811112222' })
			);
			await join(
				store,
				BUYER_C,
				'c@example.test',
				address({ name: 'Meera P', city: 'Pune', state: 'Maharashtra', phone: '+919833334444' })
			);
			await store.withdrawInterest(BUYER_C, PRODUCT);

			const summary = await store.getMakerSummary(MAKER, PRODUCT);
			expect(summary).toEqual({
				ok: true,
				response: {
					status: 'open',
					targetCount: 3,
					shipsWithinDays: 21,
					interestedCount: 2,
					notifiedCount: 0,
					pendingCount: 0,
					// Fewer than three people anywhere: all merged into "other".
					byState: [{ state: '', count: 2 }],
					byCity: [{ city: '', state: '', count: 2 }]
				}
			});

			const serialized = JSON.stringify(summary);
			for (const secret of [
				'Asha',
				'Ravi',
				'a@example.test',
				'+9198',
				'9876543210',
				'Lake Road',
				'560001',
				BUYER_A
			]) {
				expect(serialized).not.toContain(secret);
			}

			const listings = await createMakersStore(db).listMakerListings(MAKER);
			const listingJson = JSON.stringify(listings);
			expect(listingJson).not.toContain('a@example.test');
			expect(listingJson).not.toContain('9876543210');

			const notMine = await store.getMakerSummary(BUYER_A, PRODUCT);
			expect(notMine).toMatchObject({ ok: false, status: 404 });
		});

		it('gives staff the full list; people who left are gone', async () => {
			const store = createInterestStore(db, fakeDeps().deps);
			await join(store, BUYER_A, 'a@example.test');
			await join(store, BUYER_B, 'b@example.test');
			await store.withdrawInterest(BUYER_B, PRODUCT);

			const campaigns = await store.adminListCampaigns();
			expect(campaigns.campaigns).toEqual([
				{
					productId: PRODUCT,
					productName: 'Moon Lamp',
					makerName: 'Clay Studio',
					interest: expect.objectContaining({ status: 'open', interestedCount: 1, targetCount: 3 })
				}
			]);

			const list = await store.adminGetCampaign(PRODUCT);
			expect(list?.entries).toHaveLength(1);
			expect(list?.entries[0]).toMatchObject({
				userId: BUYER_A,
				name: 'Asha Rao',
				email: 'a@example.test',
				phone: '+919876543210',
				address: expect.objectContaining({ line1: '12 Lake Road' }),
				withdrawnAt: null,
				notifiedAt: null
			});
			expect(await store.adminGetCampaign(ORDINARY)).toBeNull();
		});
	});

	describe('privacy and abuse review fixes', () => {
		const baseListing = {
			makerId: MAKER,
			username: 'clay_maker',
			name: 'Moon Lamp',
			priceNew: 1499,
			stockCount: 0
		};

		it('1. the commitment stays locked after everyone has left', async () => {
			const makersStore = createMakersStore(db);
			const store = createInterestStore(db, fakeDeps().deps);
			await join(store, BUYER_A, 'a@example.test');
			await store.withdrawInterest(BUYER_A, PRODUCT);
			expect(await db.select().from(schema.productInterests)).toHaveLength(0);

			await expect(
				makersStore.upsertListing({
					...baseListing,
					productId: PRODUCT,
					interest: { enabled: true, target_count: 1, ships_within_days: 21 }
				})
			).rejects.toMatchObject({ code: 'interest_locked' });
			await expect(
				makersStore.upsertListing({
					...baseListing,
					productId: PRODUCT,
					interest: { enabled: false }
				})
			).rejects.toMatchObject({ code: 'interest_locked' });

			const rows = await makersStore.listMakerListings(MAKER);
			expect(rows.find((row) => row.id === PRODUCT)?.interest).toMatchObject({
				locked: true,
				interested_count: 0,
				pending_count: 0
			});
		});

		it('2. a listing that was ever approved, ordered or carted cannot become one', async () => {
			const makersStore = createMakersStore(db);
			const enable = { enabled: true, target_count: 5, ships_within_days: 10 };
			const draft = async (name: string) =>
				makersStore.upsertListing({ ...baseListing, name, stockCount: 1 });

			const approvedOnce = await draft('Approved Once');
			await db.insert(schema.listingReviews).values({
				productId: approvedOnce.id,
				makerId: MAKER,
				fromState: 'pending_review',
				toState: 'live'
			});
			await db
				.update(schema.products)
				.set({ listingState: 'rejected' })
				.where(eq(schema.products.id, approvedOnce.id));

			const ordered = await draft('Ordered Once');
			await client.query(`INSERT INTO order_items (order_id, product_id) VALUES ($1, $2)`, [
				BUYER_C,
				ordered.id
			]);
			const carted = await draft('Carted Once');
			await client.query(`INSERT INTO cart_items (cart_id, product_id) VALUES ($1, $2)`, [
				BUYER_C,
				carted.id
			]);

			for (const listing of [approvedOnce, ordered, carted]) {
				await expect(
					makersStore.upsertListing({
						...baseListing,
						name: listing.name ?? '',
						productId: listing.id,
						interest: enable
					})
				).rejects.toMatchObject({
					code: 'interest_not_allowed',
					status: 409,
					message:
						"This listing has already been on sale, so it can't become an interest check. Create a new listing for it."
				});
			}

			const fresh = await draft('Fresh Draft');
			const converted = await makersStore.upsertListing({
				...baseListing,
				name: 'Fresh Draft',
				productId: fresh.id,
				interest: enable
			});
			expect(converted.interest?.status).toBe('open');
		});

		it('3. leaving deletes the row; re-joining creates a fresh one', async () => {
			const store = createInterestStore(db, fakeDeps().deps);
			await join(store, BUYER_A, 'a@example.test');
			const before = await interestRow(BUYER_A);
			await store.withdrawInterest(BUYER_A, PRODUCT);
			expect(await interestRow(BUYER_A)).toBeUndefined();

			await join(store, BUYER_A, 'a@example.test');
			const after = await interestRow(BUYER_A);
			expect(after?.id).not.toBe(before?.id);
			expect(after?.phone).toBe('+919876543210');
		});

		it('3. a launch blanks phone and address only for people actually e-mailed', async () => {
			const { deps } = fakeDeps({ failFor: new Set(['b@example.test']) });
			const store = createInterestStore(db, deps);
			await join(store, BUYER_A, 'a@example.test');
			await join(store, BUYER_B, 'b@example.test');
			await settle();
			await store.launch(MAKER, PRODUCT, { stock_count: 2 });
			await store.drainNotifications();

			expect(await interestRow(BUYER_A)).toMatchObject({
				name: 'Asha Rao',
				email: 'a@example.test',
				phone: '',
				address: {},
				notifiedAt: expect.any(String)
			});
			expect(await interestRow(BUYER_B)).toMatchObject({
				phone: '+919876543210',
				address: expect.objectContaining({ line1: '12 Lake Road' }),
				notifiedAt: null
			});

			// The count of people it launched after, and the staff list, still work.
			const catalog = createCatalogStore(db);
			expect((await catalog.getProduct(PRODUCT))?.product.interest?.interestedCount).toBe(2);
			const list = await store.adminGetCampaign(PRODUCT);
			expect(list?.entries.find((entry) => entry.userId === BUYER_A)).toMatchObject({
				phone: '',
				address: {},
				withdrawnAt: null
			});
		});

		it('3. a closure deletes the rows of people e-mailed, and keeps the failed ones', async () => {
			const { deps } = fakeDeps({ failFor: new Set(['b@example.test']) });
			const store = createInterestStore(db, deps);
			await join(store, BUYER_A, 'a@example.test');
			await join(store, BUYER_B, 'b@example.test');
			await settle();
			await store.close(MAKER, PRODUCT, {});
			await store.drainNotifications();

			expect(await interestRow(BUYER_A)).toBeUndefined();
			expect(await interestRow(BUYER_B)).toBeDefined();
			const summary = await store.getMakerSummary(MAKER, PRODUCT);
			expect(summary).toMatchObject({
				ok: true,
				response: { status: 'closed', notifiedCount: 1, pendingCount: 1 }
			});
		});

		it('4. leaving works on a launched, closed or non-public listing', async () => {
			const store = createInterestStore(db, fakeDeps().deps);
			const setStatus = (status: string) =>
				db
					.update(schema.interestCampaigns)
					.set({ status })
					.where(eq(schema.interestCampaigns.productId, PRODUCT));

			for (const step of ['launched', 'closed', 'paused', 'archived']) {
				await setStatus('open');
				await db
					.update(schema.products)
					.set({ listingState: 'live' })
					.where(eq(schema.products.id, PRODUCT));
				await join(store, BUYER_A, 'a@example.test');
				if (step === 'launched' || step === 'closed') await setStatus(step);
				else {
					await db
						.update(schema.products)
						.set({ listingState: step })
						.where(eq(schema.products.id, PRODUCT));
				}
				const off = await store.withdrawInterest(BUYER_A, PRODUCT);
				expect(off).toEqual({ ok: true, response: { interested: false, interestedCount: 0 } });
				expect(await interestRow(BUYER_A)).toBeUndefined();
			}
		});

		it('4. /me/interests lists every interest, with a null path when not public', async () => {
			const store = createInterestStore(db, fakeDeps().deps);
			await join(store, BUYER_A, 'a@example.test');
			expect(await store.listMyInterests(BUYER_A)).toEqual({
				interests: [
					{
						productId: PRODUCT,
						productName: 'Moon Lamp',
						productPath: '/Moon_Lamp/craft/item=' + PRODUCT,
						status: 'open',
						targetCount: 3,
						interestedCount: 1,
						since: expect.any(String)
					}
				]
			});

			await db
				.update(schema.products)
				.set({ listingState: 'paused' })
				.where(eq(schema.products.id, PRODUCT));
			const hidden = await store.listMyInterests(BUYER_A);
			expect(hidden.interests[0]?.productPath).toBeNull();
			expect(await store.listMyInterests(BUYER_B)).toEqual({ interests: [] });
		});

		it('4. ownListing is true for the maker by maker_id or uid', async () => {
			const store = createInterestStore(db, fakeDeps().deps);
			await db
				.update(schema.products)
				.set({ uid: BUYER_C, makerId: MAKER })
				.where(eq(schema.products.id, PRODUCT));
			expect((await store.getMyInterest(MAKER, PRODUCT)).ownListing).toBe(true);
			expect((await store.getMyInterest(BUYER_C, PRODUCT)).ownListing).toBe(true);
			expect((await store.getMyInterest(BUYER_A, PRODUCT)).ownListing).toBe(false);
		});

		it('5. no "joined" e-mail after an immediate leave, none twice in 10 minutes', async () => {
			const { deps, sent } = fakeDeps({ joinedEmailDelayMs: 30 });
			const store = createInterestStore(db, deps);

			await join(store, BUYER_A, 'a@example.test');
			await store.withdrawInterest(BUYER_A, PRODUCT);
			await new Promise((resolve) => setTimeout(resolve, 80));
			expect(sent).toHaveLength(0);

			await join(store, BUYER_B, 'b@example.test');
			await new Promise((resolve) => setTimeout(resolve, 80));
			await store.withdrawInterest(BUYER_B, PRODUCT);
			await join(store, BUYER_B, 'b@example.test');
			await new Promise((resolve) => setTimeout(resolve, 80));
			expect(sent.map((mail) => mail.to)).toEqual(['b@example.test']);
			expect(sent[0]?.email.text).toContain(
				'Changed your mind? Take yourself off the list any time from your account.'
			);
			expect(sent[0]?.email.text).toContain(
				'Your interest checks: https://selfcrafted.test/user/profile/interest'
			);
			expect(sent[0]?.email.html).toContain(
				'href="https://selfcrafted.test/user/profile/interest"'
			);

			// After 10 minutes, a fresh join is e-mailed again.
			await db
				.update(schema.interestJoinNotices)
				.set({ sentAt: '2026-01-01T00:00:00Z' })
				.where(eq(schema.interestJoinNotices.userId, BUYER_B));
			await store.withdrawInterest(BUYER_B, PRODUCT);
			await join(store, BUYER_B, 'b@example.test');
			await new Promise((resolve) => setTimeout(resolve, 80));
			expect(sent).toHaveLength(2);
		});

		it('6. launch returns before e-mails are sent; a later call resumes pending people', async () => {
			let open!: () => void;
			const gate = new Promise<void>((resolve) => (open = resolve));
			const failFor = new Set(['b@example.test']);
			const { deps, sent } = fakeDeps({ gate, failFor });
			const store = createInterestStore(db, deps);
			await join(store, BUYER_A, 'a@example.test');
			await join(store, BUYER_B, 'b@example.test');

			const first = await store.launch(MAKER, PRODUCT, { stock_count: 2 });
			expect(first).toEqual({
				ok: true,
				response: { status: 'launched', notified: 0, pending: 2 }
			});
			expect(sent.filter((mail) => mail.email.subject.includes('ready to order'))).toHaveLength(0);

			open();
			await store.drainNotifications();
			expect(sent.filter((mail) => mail.email.subject.includes('ready to order'))).toHaveLength(1);
			const summary = await store.getMakerSummary(MAKER, PRODUCT);
			expect(summary).toMatchObject({ response: { notifiedCount: 1, pendingCount: 1 } });
			expect(
				(await createMakersStore(db).listMakerListings(MAKER)).find((row) => row.id === PRODUCT)
					?.interest
			).toMatchObject({ pending_count: 1, locked: true });

			failFor.clear();
			const resumed = await store.launch(MAKER, PRODUCT, { stock_count: 2 });
			expect(resumed).toEqual({
				ok: true,
				response: { status: 'launched', notified: 1, pending: 1 }
			});
			await store.drainNotifications();
			expect(
				sent.filter((mail) => mail.email.subject.includes('ready to order')).map((m) => m.to)
			).toEqual(['a@example.test', 'b@example.test']);
		});

		it('7. a join that waits behind a state change sees the new state and is refused', async () => {
			const store = createInterestStore(db, fakeDeps().deps);
			let joining: Promise<unknown> | undefined;
			await db.transaction(async (tx) => {
				await tx
					.select()
					.from(schema.products)
					.where(eq(schema.products.id, PRODUCT))
					.for('update');
				joining = join(store, BUYER_A, 'a@example.test');
				await tx
					.update(schema.products)
					.set({ listingState: 'paused' })
					.where(eq(schema.products.id, PRODUCT));
			});
			await expect(joining).resolves.toMatchObject({
				ok: false,
				body: { error: 'product_not_found' }
			});
			expect(await db.select().from(schema.productInterests)).toHaveLength(0);
		});

		it('8. small places are merged so no small count can be recovered', () => {
			const place = (city: string, state: string, count: number) => ({ city, state, count });
			// Karnataka 4 = Bengaluru 3 + Mysuru 1: listing Bengaluru would reveal "1 elsewhere in
			// Karnataka", so Bengaluru is folded into "other" as well. Goa (2) is merged.
			expect(
				groupSmallPlaces([
					place('Bengaluru', 'Karnataka', 3),
					place('Mysuru', 'Karnataka', 1),
					place('Pune', 'Maharashtra', 5),
					place('Mumbai', 'Maharashtra', 3),
					place('Panaji', 'Goa', 2)
				])
			).toEqual({
				total: 14,
				byState: [
					{ state: 'Maharashtra', count: 8 },
					{ state: 'Karnataka', count: 4 },
					{ state: '', count: 2 }
				],
				byCity: [
					{ city: 'Pune', state: 'Maharashtra', count: 5 },
					{ city: 'Mumbai', state: 'Maharashtra', count: 3 },
					{ city: '', state: '', count: 6 }
				]
			});

			// A remainder of 3 or more inside a state is fine to show.
			expect(
				groupSmallPlaces([
					place('Bengaluru', 'Karnataka', 4),
					place('Mysuru', 'Karnataka', 2),
					place('Hubli', 'Karnataka', 1)
				]).byCity
			).toEqual([
				{ city: 'Bengaluru', state: 'Karnataka', count: 4 },
				{ city: '', state: '', count: 3 }
			]);
		});
	});
});
