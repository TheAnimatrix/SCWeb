import { createClient } from '@supabase/supabase-js';
import { getCookie } from 'hono/cookie';
import type { MiddlewareHandler } from 'hono';
import type { AppVariables } from '../types/context.js';

export const identityMiddleware = (): MiddlewareHandler<{ Variables: AppVariables }> => {
	return async (c, next) => {
		const env = c.get('env');
		const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
			auth: {
				autoRefreshToken: false,
				persistSession: false
			}
		});

		const authorization = c.req.header('authorization');
		const bearerToken = authorization?.startsWith('Bearer ')
			? authorization.slice('Bearer '.length)
			: null;

		let userId: string | null = null;
		let user = null;

		if (bearerToken) {
			const { data, error } = await supabase.auth.getUser(bearerToken);
			if (!error && data.user) {
				user = data.user;
				userId = data.user.id;
			}
		}

		const clientId = getCookie(c, env.CLIENT_ID_COOKIE_NAME) ?? null;

		c.set('user', user);
		c.set('actor', {
			userId,
			clientId
		});

		await next();
	};
};
