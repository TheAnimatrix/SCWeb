import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import type { Env } from '../env.js';
import * as schema from './schema/index.js';

export type Database = ReturnType<typeof createDb>['db'];

/** Database or an open transaction — helpers that only read/write rows accept this. */
export type DbExecutor = Pick<Database, 'select' | 'insert' | 'update' | 'delete'>;

export function createDb(env: Env) {
	const client = postgres(env.DATABASE_URL, {
		max: 10,
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
