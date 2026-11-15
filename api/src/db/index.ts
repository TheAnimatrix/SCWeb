import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import type { Env } from '../env.js';
import * as schema from './schema/index.js';

export type Database = ReturnType<typeof createDb>['db'];

/** Database or an open transaction — helpers that only read/write rows accept this. */
export type DbExecutor = Pick<Database, 'select' | 'insert' | 'update' | 'delete'>;

export function createDb(env: Env) {
	const client = postgres(env.DATABASE_URL, {
		// The Supabase session pooler allows 15 clients in total. During a deploy the old and
		// new API run side by side for a moment, so two pools must fit under that limit with
		// room left for a local dev server or a SQL console. At 10 each they did not, and
		// requests failed with EMAXCONNSESSION for a few seconds on every deploy.
		max: 6,
		// Give connections back when traffic stops, so an idle instance holds none.
		idle_timeout: 20,
		connect_timeout: 10,
		prepare: false
	});

	const db = drizzle(client, { schema });

	return {
		db,
		close: async () => {
			await client.end({ timeout: 5 });
		}
	};
}
