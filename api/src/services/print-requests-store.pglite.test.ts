import { PGlite } from '@electric-sql/pglite';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Database } from '../db/index.js';
import * as schema from '../db/schema/index.js';
import { chat } from '../db/schema/chat.js';
import { creatorStats } from '../db/schema/creatorStats.js';
import { printrequests } from '../db/schema/printrequests.js';
import { auditLog } from '../db/schema/auditLog.js';
import { getLatestQuote } from './print-payments.js';
import { createChatsStore } from './chats-store.js';
import { createPrintRequestsStore } from './print-requests-store.js';

const USER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const MAKER_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const OTHER_USER_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
const PRINT_REQUEST_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

const PRINTREQUESTS_STUB_SQL = `
CREATE TABLE IF NOT EXISTS "printrequests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_updated" timestamp with time zone,
	"update_count" integer,
	"user_id" uuid,
	"creator_id" uuid,
	"model" text,
	"model_metadata" jsonb,
	"quote_updates" integer,
	"initial_quote" integer,
	"quote" integer,
	"events" jsonb,
	"filament_color" text,
	"model_data" jsonb,
	"request_stage" text,
	"request_metadata" jsonb,
	"order_id" text,
	"payment_id" text,
	"address" jsonb
);
`;

const CHAT_STUB_SQL = `
CREATE TABLE IF NOT EXISTS "Chat" (
	"chat_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sender_id" uuid NOT NULL,
	"recipient_id" uuid NOT NULL,
	"message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"message_type" text,
	"status" text,
	"relationship_id" uuid
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

const AUDIT_LOG_STUB_SQL = `
CREATE TABLE IF NOT EXISTS "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"actor_user_id" uuid,
	"actor_client_id" text,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"action" text NOT NULL,
	"from_state" text,
	"to_state" text,
	"provider_ids" jsonb,
	"meta" jsonb
);
CREATE INDEX IF NOT EXISTS "audit_log_entity_type_entity_id_at_idx" ON "audit_log" ("entity_type", "entity_id", "at");
`;

type TestDb = {
	client: PGlite;
	db: Database;
};

async function createTestDb(): Promise<TestDb> {
	const client = new PGlite();
	await client.exec(PRINTREQUESTS_STUB_SQL);
	await client.exec(CHAT_STUB_SQL);
	await client.exec(CREATOR_STATS_STUB_SQL);
	await client.exec(CREATOR_REVIEWS_STUB_SQL);
	await client.exec(AUDIT_LOG_STUB_SQL);

	const db = drizzle(client, { schema }) as unknown as Database;
	return { client, db };
}

async function seedPrintRequest(
	db: Database,
	overrides: Partial<typeof printrequests.$inferInsert> = {}
) {
	await db.insert(printrequests).values({
		id: PRINT_REQUEST_ID,
		userId: USER_ID,
		creatorId: MAKER_ID,
		requestStage: 'requested',
		events: [],
		...overrides
	});
}

describe('print-requests-store (pglite)', () => {
	let testDb: TestDb;

	beforeEach(async () => {
		testDb = await createTestDb();
	});

	afterEach(async () => {
		await testDb.client.close();
	});

	it('quote action sets by: maker server-side and getLatestQuote accepts it', async () => {
		await seedPrintRequest(testDb.db);
		const store = createPrintRequestsStore(testDb.db);

		const result = await store.performAction(
			{ userId: MAKER_ID, clientId: null },
			PRINT_REQUEST_ID,
			{ action: 'quote', payload: { amount: 750, reason: 'PLA' } }
		);

		expect(result.ok).toBe(true);

		const [row] = await testDb.db
			.select()
			.from(printrequests)
			.where(eq(printrequests.id, PRINT_REQUEST_ID));

		expect(row?.requestStage).toBe('quoted');
		const quotedEvent = (
			row?.events as { by: string; type: string; extra?: { quote: number } }[]
		).find((e) => e.type === 'quoted');
		expect(quotedEvent?.by).toBe('maker');
		expect(quotedEvent?.extra?.quote).toBe(750);
		expect(getLatestQuote(row?.events)).toBe(750);

		const messages = await testDb.db.select().from(chat);
		expect(messages).toHaveLength(1);
		expect(messages[0]?.messageType).toBe('quote');
	});

	it('writes an audit row for print-request action transitions', async () => {
		await seedPrintRequest(testDb.db);
		const store = createPrintRequestsStore(testDb.db);

		const result = await store.performAction(
			{ userId: MAKER_ID, clientId: null },
			PRINT_REQUEST_ID,
			{ action: 'quote', payload: { amount: 500, reason: 'PLA' } }
		);

		expect(result.ok).toBe(true);

		const rows = await testDb.db.select().from(auditLog);
		expect(rows).toEqual([
			expect.objectContaining({
				entityType: 'print_request',
				entityId: PRINT_REQUEST_ID,
				action: 'quote',
				fromState: 'requested',
				toState: 'quoted',
				actorUserId: MAKER_ID
			})
		]);
	});

	it('rejects maker action by user with 403', async () => {
		await seedPrintRequest(testDb.db);
		const store = createPrintRequestsStore(testDb.db);

		const result = await store.performAction(
			{ userId: USER_ID, clientId: null },
			PRINT_REQUEST_ID,
			{ action: 'quote', payload: { amount: 500 } }
		);

		expect(result).toEqual({ ok: false, status: 403, body: { error: 'forbidden' } });
	});

	it('rejects invalid transition with 409', async () => {
		await seedPrintRequest(testDb.db, { requestStage: 'requested' });
		const store = createPrintRequestsStore(testDb.db);

		const result = await store.performAction(
			{ userId: MAKER_ID, clientId: null },
			PRINT_REQUEST_ID,
			{
				action: 'shipped',
				payload: { courier: 'BlueDart', tracking_id: '123' }
			}
		);

		expect(result).toEqual({ ok: false, status: 409, body: { error: 'invalid_transition' } });
	});

	it('guards concurrent actions under row lock', async () => {
		await seedPrintRequest(testDb.db, { requestStage: 'paid' });
		const store = createPrintRequestsStore(testDb.db);

		const [first, second] = await Promise.all([
			store.performAction({ userId: MAKER_ID, clientId: null }, PRINT_REQUEST_ID, {
				action: 'shipped',
				payload: { courier: 'BlueDart', tracking_id: 'A' }
			}),
			store.performAction({ userId: MAKER_ID, clientId: null }, PRINT_REQUEST_ID, {
				action: 'shipped',
				payload: { courier: 'Delhivery', tracking_id: 'B' }
			})
		]);

		const outcomes = [first, second];
		const successes = outcomes.filter((o) => o.ok);
		const failures = outcomes.filter((o) => !o.ok);
		expect(successes).toHaveLength(1);
		expect(failures).toHaveLength(1);
		expect(failures[0]).toEqual({
			ok: false,
			status: 409,
			body: { error: 'invalid_transition' }
		});
	});

	it('cancel action succeeds for user and sets cancelled stage', async () => {
		await seedPrintRequest(testDb.db, { requestStage: 'quoted' });
		const store = createPrintRequestsStore(testDb.db);

		const result = await store.performAction(
			{ userId: USER_ID, clientId: null },
			PRINT_REQUEST_ID,
			{ action: 'cancel', payload: { reason: 'Changed mind' } }
		);

		expect(result.ok).toBe(true);
		const [row] = await testDb.db
			.select()
			.from(printrequests)
			.where(eq(printrequests.id, PRINT_REQUEST_ID));
		expect(row?.requestStage).toBe('cancelled');
	});

	it('decline action succeeds for maker and sets cancelled stage', async () => {
		await seedPrintRequest(testDb.db, { requestStage: 'requested' });
		const store = createPrintRequestsStore(testDb.db);

		const result = await store.performAction(
			{ userId: MAKER_ID, clientId: null },
			PRINT_REQUEST_ID,
			{ action: 'decline', payload: { reason: 'Too busy' } }
		);

		expect(result.ok).toBe(true);
		const [row] = await testDb.db
			.select()
			.from(printrequests)
			.where(eq(printrequests.id, PRINT_REQUEST_ID));
		expect(row?.requestStage).toBe('cancelled');
	});

	it('shipped action succeeds from paid', async () => {
		await seedPrintRequest(testDb.db, { requestStage: 'paid' });
		const store = createPrintRequestsStore(testDb.db);

		const result = await store.performAction(
			{ userId: MAKER_ID, clientId: null },
			PRINT_REQUEST_ID,
			{
				action: 'shipped',
				payload: { courier: 'BlueDart', tracking_id: 'TRK123' }
			}
		);

		expect(result.ok).toBe(true);
		const [row] = await testDb.db
			.select()
			.from(printrequests)
			.where(eq(printrequests.id, PRINT_REQUEST_ID));
		expect(row?.requestStage).toBe('shipped');
	});

	it('shipped action succeeds from paid_externally', async () => {
		await seedPrintRequest(testDb.db, { requestStage: 'paid_externally' });
		const store = createPrintRequestsStore(testDb.db);

		const result = await store.performAction(
			{ userId: MAKER_ID, clientId: null },
			PRINT_REQUEST_ID,
			{
				action: 'shipped',
				payload: { courier: 'Delhivery', tracking_id: 'EXT456' }
			}
		);

		expect(result.ok).toBe(true);
		const [row] = await testDb.db
			.select()
			.from(printrequests)
			.where(eq(printrequests.id, PRINT_REQUEST_ID));
		expect(row?.requestStage).toBe('shipped');
	});

	it('complete action updates CreatorStats completed_orders', async () => {
		await seedPrintRequest(testDb.db, {
			requestStage: 'shipped',
			modelData: { material: 'PLA' },
			events: [
				{
					type: 'quoted',
					timestamp: new Date(Date.now() - 60_000).toISOString(),
					by: 'maker'
				}
			]
		});
		const store = createPrintRequestsStore(testDb.db);

		const result = await store.performAction(
			{ userId: USER_ID, clientId: null },
			PRINT_REQUEST_ID,
			{ action: 'complete', payload: {} }
		);

		expect(result.ok).toBe(true);

		const [row] = await testDb.db
			.select()
			.from(printrequests)
			.where(eq(printrequests.id, PRINT_REQUEST_ID));
		expect(row?.requestStage).toBe('completed');

		const [stats] = await testDb.db
			.select()
			.from(creatorStats)
			.where(eq(creatorStats.makerId, MAKER_ID));
		expect(stats?.completedOrders).toBe(1);
		expect(stats?.materialsUsed).toEqual({ PLA: 1 });
	});
});

describe('chats-store (pglite)', () => {
	let testDb: TestDb;

	beforeEach(async () => {
		testDb = await createTestDb();
		await seedPrintRequest(testDb.db);
	});

	afterEach(async () => {
		await testDb.client.close();
	});

	it('ignores spoofed sender in body and uses actor', async () => {
		const store = createChatsStore(testDb.db);
		const result = await store.sendMessage(
			{ userId: USER_ID, clientId: null },
			{
				relationship_id: PRINT_REQUEST_ID,
				recipient_id: MAKER_ID,
				message: 'hello',
				message_type: 'text',
				status: 'sent'
			}
		);

		expect(result.ok).toBe(true);
		const [row] = await testDb.db.select().from(chat);
		expect(row?.senderId).toBe(USER_ID);
	});

	it('rejects non-participant with 403', async () => {
		const store = createChatsStore(testDb.db);
		const result = await store.sendMessage(
			{ userId: OTHER_USER_ID, clientId: null },
			{
				relationship_id: PRINT_REQUEST_ID,
				recipient_id: MAKER_ID,
				message: 'hello',
				message_type: 'text'
			}
		);

		expect(result).toEqual({ ok: false, status: 403, body: { error: 'forbidden' } });
	});

	it('rejects message over cap via schema in route and empty after trim in store', async () => {
		const store = createChatsStore(testDb.db);
		const result = await store.sendMessage(
			{ userId: USER_ID, clientId: null },
			{
				relationship_id: PRINT_REQUEST_ID,
				recipient_id: MAKER_ID,
				message: '   ',
				message_type: 'text'
			}
		);

		expect(result).toEqual({ ok: false, status: 400, body: { error: 'empty_message' } });
	});

	it('rejects invalid_recipient when recipient is not the other party', async () => {
		const store = createChatsStore(testDb.db);
		const result = await store.sendMessage(
			{ userId: USER_ID, clientId: null },
			{
				relationship_id: PRINT_REQUEST_ID,
				recipient_id: USER_ID,
				message: 'hello',
				message_type: 'text'
			}
		);

		expect(result).toEqual({ ok: false, status: 400, body: { error: 'invalid_recipient' } });
	});
});
