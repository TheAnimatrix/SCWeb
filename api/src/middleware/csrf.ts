import type { MiddlewareHandler } from 'hono';
import { getCorsOrigins, type Env } from '../env.js';
import type { AppVariables } from '../types/context.js';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function normalizeOrigin(value: string | undefined): string | null {
	if (!value) {
		return null;
	}

	try {
		return new URL(value).origin;
	} catch {
		return null;
	}
}

function hasBearerToken(authorization: string | undefined): boolean {
	return Boolean(authorization?.startsWith('Bearer ') && authorization.length > 'Bearer '.length);
}

export const csrfMiddleware = (): MiddlewareHandler<{ Variables: AppVariables }> => {
	return async (c, next) => {
		if (!MUTATING_METHODS.has(c.req.method)) {
			await next();
			return;
		}

		if (hasBearerToken(c.req.header('authorization'))) {
			await next();
			return;
		}

		const env = c.get('env');
		const allowedOrigins = new Set(getCorsOrigins(env));
		const origin = normalizeOrigin(c.req.header('origin'));
		const refererOrigin = normalizeOrigin(c.req.header('referer'));
		const requestOrigin = origin ?? refererOrigin;

		if (!requestOrigin || !allowedOrigins.has(requestOrigin)) {
			return c.json({ error: 'csrf_blocked', message: 'Origin is not allowed' }, 403);
		}

		await next();
	};
};

export function assertSameOrigin(env: Env, originHeader: string | undefined): boolean {
	const allowedOrigins = new Set(getCorsOrigins(env));
	const origin = normalizeOrigin(originHeader);
	return origin !== null && allowedOrigins.has(origin);
}
