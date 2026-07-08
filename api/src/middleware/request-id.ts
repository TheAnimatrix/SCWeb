import { randomUUID } from 'node:crypto';
import type { MiddlewareHandler } from 'hono';
import type { AppVariables } from '../types/context.js';

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{1,128}$/;

function sanitizeRequestId(value: string | undefined): string {
	if (value && REQUEST_ID_PATTERN.test(value)) {
		return value;
	}

	return randomUUID();
}

export const requestIdMiddleware = (): MiddlewareHandler<{ Variables: AppVariables }> => {
	return async (c, next) => {
		const requestId = sanitizeRequestId(c.req.header('x-request-id'));
		c.set('requestId', requestId);
		c.header('x-request-id', requestId);
		await next();
	};
};
