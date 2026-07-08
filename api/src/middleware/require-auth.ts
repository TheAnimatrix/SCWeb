import type { MiddlewareHandler } from 'hono';
import type { AppVariables } from '../types/context.js';

export const requireAuth = (): MiddlewareHandler<{ Variables: AppVariables }> => {
	return async (c, next) => {
		if (!c.get('actor').userId) {
			return c.json({ error: 'unauthorized', message: 'Authentication required' }, 401);
		}

		await next();
	};
};
