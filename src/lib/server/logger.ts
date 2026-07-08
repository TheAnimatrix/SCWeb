type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogFields = Record<string, unknown>;

export interface LoggerContext {
	requestId?: string;
	route?: string;
	userId?: string;
	clientId?: string;
}

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

export function createLogger(context: LoggerContext = {}) {
	const base: LogFields = {};

	if (context.requestId) {
		base.requestId = context.requestId;
	}
	if (context.route) {
		base.route = context.route;
	}
	if (context.userId) {
		base.userId = context.userId;
	}
	if (context.clientId) {
		base.clientId = context.clientId;
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
