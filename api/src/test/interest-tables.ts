import type { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const interestMigrationSql = readFileSync(
	resolve(import.meta.dirname, '../../drizzle/0012_interest_checks.sql'),
	'utf8'
);

/** Creates `interest_campaigns` and `product_interests` from the real migration (needs `products`). */
export async function applyInterestMigration(client: PGlite): Promise<void> {
	const statements = interestMigrationSql
		.split('--> statement-breakpoint')
		.map((statement) => statement.trim())
		.filter(Boolean);
	for (const statement of statements) {
		await client.exec(statement);
	}
}
