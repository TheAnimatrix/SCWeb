import * as Sentry from '@sentry/sveltekit';
import { env } from '$env/dynamic/public';
import type { HandleClientError } from '@sveltejs/kit';

const sentryDsn = env.PUBLIC_SENTRY_DSN;

if (sentryDsn) {
	Sentry.init({
		dsn: sentryDsn,
		tracesSampleRate: 0
	});
}

export const handleError: HandleClientError = sentryDsn ? Sentry.handleErrorWithSentry() : () => {};
