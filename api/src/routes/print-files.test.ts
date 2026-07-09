import { Hono } from 'hono';
import { describe, expect, it, vi } from 'vitest';
import type { Env } from '../env.js';
import type { Database } from '../db/index.js';
import { emailEnvDefaults } from '../test/env-defaults.js';
import { createPrintFilesRoutes } from './print-files.js';
import type { PrintFilesStore, PrintRequestRow } from '../services/print-files-store.js';
import { BODY_READ_SLACK_BYTES, MAX_STL_SIZE_BYTES } from '../services/print-files.js';
import type { Actor, AppVariables } from '../types/context.js';

const USER_ID = '11111111-1111-1111-1111-111111111111';
const MAKER_ID = '22222222-2222-2222-2222-222222222222';
const REQUEST_ID = '33333333-3333-3333-3333-333333333333';

const testEnv = {
	NODE_ENV: 'test',
	API_PORT: 3001,
	DATABASE_URL: 'postgres://test',
	SUPABASE_URL: 'https://example.supabase.co',
	SUPABASE_ANON_KEY: 'anon-key',
	SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
	API_CORS_ORIGINS: 'http://localhost:5173',
	CLIENT_ID_COOKIE_NAME: 'clientId',
	RATE_LIMIT_WINDOW_MS: 60_000,
	RATE_LIMIT_MAX_REQUESTS: 120,
	...emailEnvDefaults
} satisfies Env;

function createBinaryStl(triangleCount: number): Uint8Array {
	const size = 84 + triangleCount * 50;
	const buffer = new Uint8Array(size);
	const view = new DataView(buffer.buffer);
	view.setUint32(80, triangleCount, true);
	return buffer;
}

function createTestApp(actor: Actor, store: PrintFilesStore | null, env: Env = testEnv) {
	const app = new Hono<{ Variables: AppVariables }>();

	app.use('*', async (c, next) => {
		c.set('env', env);
		c.set('db', {} as Database);
		c.set('printFilesStore', store);
		c.set('requestId', 'test-request');
		c.set('actor', actor);
		c.set('user', null);
		await next();
	});

	app.route(
		'/',
		createPrintFilesRoutes((c) => c.get('printFilesStore'))
	);
	return app;
}

function fakeStore(overrides: Partial<PrintFilesStore> = {}): PrintFilesStore {
	return {
		uploadPrintFile: vi.fn(),
		getDownloadUrl: vi.fn(),
		getUploadQuotaStatus: vi.fn(),
		...overrides
	};
}

function validMetadata() {
	return {
		maker_id: MAKER_ID,
		color: 'red',
		material: 'PLA',
		quality: '0.2',
		scale: '1',
		infill: '20'
	};
}

function buildMultipartBody(fileBytes: Uint8Array, filename = 'model.stl') {
	const boundary = '----vitest-boundary';
	const metadata = validMetadata();
	const parts = [
		`--${boundary}`,
		'Content-Disposition: form-data; name="maker_id"',
		'',
		metadata.maker_id,
		`--${boundary}`,
		'Content-Disposition: form-data; name="color"',
		'',
		metadata.color,
		`--${boundary}`,
		'Content-Disposition: form-data; name="material"',
		'',
		metadata.material,
		`--${boundary}`,
		'Content-Disposition: form-data; name="quality"',
		'',
		metadata.quality,
		`--${boundary}`,
		'Content-Disposition: form-data; name="scale"',
		'',
		metadata.scale,
		`--${boundary}`,
		'Content-Disposition: form-data; name="infill"',
		'',
		metadata.infill,
		`--${boundary}`,
		`Content-Disposition: form-data; name="model_file"; filename="${filename}"`,
		'Content-Type: application/octet-stream',
		'',
		new TextDecoder('latin1').decode(fileBytes),
		`--${boundary}--`,
		''
	];

	return {
		body: parts.join('\r\n'),
		contentType: `multipart/form-data; boundary=${boundary}`
	};
}

describe('print-files routes', () => {
	it('returns 401 for guest upload', async () => {
		const app = createTestApp({ userId: null, clientId: 'guest-1' }, fakeStore());
		const { body, contentType } = buildMultipartBody(createBinaryStl(1));
		const response = await app.request('/print-files/upload', {
			method: 'POST',
			headers: { 'Content-Type': contentType },
			body
		});

		expect(response.status).toBe(401);
	});

	it('returns 401 for guest download', async () => {
		const app = createTestApp({ userId: null, clientId: 'guest-1' }, fakeStore());
		const response = await app.request(`/print-files/${REQUEST_ID}/download-url`);

		expect(response.status).toBe(401);
	});

	it('returns 503 when files are unconfigured', async () => {
		const env = { ...testEnv, SUPABASE_SERVICE_ROLE_KEY: undefined };
		const app = createTestApp({ userId: USER_ID, clientId: null }, null, env);
		const { body, contentType } = buildMultipartBody(createBinaryStl(1));
		const response = await app.request('/print-files/upload', {
			method: 'POST',
			headers: { 'Content-Type': contentType },
			body
		});

		expect(response.status).toBe(503);
		await expect(response.json()).resolves.toEqual({ error: 'files_unconfigured' });
	});

	it('returns 415 for invalid STL content', async () => {
		const app = createTestApp({ userId: USER_ID, clientId: null }, fakeStore());
		const { body, contentType } = buildMultipartBody(
			new TextEncoder().encode('not-stl'),
			'model.stl'
		);
		const response = await app.request('/print-files/upload', {
			method: 'POST',
			headers: { 'Content-Type': contentType },
			body
		});

		expect(response.status).toBe(415);
	});

	it('returns 415 for non-stl extension', async () => {
		const app = createTestApp({ userId: USER_ID, clientId: null }, fakeStore());
		const { body, contentType } = buildMultipartBody(createBinaryStl(1), 'model.obj');
		const response = await app.request('/print-files/upload', {
			method: 'POST',
			headers: { 'Content-Type': contentType },
			body
		});

		expect(response.status).toBe(415);
	});

	it('returns 413 for oversize uploads', async () => {
		const app = createTestApp({ userId: USER_ID, clientId: null }, fakeStore());
		const oversized = new Uint8Array(50 * 1024 * 1024 + 1);
		const { body, contentType } = buildMultipartBody(oversized);
		const response = await app.request('/print-files/upload', {
			method: 'POST',
			headers: { 'Content-Type': contentType },
			body
		});

		expect(response.status).toBe(413);
	});

	it('returns 413 when Content-Length is forged smaller than the streamed body', async () => {
		const app = createTestApp({ userId: USER_ID, clientId: null }, fakeStore());
		const oversized = new Uint8Array(MAX_STL_SIZE_BYTES + BODY_READ_SLACK_BYTES + 1);
		const query = new URLSearchParams({ ...validMetadata(), filename: 'model.stl' });
		const response = await app.request(`/print-files/upload?${query.toString()}`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/octet-stream',
				'Content-Length': '64'
			},
			body: oversized
		});

		expect(response.status).toBe(413);
	});

	it('returns 413 for oversized raw uploads without Content-Length', async () => {
		const app = createTestApp({ userId: USER_ID, clientId: null }, fakeStore());
		const oversized = new Uint8Array(MAX_STL_SIZE_BYTES + BODY_READ_SLACK_BYTES + 1);
		const query = new URLSearchParams({ ...validMetadata(), filename: 'model.stl' });
		const response = await app.request(`/print-files/upload?${query.toString()}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/octet-stream' },
			body: oversized
		});

		expect(response.status).toBe(413);
	});

	it('returns 429 when quota is exceeded', async () => {
		const uploadPrintFile = vi.fn(async () => ({
			ok: false as const,
			status: 429 as const,
			body: { error: 'quota_exceeded' as const }
		}));
		const app = createTestApp({ userId: USER_ID, clientId: null }, fakeStore({ uploadPrintFile }));
		const { body, contentType } = buildMultipartBody(createBinaryStl(1));
		const response = await app.request('/print-files/upload', {
			method: 'POST',
			headers: { 'Content-Type': contentType },
			body
		});

		expect(response.status).toBe(429);
	});

	it('uploads successfully', async () => {
		const printRequest: PrintRequestRow = {
			id: REQUEST_ID,
			user_id: USER_ID,
			creator_id: MAKER_ID,
			model: `models/${USER_ID}/file.stl`,
			model_metadata: {
				fileName: `${USER_ID}/file.stl`,
				originalFilename: 'model.stl'
			},
			model_data: validMetadata(),
			request_stage: 'requested',
			created_at: new Date().toISOString()
		};
		const uploadPrintFile = vi.fn(async () => ({ ok: true as const, printRequest }));
		const app = createTestApp({ userId: USER_ID, clientId: null }, fakeStore({ uploadPrintFile }));
		const fileBytes = createBinaryStl(1);
		const { body, contentType } = buildMultipartBody(fileBytes);
		const response = await app.request('/print-files/upload', {
			method: 'POST',
			headers: { 'Content-Type': contentType },
			body
		});

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({ printRequest });
		expect(uploadPrintFile).toHaveBeenCalledOnce();
	});

	it('returns 404 for unknown download id', async () => {
		const getDownloadUrl = vi.fn(async () => ({
			ok: false as const,
			status: 404 as const,
			body: { error: 'not_found' as const }
		}));
		const app = createTestApp({ userId: USER_ID, clientId: null }, fakeStore({ getDownloadUrl }));
		const response = await app.request(`/print-files/${REQUEST_ID}/download-url`);

		expect(response.status).toBe(404);
	});

	it('returns 403 for stranger download', async () => {
		const getDownloadUrl = vi.fn(async () => ({
			ok: false as const,
			status: 403 as const,
			body: { error: 'forbidden' as const }
		}));
		const app = createTestApp({ userId: USER_ID, clientId: null }, fakeStore({ getDownloadUrl }));
		const response = await app.request(`/print-files/${REQUEST_ID}/download-url`);

		expect(response.status).toBe(403);
	});

	it('returns signed download url for authorized users', async () => {
		const getDownloadUrl = vi.fn(async () => ({
			ok: true as const,
			url: 'https://example.supabase.co/signed',
			expiresAt: '2026-07-08T12:00:00.000Z'
		}));
		const app = createTestApp({ userId: USER_ID, clientId: null }, fakeStore({ getDownloadUrl }));
		const response = await app.request(`/print-files/${REQUEST_ID}/download-url`);

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({
			url: 'https://example.supabase.co/signed',
			expiresAt: '2026-07-08T12:00:00.000Z'
		});
	});

	it('returns upload quota status for authenticated users', async () => {
		const getUploadQuotaStatus = vi.fn(async () => ({
			limit: 3,
			used: 0,
			remaining: 3
		}));
		const app = createTestApp(
			{ userId: USER_ID, clientId: null },
			fakeStore({ getUploadQuotaStatus })
		);
		const response = await app.request('/print-files/quota');

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({ limit: 3, used: 0, remaining: 3 });
		expect(getUploadQuotaStatus).toHaveBeenCalledWith(USER_ID);
	});
});
