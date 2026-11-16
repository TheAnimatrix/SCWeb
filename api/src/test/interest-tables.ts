import type { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const interestMigrations = ['0012_interest_checks.sql', '0013_interest_checks_privacy.sql'].map(
	(file) => readFileSync(resolve(import.meta.dirname, '../../drizzle', file), 'utf8')
);

/** Creates the interest tables from the real migrations (needs `products`). */
export async function applyInterestMigration(client: PGlite): Promise<void> {
	const statements = interestMigrations
		.flatMap((migration) => migration.split('--> statement-breakpoint'))
		.map((statement) => statement.trim())
		.filter(Boolean);
	for (const statement of statements) {
		await client.exec(statement);
	}
}
