import type { ErrorHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { createLogger } from './logging.js';
import type { AppVariables } from '../types/context.js';

export function reportError(error: unknown, context: Record<string, unknown>) {
	// Hook for Sentry / OpenTelemetry / other monitoring providers.
	console.error(
		JSON.stringify({
			level: 'error',
			message: 'monitoring.hook',
			timestamp: new Date().toISOString(),
			error: error instanceof Error ? error.message : String(error),
			...context
		})
	);
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
		error: error instanceof Error ? error.message : String(error)
	});

	reportError(error, {
		requestId: c.get('requestId'),
		path: c.req.path,
		method: c.req.method
	});

	return c.json({ error: 'internal_error', message: 'Unexpected server error' }, 500);
};
