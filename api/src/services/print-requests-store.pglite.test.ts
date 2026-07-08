import { PGlite } from '@electric-sql/pglite';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Database } from '../db/index.js';
import * as schema from '../db/schema/index.js';
import { chat } from '../db/schema/chat.js';
import { printrequests } from '../db/schema/printrequests.js';
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

type TestDb = {
	client: PGlite;
	db: Database;
};

async function createTestDb(): Promise<TestDb> {
	const client = new PGlite();
	await client.exec(PRINTREQUESTS_STUB_SQL);
	await client.exec(CHAT_STUB_SQL);

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
});
