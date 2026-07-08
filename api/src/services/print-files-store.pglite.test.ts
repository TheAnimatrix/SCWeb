import { PGlite } from '@electric-sql/pglite';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Database } from '../db/index.js';
import * as schema from '../db/schema/index.js';
import { printrequests } from '../db/schema/printrequests.js';
import { createPrintFilesStore, type PrintFilesStorage } from './print-files-store.js';

const USER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const MAKER_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

const USERS_STUB_SQL = `
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"quote_daily_limit" integer
);
`;

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

const quotaMigrationSql = readFileSync(
	resolve(import.meta.dirname, '../../drizzle/0002_upload_quota.sql'),
	'utf8'
);

function createBinaryStl(triangleCount: number): Uint8Array {
	const size = 84 + triangleCount * 50;
	const buffer = new Uint8Array(size);
	const view = new DataView(buffer.buffer);
	view.setUint32(80, triangleCount, true);
	return buffer;
}

function fakeStorage(): PrintFilesStorage {
	return {
		upload: vi.fn(async () => ({ ok: true as const })),
		remove: vi.fn(async () => ({ ok: true as const })),
		createSignedUrl: vi.fn(async () => ({
			ok: true as const,
			signedUrl: 'https://example.supabase.co/signed'
		}))
	};
}

type TestDb = {
	client: PGlite;
	db: Database;
};

async function createTestDb(): Promise<TestDb> {
	const client = new PGlite();
	await client.exec(USERS_STUB_SQL);
	await client.exec(PRINTREQUESTS_STUB_SQL);
	await client.exec(quotaMigrationSql);

	const db = drizzle(client, { schema }) as unknown as Database;
	return { client, db };
}

describe('print-files store (pglite)', () => {
	let testDb: TestDb;

	beforeEach(async () => {
		testDb = await createTestDb();
		await testDb.client.exec(`INSERT INTO users (id, quote_daily_limit) VALUES ('${USER_ID}', 1)`);
	});

	afterEach(async () => {
		await testDb.client.close();
	});

	it('creates printrequests rows with edge-function parity fields', async () => {
		const storage = fakeStorage();
		const store = createPrintFilesStore(testDb.db, storage);
		const fileBytes = createBinaryStl(1);

		const result = await store.uploadPrintFile({
			userId: USER_ID,
			makerId: MAKER_ID,
			originalFilename: 'cube.stl',
			fileBytes,
			modelData: {
				color: 'red',
				material: 'PLA',
				quality: '0.2',
				scale: '1',
				infill: '20'
			}
		});

		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}

		expect(result.printRequest.request_stage).toBe('requested');
		expect(result.printRequest.user_id).toBe(USER_ID);
		expect(result.printRequest.creator_id).toBe(MAKER_ID);
		expect(result.printRequest.model).toMatch(
			/^models\/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa\/.+\.stl$/
		);
		expect(result.printRequest.model_metadata).toEqual({
			fileName: expect.stringMatching(/^aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa\/.+\.stl$/),
			originalFilename: 'cube.stl'
		});
		expect(result.printRequest.model_data).toEqual({
			color: 'red',
			material: 'PLA',
			quality: '0.2',
			scale: '1',
			infill: '20'
		});

		const rows = await testDb.db.select().from(printrequests);
		expect(rows).toHaveLength(1);
		expect(rows[0]?.requestStage).toBe('requested');
		expect(storage.upload).toHaveBeenCalledOnce();
	});

	it('allows exactly one concurrent upload when the daily limit is one', async () => {
		const storage = fakeStorage();
		const store = createPrintFilesStore(testDb.db, storage);
		const payload = {
			userId: USER_ID,
			makerId: MAKER_ID,
			originalFilename: 'cube.stl',
			fileBytes: createBinaryStl(1),
			modelData: {
				color: 'red',
				material: 'PLA',
				quality: '0.2',
				scale: '1',
				infill: '20'
			}
		};

		const [first, second] = await Promise.all([
			store.uploadPrintFile(payload),
			store.uploadPrintFile(payload)
		]);

		const successes = [first, second].filter((result) => result.ok);
		const quotaFailures = [first, second].filter((result) => !result.ok && result.status === 429);

		expect(successes).toHaveLength(1);
		expect(quotaFailures).toHaveLength(1);

		const rows = await testDb.db
			.select()
			.from(printrequests)
			.where(eq(printrequests.userId, USER_ID));
		expect(rows).toHaveLength(1);
	});

	it('blocks the first upload when the daily limit is zero', async () => {
		await testDb.client.exec(`UPDATE users SET quote_daily_limit = 0 WHERE id = '${USER_ID}'`);

		const storage = fakeStorage();
		const store = createPrintFilesStore(testDb.db, storage);
		const result = await store.uploadPrintFile({
			userId: USER_ID,
			makerId: MAKER_ID,
			originalFilename: 'cube.stl',
			fileBytes: createBinaryStl(1),
			modelData: {
				color: 'red',
				material: 'PLA',
				quality: '0.2',
				scale: '1',
				infill: '20'
			}
		});

		expect(result.ok).toBe(false);
		if (result.ok) {
			return;
		}
		expect(result.status).toBe(429);

		const rows = await testDb.db.select().from(printrequests);
		expect(rows).toHaveLength(0);
		expect(storage.upload).not.toHaveBeenCalled();
	});

	it('does not consume quota when storage upload fails', async () => {
		const storage: PrintFilesStorage = {
			upload: vi.fn(async () => ({ ok: false as const, message: 'storage down' })),
			remove: vi.fn(async () => ({ ok: true as const })),
			createSignedUrl: vi.fn(async () => ({
				ok: true as const,
				signedUrl: 'https://example.supabase.co/signed'
			}))
		};
		const store = createPrintFilesStore(testDb.db, storage);
		const result = await store.uploadPrintFile({
			userId: USER_ID,
			makerId: MAKER_ID,
			originalFilename: 'cube.stl',
			fileBytes: createBinaryStl(1),
			modelData: {
				color: 'red',
				material: 'PLA',
				quality: '0.2',
				scale: '1',
				infill: '20'
			}
		});

		expect(result.ok).toBe(false);
		if (result.ok) {
			return;
		}
		expect(result.status).toBe(500);

		const quotaRows = await testDb.client.query<{ count: number }>(
			`SELECT count FROM upload_quota WHERE user_id = '${USER_ID}'`
		);
		expect(quotaRows.rows[0]?.count ?? 0).toBe(0);
	});

	it('attempts orphan cleanup when printrequests insert fails', async () => {
		const storage = fakeStorage();
		const store = createPrintFilesStore(testDb.db, storage);
		const insertSpy = vi.spyOn(testDb.db, 'insert').mockImplementation(() => {
			throw new Error('insert failed');
		});

		const result = await store.uploadPrintFile({
			userId: USER_ID,
			makerId: MAKER_ID,
			originalFilename: 'cube.stl',
			fileBytes: createBinaryStl(1),
			modelData: {
				color: 'red',
				material: 'PLA',
				quality: '0.2',
				scale: '1',
				infill: '20'
			}
		});

		insertSpy.mockRestore();

		expect(result.ok).toBe(false);
		if (result.ok) {
			return;
		}
		expect(result.status).toBe(500);
		expect(storage.remove).toHaveBeenCalledOnce();

		const quotaRows = await testDb.client.query<{ count: number }>(
			`SELECT count FROM upload_quota WHERE user_id = '${USER_ID}'`
		);
		expect(quotaRows.rows[0]?.count ?? 0).toBe(0);
	});
});
