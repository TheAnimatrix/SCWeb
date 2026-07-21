import { resolve } from 'node:path';
import { defineConfig } from 'drizzle-kit';
import { loadEnvFiles } from './src/loadEnvFiles.js';

loadEnvFiles();

process.env.DATABASE_URL ??= process.env.POSTGRES_URL;

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
	throw new Error('DATABASE_URL (or POSTGRES_URL) is required for drizzle-kit');
}

export default defineConfig({
	schema: './src/db/schema/index.ts',
	out: './drizzle',
	dialect: 'postgresql',
	dbCredentials: {
		url: databaseUrl
	},
	schemaFilter: ['public']
});
