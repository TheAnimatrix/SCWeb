import * as Sentry from '@sentry/sveltekit';
import { SUPABASE_KEY } from '$env/static/private';
import { PUBLIC_IS_PRODUCTION, PUBLIC_SUPABASE_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public';
import { env } from '$env/dynamic/private';
import { createServerClient } from '@supabase/ssr';
import { sequence } from '@sveltejs/kit/hooks';
import type { Handle, HandleServerError } from '@sveltejs/kit';
import { v4 as uuidv4 } from 'uuid';
import { CLIENT_ID_COOKIE_NAME } from '$lib/constants/cookies';
import { createLogger } from '$lib/server/logger';
import { scrubSentryEvent } from '$lib/sentry-scrub';
import { sanitizeRequestId } from '$lib/server/request-id';

const sentryDsn = env.SENTRY_DSN;

if (sentryDsn) {
	Sentry.init({
		dsn: sentryDsn,
		tracesSampleRate: 0,
		beforeSend: scrubSentryEvent
	});
}

function generateUniqueId(): string {
	return uuidv4();
}

const isProduction = PUBLIC_IS_PRODUCTION !== 'false';

const appHandle: Handle = async ({ event, resolve }) => {
	const requestId = sanitizeRequestId(event.request.headers.get('x-request-id'));
	event.locals.requestId = requestId;

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

	const log = createLogger({
		requestId,
		route: event.route.id ?? undefined,
		clientId
	});
	const startedAt = Date.now();
	log.info('request.start');

	try {
		const response = await resolve(event, {
			filterSerializedResponseHeaders(name) {
				return name === 'content-range';
			}
		});

		log.info('request.end', {
			status: response.status,
			durationMs: Date.now() - startedAt
		});

		return response;
	} catch (error) {
		log.error('request.error', {
			error: error instanceof Error ? error.message : String(error)
		});
		throw error;
	}
};

export const handle = sentryDsn ? sequence(Sentry.sentryHandle(), appHandle) : appHandle;

export const handleError: HandleServerError = ({ error, event, status, message }) => {
	const log = createLogger({
		requestId: event.locals.requestId,
		route: event.route?.id ?? undefined,
		clientId: event.locals.clientId
	});

	log.error('request.unhandled_exception', {
		error: error instanceof Error ? error.message : String(error),
		status,
		message
	});

	if (sentryDsn) {
		Sentry.captureException(error, {
			tags: {
				requestId: event.locals.requestId ?? 'unknown'
			},
			extra: {
				route: event.route?.id,
				status,
				message
			}
		});
	}
};
