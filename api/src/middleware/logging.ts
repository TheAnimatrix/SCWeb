import type { Context } from 'hono';
import type { MiddlewareHandler } from 'hono';
import type { AppVariables } from '../types/context.js';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogFields = Record<string, unknown>;

function writeLog(level: LogLevel, message: string, fields: LogFields) {
	const payload = {
		level,
		message,
		timestamp: new Date().toISOString(),
		...fields
	};

	const line = JSON.stringify(payload);

	switch (level) {
		case 'error':
			console.error(line);
			break;
		case 'warn':
			console.warn(line);
			break;
		default:
			console.log(line);
	}
}

export function createLogger(c: Context<{ Variables: AppVariables }>) {
	const base: LogFields = {
		requestId: c.get('requestId'),
		method: c.req.method,
		path: c.req.path
	};

	const actor = c.get('actor');
	if (actor.userId) {
		base.userId = actor.userId;
	}
	if (actor.clientId) {
		base.clientId = actor.clientId;
	}

	return {
		debug: (message: string, fields: LogFields = {}) =>
			writeLog('debug', message, { ...base, ...fields }),
		info: (message: string, fields: LogFields = {}) =>
			writeLog('info', message, { ...base, ...fields }),
		warn: (message: string, fields: LogFields = {}) =>
			writeLog('warn', message, { ...base, ...fields }),
		error: (message: string, fields: LogFields = {}) =>
			writeLog('error', message, { ...base, ...fields })
	};
}

export function logCartMutation(
	c: Context<{ Variables: AppVariables }>,
	level: LogLevel,
	message: string,
	fields: LogFields = {}
) {
	writeLog(level, message, {
		requestId: c.get('requestId'),
		...fields
	});
}

export function logCheckoutTransition(
	c: Context<{ Variables: AppVariables }>,
	level: LogLevel,
	message: string,
	fields: LogFields = {}
) {
	writeLog(level, message, {
		requestId: c.get('requestId'),
		...fields
	});
}

export const loggingMiddleware = (): MiddlewareHandler<{ Variables: AppVariables }> => {
	return async (c, next) => {
		const startedAt = Date.now();
		const log = createLogger(c);

		log.info('request.start');

		try {
			await next();
		} finally {
			log.info('request.end', {
				status: c.res.status,
				durationMs: Date.now() - startedAt
			});
		}
	};
};
