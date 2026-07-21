import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Database } from '../db/index.js';
import * as schema from '../db/schema/index.js';
import { createMakersStore } from './makers-store.js';

const MAKER_WITH_FILAMENT = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const MAKER_WITHOUT_FILAMENT = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

const MAKERS_STUB_SQL = `
CREATE TABLE IF NOT EXISTS "makers" (
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
`;

const MAKER_CAPABILITIES_STUB_SQL = `
CREATE TABLE IF NOT EXISTS "maker_capabilities" (
	"maker_id" uuid NOT NULL,
	"capability_key" text NOT NULL,
	"state" text NOT NULL DEFAULT 'requested',
	"config" jsonb,
	"granted_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL DEFAULT now(),
	"updated_at" timestamp with time zone NOT NULL DEFAULT now(),
	PRIMARY KEY ("maker_id", "capability_key")
);
`;

const PRINTING_CRAFTERS_STUB_SQL = `
CREATE TABLE IF NOT EXISTS "PrintingCrafters" (
	"maker_id" uuid PRIMARY KEY NOT NULL,
	"approved_state" text,
	"name" text,
	"contact_number" text,
	"email" text,
	"max_printer_size" text,
	"number_of_printers" integer,
	"filament_types" text[],
	"filament_data" jsonb,
	"created_at" timestamp with time zone,
	"price_rank" smallint,
	"delivery_rank" smallint,
	"payment_details" text
);
`;

const USER_FILAMENT_STUB_SQL = `
CREATE TABLE IF NOT EXISTS "UserFilament" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand" text,
	"material_type" text NOT NULL,
	"density" real,
	"cost_approx" real,
	"product_link" text,
	"max_flow_rate" real,
	"owner_id" uuid NOT NULL,
	"created_at" timestamp with time zone,
	"name" text,
	"quantity_kg" real,
	"color" text
);
`;

const USERS_STUB_SQL = `
CREATE TABLE IF NOT EXISTS "users" (
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
`;

const CREATOR_STATS_STUB_SQL = `
CREATE TABLE IF NOT EXISTS "CreatorStats" (
	"maker_id" uuid PRIMARY KEY NOT NULL,
	"avg_quote_time" text,
	"avg_rating" double precision,
	"completed_orders" integer,
	"materials_used" jsonb
);
`;

const CREATOR_REVIEWS_STUB_SQL = `
CREATE TABLE IF NOT EXISTS "CreatorReviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"maker_id" uuid NOT NULL,
	"print_request_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"rating" double precision NOT NULL,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
`;

type TestDb = {
	client: PGlite;
	db: Database;
};

async function createTestDb(): Promise<TestDb> {
	const client = new PGlite();
	await client.exec(`
		${MAKERS_STUB_SQL}
		${MAKER_CAPABILITIES_STUB_SQL}
		${PRINTING_CRAFTERS_STUB_SQL}
		${USER_FILAMENT_STUB_SQL}
		${USERS_STUB_SQL}
		${CREATOR_STATS_STUB_SQL}
		${CREATOR_REVIEWS_STUB_SQL}
	`);

	const db = drizzle(client, { schema }) as unknown as Database;
	return { client, db };
}

describe('makers store', () => {
	let testDb: TestDb;

	beforeEach(async () => {
		testDb = await createTestDb();
		const { db } = testDb;

		await db.insert(schema.users).values([
			{
				id: MAKER_WITH_FILAMENT,
				username: 'maker_one',
				tier: 'Bee',
				email: 'maker@example.com',
				createdAt: new Date().toISOString()
			},
			{
				id: MAKER_WITHOUT_FILAMENT,
				username: 'maker_two',
				tier: 'Osprey',
				email: 'maker2@example.com',
				createdAt: new Date().toISOString()
			}
		]);

		await db.insert(schema.makers).values([
			{
				id: MAKER_WITH_FILAMENT,
				displayName: 'Maker One',
				approvedState: 'approved',
				createdAt: new Date(),
				updatedAt: new Date()
			},
			{
				id: MAKER_WITHOUT_FILAMENT,
				displayName: 'Maker Two',
				approvedState: 'approved',
				createdAt: new Date(),
				updatedAt: new Date()
			},
			{
				id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
				displayName: 'Pending Maker',
				approvedState: 'pending',
				createdAt: new Date(),
				updatedAt: new Date()
			}
		]);

		await db.insert(schema.printingCrafters).values([
			{
				makerId: MAKER_WITH_FILAMENT,
				approvedState: 'approved',
				name: 'Maker One',
				priceRank: 3,
				deliveryRank: 4,
				numberOfPrinters: 2,
				maxPrinterSize: '256mm'
			},
			{
				makerId: MAKER_WITHOUT_FILAMENT,
				approvedState: 'approved',
				name: 'Maker Two',
				priceRank: 2,
				deliveryRank: 2
			},
			{
				makerId: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
				approvedState: 'pending',
				name: 'Pending Maker'
			}
		]);

		await db.insert(schema.makerCapabilities).values([
			{
				makerId: MAKER_WITH_FILAMENT,
				capabilityKey: 'printing_3d',
				state: 'approved',
				grantedAt: new Date()
			},
			{
				makerId: MAKER_WITHOUT_FILAMENT,
				capabilityKey: 'printing_3d',
				state: 'approved',
				grantedAt: new Date()
			}
		]);

		await db.insert(schema.userFilament).values({
			ownerId: MAKER_WITH_FILAMENT,
			materialType: 'PLA',
			color: '#ffffff',
			quantityKg: 1
		});

		await db.insert(schema.creatorStats).values({
			makerId: MAKER_WITH_FILAMENT,
			completedOrders: 5,
			avgRating: 4.5,
			avgQuoteTime: '3600'
		});
	});

	afterEach(async () => {
		await testDb.client.close();
	});

	it('returns approved makers with stocked filaments and stats in one transaction', async () => {
		const store = createMakersStore(testDb.db);
		const makers = await store.listAvailableMakers();

		expect(makers).toHaveLength(2);
		expect(makers.find((maker) => maker.maker_id === MAKER_WITH_FILAMENT)).toMatchObject({
			crafter_name: 'Maker One',
			completed_orders: 5,
			avg_rating: 4.5,
			tier: 'Bee',
			filaments: [{ color: '#ffffff', material_type: 'PLA' }],
			reviews: []
		});
		expect(makers.find((maker) => maker.maker_id === MAKER_WITHOUT_FILAMENT)?.filaments).toEqual(
			[]
		);
		expect(makers.some((maker) => maker.crafter_name === 'Pending Maker')).toBe(false);
	});
});
