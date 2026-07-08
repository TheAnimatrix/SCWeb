import { SUPABASE_KEY } from '$env/static/private';
import { PUBLIC_IS_PRODUCTION, PUBLIC_SUPABASE_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public';
import { createServerClient } from '@supabase/ssr';
import type { Handle } from '@sveltejs/kit';
import { v4 as uuidv4 } from 'uuid';
import { CLIENT_ID_COOKIE_NAME } from '$lib/constants/cookies';

function generateUniqueId(): string {
	return uuidv4();
}

const isProduction = PUBLIC_IS_PRODUCTION !== 'false';

export const handle: Handle = async ({ event, resolve }) => {
	const clientIdCookie = event.cookies.get(CLIENT_ID_COOKIE_NAME);
	const clientId = clientIdCookie || generateUniqueId();

	event.locals.clientId = clientId;
	event.cookies.set(CLIENT_ID_COOKIE_NAME, clientId, {
		path: '/',
		httpOnly: true,
		secure: isProduction,
		sameSite: 'lax',
		maxAge: 60 * 60 * 24 * 365
	});

	// User-scoped client: anon key + cookies (RLS applies).
	event.locals.supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_KEY, {
		cookies: {
			getAll: () => event.cookies.getAll(),
			setAll: (cookiesToSet) => {
				cookiesToSet.forEach(({ name, value, options }) => {
					event.cookies.set(name, value, { ...options, path: '/' });
				});
			}
		}
	});

	// Privileged client: service role, server-only, no cookie session.
	event.locals.supabaseAdmin = createServerClient(PUBLIC_SUPABASE_URL, SUPABASE_KEY, {
		cookies: {
			getAll: () => [],
			setAll: () => {}
		}
	});

	event.locals.safeGetSession = async () => {
		const {
			data: { session }
		} = await event.locals.supabase.auth.getSession();
		if (!session) {
			return { session: null, user: null };
		}
		const {
			data: { user },
			error
		} = await event.locals.supabase.auth.getUser();
		if (error) {
			return { session: null, user: null };
		}
		return { session, user };
	};

	return resolve(event, {
		filterSerializedResponseHeaders(name) {
			return name === 'content-range';
		}
	});
};
