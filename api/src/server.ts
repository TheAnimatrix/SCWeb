import * as Sentry from '@sentry/node';
import { serve } from '@hono/node-server';
import { createApp } from './app.js';
import { createDb } from './db/index.js';
import { loadEnv, isSmtpConfigured, getSmtpTransportSummary } from './env.js';
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
process.env.SMTP_PASS ??= process.env.SMTP_PASSWORD;

const env = loadEnv();
const { db, close } = createDb(env);
const app = createApp({ env, db });

const smtpConfigured = isSmtpConfigured(env);
const smtpTransport = smtpConfigured ? getSmtpTransportSummary(env) : null;
console.log(
	JSON.stringify({
		level: smtpConfigured ? 'info' : 'error',
		message: 'api.mail',
		timestamp: new Date().toISOString(),
		smtpConfigured,
		smtpTransport,
		ordersInbox: env.ORDERS_INBOX_EMAIL,
		emailFrom: env.EMAIL_FROM,
		hasSmtpHost: Boolean(env.SMTP_HOST),
		hasSmtpPass: Boolean(env.SMTP_PASS),
		siteUrl: env.SITE_URL ?? env.PUBLIC_SITE_URL ?? null
	})
);

if (!smtpConfigured && env.NODE_ENV === 'production') {
	console.error(
		JSON.stringify({
			level: 'error',
			message: 'api.mail.misconfigured',
			timestamp: new Date().toISOString(),
			hint: 'Set SMTP_HOST, SMTP_USER, SMTP_PASS, EMAIL_FROM in Dokploy runtime env or transactional emails will be skipped'
		})
	);
}

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
