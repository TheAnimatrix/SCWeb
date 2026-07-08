import { Hono } from 'hono';
import { describe, expect, it, vi } from 'vitest';
import type { Database } from '../db/index.js';
import { createPrintRequestsRoutes } from './print-requests.js';
import type { PrintRequestsStore } from '../services/print-requests-store.js';
import type { Actor, AppVariables } from '../types/context.js';

const PRINT_REQUEST_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const MAKER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const USER_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

function createTestApp(actor: Actor, store: PrintRequestsStore) {
	const app = new Hono<{ Variables: AppVariables }>();

	app.use('*', async (c, next) => {
		c.set('db', {} as Database);
		c.set('printRequestsStore', store);
		c.set('requestId', 'test-request');
		c.set('actor', actor);
		c.set('user', null);
		await next();
	});

	app.route(
		'/',
		createPrintRequestsRoutes((c) => c.get('printRequestsStore'))
	);
	return app;
}

function fakeStore(overrides: Partial<PrintRequestsStore> = {}): PrintRequestsStore {
	return {
		performAction: vi.fn(),
		...overrides
	};
}

describe('print-requests routes', () => {
	it('returns 401 when unauthenticated', async () => {
		const app = createTestApp({ userId: null, clientId: 'guest' }, fakeStore());
		const response = await app.request(`/print-requests/${PRINT_REQUEST_ID}/actions`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ action: 'quote', payload: { amount: 500 } })
		});

		expect(response.status).toBe(401);
	});

	it('returns 403 when maker action is attempted by user', async () => {
		const performAction = vi.fn(async () => ({
			ok: false as const,
			status: 403 as const,
			body: { error: 'forbidden' as const }
		}));
		const app = createTestApp({ userId: USER_ID, clientId: null }, fakeStore({ performAction }));

		const response = await app.request(`/print-requests/${PRINT_REQUEST_ID}/actions`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ action: 'quote', payload: { amount: 500 } })
		});

		expect(response.status).toBe(403);
	});

	it('returns 403 when user action is attempted by maker', async () => {
		const performAction = vi.fn(async () => ({
			ok: false as const,
			status: 403 as const,
			body: { error: 'forbidden' as const }
		}));
		const app = createTestApp({ userId: MAKER_ID, clientId: null }, fakeStore({ performAction }));

		const response = await app.request(`/print-requests/${PRINT_REQUEST_ID}/actions`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ action: 'complete', payload: {} })
		});

		expect(response.status).toBe(403);
	});

	it('returns 409 on invalid transition', async () => {
		const performAction = vi.fn(async () => ({
			ok: false as const,
			status: 409 as const,
			body: { error: 'invalid_transition' as const }
		}));
		const app = createTestApp({ userId: MAKER_ID, clientId: null }, fakeStore({ performAction }));

		const response = await app.request(`/print-requests/${PRINT_REQUEST_ID}/actions`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				action: 'shipped',
				payload: { courier: 'BlueDart', tracking_id: '1' }
			})
		});

		expect(response.status).toBe(409);
		await expect(response.json()).resolves.toEqual({ error: 'invalid_transition' });
	});

	it('applies quote action successfully', async () => {
		const performAction = vi.fn(async () => ({
			ok: true as const,
			response: { id: PRINT_REQUEST_ID, requestStage: 'quoted' }
		}));
		const app = createTestApp({ userId: MAKER_ID, clientId: null }, fakeStore({ performAction }));

		const response = await app.request(`/print-requests/${PRINT_REQUEST_ID}/actions`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ action: 'quote', payload: { amount: 500, reason: 'PLA print' } })
		});

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({
			id: PRINT_REQUEST_ID,
			requestStage: 'quoted'
		});
	});
});
