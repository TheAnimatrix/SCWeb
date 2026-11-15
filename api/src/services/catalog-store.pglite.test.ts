import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { beforeAll, describe, expect, it } from 'vitest';
import type { Database } from '../db/index.js';
import * as schema from '../db/schema/index.js';
import { productHref, productSlug, ratingFromReviewStats } from './catalog-mappers.js';
import { createCatalogStore, type CatalogStore } from './catalog-store.js';

const LIVE_MAKER = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const DRAFT_MAKER = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const REVIEWER_ONE = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const REVIEWER_TWO = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

const PRODUCT_REVIEWED = '11111111-1111-4111-8111-111111111111';
const PRODUCT_UNREVIEWED = '22222222-2222-4222-8222-222222222222';
const PRODUCT_DRAFT = '33333333-3333-4333-8333-333333333333';
const PRODUCT_SLASH = '44444444-4444-4444-8444-444444444444';
const PRODUCT_OTHER_MAKER = '55555555-5555-4555-8555-555555555555';

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
CREATE TABLE "constants" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
	"key" text,
	"value" jsonb,
	"created_at" timestamp with time zone NOT NULL DEFAULT now()
);
`;

function product(
	id: string,
	name: string,
	uid: string,
	listingState: string,
	createdAt: string,
	extra: Partial<typeof schema.products.$inferInsert> = {}
): typeof schema.products.$inferInsert {
	return {
		id,
		name,
		uid,
		makerId: uid,
		type: 'product',
		listingState,
		price: { new: 500, old: 0 },
		stock: { count: 3, status: 'in_stock' },
		images: [],
		tags: [],
		guarantee: '',
		rel: '',
		createdAt,
		...extra
	};
}

describe('catalog store', () => {
	let store: CatalogStore;

	beforeAll(async () => {
		const client = new PGlite();
		await client.exec(STUB_SQL);
		const db = drizzle(client, { schema }) as unknown as Database;

		await db.insert(schema.users).values([
			{ id: LIVE_MAKER, username: 'live_maker', tier: 'Bee', createdAt: '2024-01-01T00:00:00Z' },
			{ id: DRAFT_MAKER, username: 'draft_maker', tier: 'Bee', createdAt: '2024-01-01T00:00:00Z' },
			{ id: REVIEWER_ONE, username: 'buyer_one', createdAt: '2024-01-01T00:00:00Z' },
			{ id: REVIEWER_TWO, username: 'buyer_two', createdAt: '2024-01-01T00:00:00Z' }
		]);

		await db.insert(schema.makers).values([
			{
				id: LIVE_MAKER,
				approvedState: 'approved',
				storefrontState: 'live',
				location: 'Pune',
				approvedAt: new Date('2025-02-01T00:00:00Z'),
				publishedAt: new Date('2025-03-01T00:00:00Z')
			},
			{
				id: DRAFT_MAKER,
				approvedState: 'approved',
				storefrontState: 'draft',
				location: null,
				approvedAt: new Date('2025-04-01T00:00:00Z')
			}
		]);

		await db.insert(schema.products).values([
			product(PRODUCT_REVIEWED, 'Reviewed kit', LIVE_MAKER, 'live', '2026-01-04T00:00:00Z', {
				// Stale legacy value: must be ignored in favour of the reviews table.
				rating: { rating: 5, count: 9 }
			}),
			product(PRODUCT_UNREVIEWED, 'Unreviewed kit', LIVE_MAKER, 'live', '2026-01-03T00:00:00Z', {
				rating: { rating: 4.5, count: 0 }
			}),
			product(PRODUCT_DRAFT, 'Draft kit', LIVE_MAKER, 'draft', '2026-01-05T00:00:00Z'),
			product(PRODUCT_SLASH, 'M3/M4 kit #2', LIVE_MAKER, 'live', '2026-01-02T00:00:00Z', {
				rel: PRODUCT_REVIEWED,
				type: 'spare'
			}),
			product(PRODUCT_OTHER_MAKER, 'Other kit', DRAFT_MAKER, 'live', '2026-01-01T00:00:00Z')
		]);

		await db.insert(schema.reviews).values([
			{ userId: REVIEWER_ONE, productId: PRODUCT_REVIEWED, rating: 4 },
			{ userId: REVIEWER_TWO, productId: PRODUCT_REVIEWED, rating: 5 },
			// Review on a draft product must not leak anywhere.
			{ userId: REVIEWER_ONE, productId: PRODUCT_DRAFT, rating: 1 }
		]);

		store = createCatalogStore(db);
	});

	it('computes the rating from the reviews table and hides it when there are none', async () => {
		const reviewed = await store.getProduct(PRODUCT_REVIEWED);
		expect(reviewed?.product.rating).toEqual({ rating: 4.5, count: 2 });

		const unreviewed = await store.getProduct(PRODUCT_UNREVIEWED);
		expect(unreviewed?.product.rating).toBeUndefined();

		const reviews = await store.getProductReviews(PRODUCT_REVIEWED);
		expect(reviews.reviews).toHaveLength(reviewed?.product.rating?.count ?? -1);
	});

	it('uses the same rating on browse cards', async () => {
		const browse = await store.getBrowseCatalog({
			filter: 'all',
			sort: 'newest',
			page: 1,
			inStock: false
		});
		const byId = new Map(browse.products.map((item) => [item.id, item]));
		expect(byId.get(PRODUCT_REVIEWED)?.rating).toEqual({ rating: 4.5, count: 2 });
		expect(byId.get(PRODUCT_UNREVIEWED)?.rating).toBeUndefined();
		expect(byId.has(PRODUCT_DRAFT)).toBe(false);
	});

	it('counts only live listings on the home page and flags the newest fallback', async () => {
		const home = await store.getHomeCatalog();
		expect(home.stats.listings).toBe(4);
		expect(home.featuredIsCurated).toBe(false);
		expect(home.featuredProducts.map((item) => item.id)).toEqual([
			PRODUCT_REVIEWED,
			PRODUCT_UNREVIEWED,
			PRODUCT_OTHER_MAKER
		]);
		expect(home.recentProducts.find((item) => item.id === PRODUCT_REVIEWED)?.rating).toEqual({
			rating: 4.5,
			count: 2
		});
	});

	it('returns maker facts and live-only craft count with the product', async () => {
		const detail = await store.getProduct(PRODUCT_REVIEWED);
		expect(detail?.makerCraftCount).toBe(3);
		expect(detail?.maker).toEqual({
			location: 'Pune',
			sellingSince: '2025-03-01T00:00:00.000Z',
			storefrontLive: true
		});

		const other = await store.getProduct(PRODUCT_OTHER_MAKER);
		expect(other?.maker).toEqual({
			location: null,
			sellingSince: '2025-04-01T00:00:00.000Z',
			storefrontLive: false
		});
	});

	it('builds variant hrefs that survive slashes and hashes in names', async () => {
		const variants = await store.getProductVariants(PRODUCT_REVIEWED);
		const slash = variants?.variants.find((variant) => variant.id === PRODUCT_SLASH);
		expect(slash?.href).toBe(`/M3-M4_kit_-2/craft/item=${PRODUCT_SLASH}`);
	});
});

describe('catalog mappers', () => {
	it('slugs names without adding path segments', () => {
		expect(productSlug('  24V/40W heater? 100%  ')).toBe('24V-40W_heater-_100-');
		expect(productHref('Plain name', 'abc')).toBe('/Plain_name/craft/item=abc');
	});

	it('maps review stats to a rating', () => {
		expect(ratingFromReviewStats(null)).toBeUndefined();
		expect(ratingFromReviewStats({ average: null, count: 0 })).toBeUndefined();
		expect(ratingFromReviewStats({ average: '4.6666666', count: '3' })).toEqual({
			rating: 4.7,
			count: 3
		});
	});
});
