import { Hono } from 'hono';
import {
	passwordResetConfirmBodySchema,
	passwordResetRequestBodySchema,
	signupBodySchema
} from '../contracts/auth.js';
import { validateJson } from '../lib/validation.js';
import { isAuthMailConfigured } from '../services/auth-store.js';
import type { AuthStore } from '../services/auth-store.js';
import type { AppVariables } from '../types/context.js';

export function createAuthRoutes(
	getAuthStore: (c: { get: (key: 'authStore') => AuthStore }) => AuthStore
) {
	const authRoutes = new Hono<{ Variables: AppVariables }>();

	authRoutes.use('*', async (c, next) => {
		if (!isAuthMailConfigured(c.get('env'))) {
			return c.json({ error: 'auth_mail_unconfigured' }, 503);
		}
		await next();
	});

	authRoutes.post('/auth/signup', validateJson(signupBodySchema), async (c) => {
		const body = c.req.valid('json');
		const result = await getAuthStore(c).signup(body);

		if (!result.ok) {
			return c.json(result.body, result.status as 400 | 409 | 500);
		}

		return c.json(result.data);
	});

	authRoutes.post('/auth/password-reset', validateJson(passwordResetRequestBodySchema), async (c) => {
		const body = c.req.valid('json');
		const result = await getAuthStore(c).requestPasswordReset(body);

		if (!result.ok) {
			return c.json(result.body, result.status as 400);
		}

		return c.json(result.data);
	});

	authRoutes.post(
		'/auth/password-reset/confirm',
		validateJson(passwordResetConfirmBodySchema),
		async (c) => {
			const body = c.req.valid('json');
			const result = await getAuthStore(c).confirmPasswordReset(body);

			if (!result.ok) {
				return c.json(result.body, result.status as 400 | 500);
			}

			return c.json(result.data);
		}
	);

	return authRoutes;
}

export const authRoutes = createAuthRoutes((c) => c.get('authStore'));
