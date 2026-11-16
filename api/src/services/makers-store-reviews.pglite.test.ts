import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Database } from '../db/index.js';
import * as schema from '../db/schema/index.js';
import { applyInterestMigration } from '../test/interest-tables.js';
import { createMakersStore } from './makers-store.js';

const APPLICANT = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
const REVIEWER = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
const MAKER = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

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
CREATE TABLE "maker_capabilities" (
	"maker_id" uuid NOT NULL,
	"capability_key" text NOT NULL,
	"state" text NOT NULL DEFAULT 'requested',
	"config" jsonb,
	"granted_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL DEFAULT now(),
	"updated_at" timestamp with time zone NOT NULL DEFAULT now(),
	PRIMARY KEY ("maker_id", "capability_key")
);
CREATE TABLE "maker_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"version" integer NOT NULL DEFAULT 1,
	"answers" jsonb NOT NULL DEFAULT '{}',
	"requested_capabilities" text[] NOT NULL DEFAULT '{}',
	"status" text NOT NULL DEFAULT 'pending',
	"reviewer_id" uuid,
	"review_notes" text,
	"reviewed_at" timestamp with time zone,
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
`;

describe('makers store review feedback', () => {
	let client: PGlite;
	let db: Database;

	beforeEach(async () => {
		client = new PGlite();
		await client.exec(STUB_SQL);
		await applyInterestMigration(client);
		db = drizzle(client, { schema }) as unknown as Database;
		await db.insert(schema.users).values([
			{ id: APPLICANT, username: 'applicant', createdAt: new Date().toISOString() },
			{ id: REVIEWER, username: 'staff', createdAt: new Date().toISOString() },
			{ id: MAKER, username: 'maker', createdAt: new Date().toISOString() }
		]);
		await db.insert(schema.makers).values({
			id: MAKER,
			displayName: 'Maker',
			approvedState: 'approved'
		});
		await db.insert(schema.makerCapabilities).values({
			makerId: MAKER,
			capabilityKey: 'physical_goods',
			state: 'approved'
		});
	});

	afterEach(async () => {
		await client.close();
	});

	it('returns the latest application with the rejection reason and stores work links', async () => {
		const store = createMakersStore(db);
		const application = await store.submitApplication({
			userId: APPLICANT,
			displayName: 'Applicant Shop',
			links: 'https://example.com/work',
			capabilities: ['physical_goods']
		});
		expect(application.answers).toMatchObject({ links: 'https://example.com/work' });

		const pending = await store.getLatestApplication(APPLICANT);
		expect(pending).toMatchObject({ status: 'pending', review_notes: null });
		expect(pending?.created_at).toBeTruthy();

		await store.reviewApplication({
			applicationId: application.id,
			reviewerId: REVIEWER,
			decision: 'rejected',
			notes: 'Please add photos of your work.'
		});

		const rejected = await store.getLatestApplication(APPLICANT);
		expect(rejected).toMatchObject({
			status: 'rejected',
			review_notes: 'Please add photos of your work.'
		});
		expect(await store.getLatestApplication(REVIEWER)).toBeNull();
	});

	it('returns the latest staff rejection note on rejected listings only', async () => {
		const store = createMakersStore(db);
		const listing = await store.upsertListing({
			makerId: MAKER,
			username: 'maker',
			name: 'Desk lamp kit',
			priceNew: 1200,
			stockCount: 3,
			description: 'A lamp.',
			submitForReview: true
		});
		const other = await store.upsertListing({
			makerId: MAKER,
			username: 'maker',
			name: 'Spare gear',
			priceNew: 90,
			stockCount: 3,
			submitForReview: true
		});

		await store.setListingState(listing.id, 'rejected', REVIEWER, 'Photos are too dark.');
		await store.setListingState(other.id, 'live', REVIEWER, 'Looks good.');

		const listings = await store.listMakerListings(MAKER);
		expect(listings.find((row) => row.id === listing.id)).toMatchObject({
			listing_state: 'rejected',
			review_notes: 'Photos are too dark.'
		});
		expect(listings.find((row) => row.id === other.id)).toMatchObject({
			listing_state: 'live',
			review_notes: null
		});
	});

	it('includes description and type in the staff review queue', async () => {
		const store = createMakersStore(db);
		await store.upsertListing({
			makerId: MAKER,
			username: 'maker',
			name: 'Desk lamp kit',
			priceNew: 1200,
			stockCount: 3,
			type: 'spare',
			description: 'A lamp.',
			submitForReview: true
		});

		const [pending] = await store.listPendingListings();
		expect(pending).toMatchObject({ type: 'spare', description: 'A lamp.' });
	});
});
