import { randomUUID } from 'node:crypto';
import type { MiddlewareHandler } from 'hono';
import type { AppVariables } from '../types/context.js';

export const requestIdMiddleware = (): MiddlewareHandler<{ Variables: AppVariables }> => {
	return async (c, next) => {
		const incoming = c.req.header('x-request-id');
		const requestId = incoming && incoming.length > 0 ? incoming : randomUUID();
		c.set('requestId', requestId);
		c.header('x-request-id', requestId);
		c.set('actor', { userId: null, clientId: null });
		c.set('user', null);
		await next();
	};
};
