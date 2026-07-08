import { date, integer, pgTable, primaryKey, uuid } from 'drizzle-orm/pg-core';

export const uploadQuota = pgTable(
	'upload_quota',
	{
		userId: uuid('user_id').notNull(),
		quotaDate: date('quota_date').notNull().defaultNow(),
		count: integer('count').notNull().default(0)
	},
	(table) => [primaryKey({ columns: [table.userId, table.quotaDate] })]
);
