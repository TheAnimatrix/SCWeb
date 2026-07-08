import { Hono } from 'hono';
import { describe, expect, it, vi } from 'vitest';
import type { GetCartResponse, UpsertCartItemBody } from '../contracts/cart.js';
import { createCartRoutes } from './cart.js';
import type { CartStore } from '../services/cart-store.js';
import type { Actor, AppVariables } from '../types/context.js';
import type { Env } from '../env.js';
import type { Database } from '../db/index.js';

const testEnv = {
	NODE_ENV: 'test',
	API_PORT: 3001,
	DATABASE_URL: 'postgres://test',
	SUPABASE_URL: 'https://example.supabase.co',
	SUPABASE_ANON_KEY: 'anon-key',
	API_CORS_ORIGINS: 'http://localhost:5173',
	CLIENT_ID_COOKIE_NAME: 'clientId',
	RATE_LIMIT_WINDOW_MS: 60_000,
	RATE_LIMIT_MAX_REQUESTS: 120
} satisfies Env;

function createTestApp(actor: Actor, cartStore: CartStore) {
	const app = new Hono<{ Variables: AppVariables }>();

	app.use('*', async (c, next) => {
		c.set('env', testEnv);
		c.set('db', {} as Database);
		c.set('cartStore', cartStore);
		c.set('requestId', 'test-request');
		c.set('actor', actor);
		c.set('user', null);
		await next();
	});

	app.route(
		'/',
		createCartRoutes((c) => c.get('cartStore'))
	);
	return app;
}

function fakeStore(overrides: Partial<CartStore> = {}): CartStore {
	return {
		getCart: vi.fn(async () => ({ cart: null })),
		upsertCartItem: vi.fn(),
		mergeCart: vi.fn(),
		...overrides
	};
}

describe('cart routes', () => {
	it('returns 401 when the actor has no identity', async () => {
		const app = createTestApp({ userId: null, clientId: null }, fakeStore());
		const response = await app.request('/cart');

		expect(response.status).toBe(401);
	});

	it('returns null cart when none exists', async () => {
		const store = fakeStore({
			getCart: vi.fn(async () => ({ cart: null }))
		});
		const app = createTestApp({ userId: null, clientId: 'guest-1' }, store);
		const response = await app.request('/cart');

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({ cart: null });
	});

	it('lazily upserts through the store on PUT', async () => {
		const cartResponse: GetCartResponse = {
			cart: {
				id: 'cart-1',
				status: 'active',
				items: [],
				subtotal: 0,
				deliveryFee: 99,
				total: 99
			}
		};

		const upsertCartItem = vi.fn(async () => ({ ok: true as const, response: cartResponse }));
		const app = createTestApp({ userId: null, clientId: 'guest-1' }, fakeStore({ upsertCartItem }));

		const response = await app.request('/cart/items/00000000-0000-0000-0000-000000000001', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ qty: 1, mode: 'set' } satisfies UpsertCartItemBody)
		});

		expect(response.status).toBe(200);
		expect(upsertCartItem).toHaveBeenCalledWith(
			{ userId: null, clientId: 'guest-1' },
			'00000000-0000-0000-0000-000000000001',
			{ qty: 1, mode: 'set' }
		);
	});

	it('returns 409 when stock is insufficient', async () => {
		const upsertCartItem = vi.fn(async () => ({
			ok: false as const,
			status: 409 as const,
			body: { error: 'insufficient_stock' as const, limit: 2 }
		}));
		const app = createTestApp({ userId: null, clientId: 'guest-1' }, fakeStore({ upsertCartItem }));

		const response = await app.request('/cart/items/00000000-0000-0000-0000-000000000002', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ qty: 5, mode: 'set' })
		});

		expect(response.status).toBe(409);
		await expect(response.json()).resolves.toEqual({ error: 'insufficient_stock', limit: 2 });
	});

	it('returns 403 when merge clientId mismatches the actor cookie', async () => {
		const mergeCart = vi.fn(async () => ({
			ok: false as const,
			status: 403 as const,
			body: {
				error: 'forbidden',
				message: 'clientId does not match the authenticated actor'
			}
		}));
		const app = createTestApp(
			{ userId: 'user-1', clientId: 'cookie-client' },
			fakeStore({ mergeCart })
		);

		const response = await app.request('/cart/merge', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Origin: 'http://localhost:5173'
			},
			body: JSON.stringify({ clientId: 'other-client' })
		});

		expect(response.status).toBe(403);
		expect(mergeCart).toHaveBeenCalledWith(
			{ userId: 'user-1', clientId: 'cookie-client' },
			'other-client'
		);
	});
});
