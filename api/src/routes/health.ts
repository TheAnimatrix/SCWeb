import { Hono } from 'hono';
import { sql } from 'drizzle-orm';
import type { AppVariables } from '../types/context.js';

export const healthRoutes = new Hono<{ Variables: AppVariables }>();

healthRoutes.get('/health', (c) => {
	return c.json({
		ok: true,
		service: '@scweb/api',
		requestId: c.get('requestId')
	});
});

healthRoutes.get('/health/db', async (c) => {
	const db = c.get('db');

	try {
		await db.execute(sql`select 1 as ok`);
		return c.json({
			ok: true,
			database: 'connected',
			requestId: c.get('requestId')
		});
	} catch (error) {
		const env = c.get('env');
		const message =
			env.NODE_ENV === 'production'
				? 'Database check failed'
				: error instanceof Error
					? error.message
					: 'Database check failed';

		return c.json(
			{
				ok: false,
				database: 'unavailable',
				requestId: c.get('requestId'),
				message
			},
			503
		);
	}
});
