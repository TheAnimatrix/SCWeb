import { integer, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const constants = pgTable('constants', {
	id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
	key: text('key'),
	value: jsonb('value'),
	createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow()
});
