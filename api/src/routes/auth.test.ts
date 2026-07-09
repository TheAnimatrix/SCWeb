import { Hono } from 'hono';
import { describe, expect, it, vi } from 'vitest';
import { emailEnvDefaults } from '../test/env-defaults.js';
import { createAuthRoutes } from './auth.js';
import type { AuthStore } from '../services/auth-store.js';
import type { AppVariables } from '../types/context.js';

const baseEnv = {
	NODE_ENV: 'test' as const,
	API_PORT: 3001,
	DATABASE_URL: 'postgresql://test',
	SUPABASE_URL: 'https://example.supabase.co',
	SUPABASE_ANON_KEY: 'anon',
	SUPABASE_SERVICE_ROLE_KEY: 'service',
	API_CORS_ORIGINS: 'http://localhost:5173',
	CLIENT_ID_COOKIE_NAME: 'clientId',
	RATE_LIMIT_WINDOW_MS: 60_000,
	RATE_LIMIT_MAX_REQUESTS: 120,
	...emailEnvDefaults
};

function createTestApp(authStore: AuthStore) {
	const app = new Hono<{ Variables: AppVariables }>();
	app.use('*', async (c, next) => {
		c.set('env', baseEnv);
		c.set('authStore', authStore);
		await next();
	});
	app.route('/', createAuthRoutes((c) => c.get('authStore')));
	return app;
}

describe('auth routes', () => {
	it('returns needsConfirmation on signup', async () => {
		const authStore = {
			signup: vi.fn().mockResolvedValue({ ok: true, data: { needsConfirmation: true } }),
			requestPasswordReset: vi.fn(),
			confirmPasswordReset: vi.fn()
		} satisfies AuthStore;

		const app = createTestApp(authStore);
		const response = await app.request('http://localhost/auth/signup', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				email: 'user@example.com',
				password: 'Password1',
				username: 'maker_one'
			})
		});

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({ needsConfirmation: true });
	});

	it('always returns generic message for password reset request', async () => {
		const authStore = {
			signup: vi.fn(),
			requestPasswordReset: vi
				.fn()
				.mockResolvedValue({ ok: true, data: { message: 'If an account exists for that email, we sent password reset instructions.' } }),
			confirmPasswordReset: vi.fn()
		} satisfies AuthStore;

		const app = createTestApp(authStore);
		const response = await app.request('http://localhost/auth/password-reset', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email: 'missing@example.com' })
		});

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({
			message: 'If an account exists for that email, we sent password reset instructions.'
		});
	});
});
