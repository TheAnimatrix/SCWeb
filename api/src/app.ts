import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Database } from './db/index.js';
import { getCorsOrigins, type Env } from './env.js';
import { csrfMiddleware } from './middleware/csrf.js';
import { errorHandler } from './middleware/error-handler.js';
import { identityMiddleware } from './middleware/identity.js';
import { loggingMiddleware } from './middleware/logging.js';
import { rateLimitMiddleware } from './middleware/rate-limit.js';
import { requestIdMiddleware } from './middleware/request-id.js';
import { healthRoutes } from './routes/health.js';
import type { AppVariables } from './types/context.js';

type CreateAppOptions = {
	env: Env;
	db: Database;
};

export function createApp({ env, db }: CreateAppOptions) {
	const app = new Hono<{ Variables: AppVariables }>();

	app.use('*', async (c, next) => {
		c.set('env', env);
		c.set('db', db);
		await next();
	});

	app.use(
		'*',
		cors({
			origin: getCorsOrigins(env),
			allowHeaders: ['Authorization', 'Content-Type', 'X-Request-Id', 'Cookie'],
			allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
			credentials: true
		})
	);

	app.use('*', requestIdMiddleware());
	app.use('*', identityMiddleware());
	app.use('*', loggingMiddleware());
	app.use('*', rateLimitMiddleware());
	app.use('*', csrfMiddleware());

	app.route('/', healthRoutes);

	app.onError(errorHandler);

	app.notFound((c) => c.json({ error: 'not_found', message: 'Route not found' }, 404));

	return app;
}

export type AppType = ReturnType<typeof createApp>;
