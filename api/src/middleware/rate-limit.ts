import type { MiddlewareHandler } from 'hono';
import type { AppVariables } from '../types/context.js';

type Bucket = {
	count: number;
	resetAt: number;
};

const buckets = new Map<string, Bucket>();

function getClientKey(c: { req: { header: (name: string) => string | undefined } }): string {
	const forwardedFor = c.req.header('x-forwarded-for')?.split(',')[0]?.trim();
	if (forwardedFor) {
		return forwardedFor;
	}

	const directIp = c.req.header('cf-connecting-ip') ?? c.req.header('x-real-ip') ?? undefined;
	if (directIp) {
		return directIp;
	}

	const userAgent = c.req.header('user-agent') ?? 'none';
	return `unknown:${userAgent}`;
}

export const rateLimitMiddleware = (): MiddlewareHandler<{ Variables: AppVariables }> => {
	return async (c, next) => {
		const env = c.get('env');
		const key = getClientKey(c);
		const now = Date.now();
		const existing = buckets.get(key);

		if (!existing || existing.resetAt <= now) {
			buckets.set(key, {
				count: 1,
				resetAt: now + env.RATE_LIMIT_WINDOW_MS
			});
			await next();
			return;
		}

		if (existing.count >= env.RATE_LIMIT_MAX_REQUESTS) {
			const retryAfterSeconds = Math.ceil((existing.resetAt - now) / 1000);
			c.header('retry-after', String(retryAfterSeconds));
			return c.json({ error: 'rate_limited', message: 'Too many requests' }, 429);
		}

		existing.count += 1;
		await next();
	};
};
