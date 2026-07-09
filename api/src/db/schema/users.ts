import { integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
	id: uuid('id').primaryKey(),
	username: text('username'),
	tier: text('tier'),
	email: text('email'),
	addresses: jsonb('addresses'),
	crafts: jsonb('crafts'),
	orders: jsonb('orders'),
	quoteDailyLimit: integer('quote_daily_limit'),
	createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull()
});
