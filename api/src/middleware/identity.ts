import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getCookie } from 'hono/cookie';
import type { MiddlewareHandler } from 'hono';
import type { Env } from '../env.js';
import { verifyClientIdCookie } from '../lib/client-id.js';
import type { AppVariables } from '../types/context.js';

let supabaseClient: SupabaseClient | null = null;
let supabaseConfigKey: string | null = null;

function getSupabaseClient(env: Env): SupabaseClient {
	const configKey = `${env.SUPABASE_URL}:${env.SUPABASE_ANON_KEY}`;

	if (!supabaseClient || supabaseConfigKey !== configKey) {
		supabaseClient = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
			auth: {
				autoRefreshToken: false,
				persistSession: false
			}
		});
		supabaseConfigKey = configKey;
	}

	return supabaseClient;
}

export const identityMiddleware = (): MiddlewareHandler<{ Variables: AppVariables }> => {
	return async (c, next) => {
		const env = c.get('env');
		const supabase = getSupabaseClient(env);

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

		const rawClientIdCookie = getCookie(c, env.CLIENT_ID_COOKIE_NAME);
		const clientId = verifyClientIdCookie(rawClientIdCookie, env.CLIENT_ID_SIGNING_SECRET);

		c.set('user', user);
		c.set('actor', {
			userId,
			clientId
		});

		await next();
	};
};
