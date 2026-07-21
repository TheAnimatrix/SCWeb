import { jsonb, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { makers } from './makers.js';

export const MAKER_CAPABILITY_KEYS = ['physical_goods', 'printing_3d', 'digital_goods'] as const;
export type MakerCapabilityKey = (typeof MAKER_CAPABILITY_KEYS)[number];

export const MAKER_CAPABILITY_STATES = ['requested', 'approved', 'revoked', 'suspended'] as const;
export type MakerCapabilityState = (typeof MAKER_CAPABILITY_STATES)[number];

export const makerCapabilities = pgTable(
	'maker_capabilities',
	{
		makerId: uuid('maker_id')
			.notNull()
			.references(() => makers.id, { onDelete: 'cascade' }),
		capabilityKey: text('capability_key').notNull(),
		state: text('state').notNull().default('requested'),
		config: jsonb('config'),
		grantedAt: timestamp('granted_at', { withTimezone: true }),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [primaryKey({ columns: [table.makerId, table.capabilityKey] })]
);
