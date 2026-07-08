import { serve } from '@hono/node-server';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { createApp } from './app.js';
import { createDb } from './db/index.js';
import { loadEnv } from './env.js';

config({ path: resolve(process.cwd(), '../.env') });
config({ path: resolve(process.cwd(), '.env') });

process.env.SUPABASE_URL ??= process.env.PUBLIC_SUPABASE_URL;
process.env.SUPABASE_ANON_KEY ??= process.env.PUBLIC_SUPABASE_KEY;

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

export { app };
export type { AppType } from './app.js';
