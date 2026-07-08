import * as Sentry from '@sentry/node';
import { serve } from '@hono/node-server';
import { createApp } from './app.js';
import { createDb } from './db/index.js';
import { loadEnv } from './env.js';
import { loadEnvFiles } from './loadEnvFiles.js';
import { scrubSentryEvent } from './sentry-scrub.js';

loadEnvFiles();

if (process.env.SENTRY_DSN) {
	Sentry.init({
		dsn: process.env.SENTRY_DSN,
		tracesSampleRate: 0,
		beforeSend: scrubSentryEvent
	});
}

process.env.SUPABASE_URL ??= process.env.PUBLIC_SUPABASE_URL;
process.env.SUPABASE_ANON_KEY ??= process.env.PUBLIC_SUPABASE_KEY;
process.env.DATABASE_URL ??= process.env.POSTGRES_URL;

const env = loadEnv();
const { db, close } = createDb(env);
const app = createApp({ env, db });

const server = serve(
	{
		fetch: app.fetch,
		port: env.API_PORT
	},
	(info) => {
		console.log(
			JSON.stringify({
				level: 'info',
				message: 'api.started',
				timestamp: new Date().toISOString(),
				port: info.port,
				nodeEnv: env.NODE_ENV
			})
		);
	}
);

async function shutdown(signal: string) {
	console.log(
		JSON.stringify({
			level: 'info',
			message: 'api.shutdown',
			timestamp: new Date().toISOString(),
			signal
		})
	);

	server.close();
	await close();
	process.exit(0);
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
