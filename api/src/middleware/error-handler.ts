import * as Sentry from '@sentry/node';
import type { ErrorHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { createLogger } from './logging.js';
import type { AppVariables } from '../types/context.js';
import { pgErrorCode } from '../lib/pg-errors.js';

/**
 * drizzle-orm wraps driver errors, so `error.message` is only "Failed query: ...". The reason
 * (pool exhausted, constraint, timeout) is on `.cause`. Log it, or the log says nothing useful.
 */
function errorCause(error: unknown): { cause?: string; code?: string } {
	const cause = error instanceof Error ? error.cause : undefined;
	if (cause == null) return {};
	const code = pgErrorCode(error);
	return {
		cause: cause instanceof Error ? cause.message : String(cause),
		...(code ? { code } : {})
	};
}

export function reportError(error: unknown, context: Record<string, unknown>) {
	console.error(
		JSON.stringify({
			level: 'error',
			message: 'monitoring.hook',
			timestamp: new Date().toISOString(),
			error: error instanceof Error ? error.message : String(error),
			...errorCause(error),
			...context
		})
	);

	if (process.env.SENTRY_DSN) {
		Sentry.captureException(error, { extra: context });
	}
}

export const errorHandler: ErrorHandler<{ Variables: AppVariables }> = (error, c) => {
	const log = createLogger(c);

	if (error instanceof HTTPException) {
		log.warn('request.http_exception', {
			status: error.status,
			reason: error.message
		});

		return error.getResponse();
	}

	log.error('request.unhandled_exception', {
		error: error instanceof Error ? error.message : String(error),
		...errorCause(error)
	});

	reportError(error, {
		requestId: c.get('requestId'),
		path: c.req.path,
		method: c.req.method
	});

	return c.json({ error: 'internal_error', message: 'Unexpected server error' }, 500);
};
