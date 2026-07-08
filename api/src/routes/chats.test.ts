import { Hono } from 'hono';
import { describe, expect, it, vi } from 'vitest';
import type { Database } from '../db/index.js';
import { createChatsRoutes } from './chats.js';
import type { ChatsStore } from '../services/chats-store.js';
import type { Actor, AppVariables } from '../types/context.js';

const RELATIONSHIP_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const USER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const MAKER_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

function createTestApp(actor: Actor, store: ChatsStore) {
	const app = new Hono<{ Variables: AppVariables }>();

	app.use('*', async (c, next) => {
		c.set('db', {} as Database);
		c.set('chatsStore', store);
		c.set('requestId', 'test-request');
		c.set('actor', actor);
		c.set('user', null);
		await next();
	});

	app.route(
		'/',
		createChatsRoutes((c) => c.get('chatsStore'))
	);
	return app;
}

function fakeStore(overrides: Partial<ChatsStore> = {}): ChatsStore {
	return {
		sendMessage: vi.fn(),
		...overrides
	};
}

describe('chats routes', () => {
	it('returns 401 when unauthenticated', async () => {
		const app = createTestApp({ userId: null, clientId: 'guest' }, fakeStore());
		const response = await app.request('/chats/messages', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				relationship_id: RELATIONSHIP_ID,
				recipient_id: MAKER_ID,
				message: 'hello',
				message_type: 'text'
			})
		});

		expect(response.status).toBe(401);
	});

	it('returns 403 for non-participant', async () => {
		const sendMessage = vi.fn(async () => ({
			ok: false as const,
			status: 403 as const,
			body: { error: 'forbidden' as const }
		}));
		const app = createTestApp({ userId: USER_ID, clientId: null }, fakeStore({ sendMessage }));

		const response = await app.request('/chats/messages', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				relationship_id: RELATIONSHIP_ID,
				recipient_id: MAKER_ID,
				message: 'hello',
				message_type: 'text'
			})
		});

		expect(response.status).toBe(403);
	});

	it('returns 400 for empty message after trim', async () => {
		const sendMessage = vi.fn(async () => ({
			ok: false as const,
			status: 400 as const,
			body: { error: 'empty_message' as const }
		}));
		const app = createTestApp({ userId: USER_ID, clientId: null }, fakeStore({ sendMessage }));

		const response = await app.request('/chats/messages', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				relationship_id: RELATIONSHIP_ID,
				recipient_id: MAKER_ID,
				message: '   ',
				message_type: 'text'
			})
		});

		expect(response.status).toBe(400);
	});

	it('sends message successfully', async () => {
		const sendMessage = vi.fn(async () => ({
			ok: true as const,
			response: {
				chat_id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
				created_at: '2026-01-01T00:00:00.000Z'
			}
		}));
		const app = createTestApp({ userId: USER_ID, clientId: null }, fakeStore({ sendMessage }));

		const response = await app.request('/chats/messages', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				relationship_id: RELATIONSHIP_ID,
				recipient_id: MAKER_ID,
				message: 'hello there',
				message_type: 'text'
			})
		});

		expect(response.status).toBe(200);
		expect(sendMessage).toHaveBeenCalledOnce();
	});
});
