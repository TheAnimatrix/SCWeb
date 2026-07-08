import { index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const auditLog = pgTable(
	'audit_log',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		at: timestamp('at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
		actorUserId: uuid('actor_user_id'),
		actorClientId: text('actor_client_id'),
		entityType: text('entity_type').notNull(),
		entityId: text('entity_id').notNull(),
		action: text('action').notNull(),
		fromState: text('from_state'),
		toState: text('to_state'),
		providerIds: jsonb('provider_ids'),
		meta: jsonb('meta')
	},
	(table) => [
		index('audit_log_entity_type_entity_id_at_idx').on(table.entityType, table.entityId, table.at)
	]
);
