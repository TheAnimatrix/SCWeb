import { sql } from 'drizzle-orm';
import {
	check,
	index,
	integer,
	jsonb,
	pgTable,
	primaryKey,
	text,
	timestamp,
	unique,
	uuid
} from 'drizzle-orm/pg-core';
import type { CheckoutAddress } from '../../contracts/address.js';
import { products } from './products.js';

export const INTEREST_CAMPAIGN_STATUS_VALUES = ['open', 'launched', 'closed'] as const;

/**
 * One row per interest-check listing. A product is an interest check while its campaign is
 * `open`; `launched` makes it an ordinary listing, `closed` means it will not be produced.
 * Service-role only (RLS enabled, no policies).
 */
export const interestCampaigns = pgTable(
	'interest_campaigns',
	{
		productId: uuid('product_id')
			.primaryKey()
			.references(() => products.id, { onDelete: 'cascade' }),
		targetCount: integer('target_count').notNull(),
		shipsWithinDays: integer('ships_within_days').notNull(),
		status: text('status').notNull().default('open'),
		note: text('note'),
		launchedAt: timestamp('launched_at', { withTimezone: true, mode: 'string' }),
		closedAt: timestamp('closed_at', { withTimezone: true, mode: 'string' }),
		launchMessage: text('launch_message'),
		/** Set the first time anyone joins; from then on the commitment cannot change. */
		commitmentLockedAt: timestamp('commitment_locked_at', { withTimezone: true, mode: 'string' }),
		/** People e-mailed the launch or closure notice (closure deletes their row afterwards). */
		notifiedCount: integer('notified_count').notNull().default(0),
		createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
			.notNull()
			.defaultNow()
	},
	(table) => [
		check(
			'interest_campaigns_status_check',
			sql`${table.status} IN ('open', 'launched', 'closed')`
		),
		check('interest_campaigns_target_count_check', sql`${table.targetCount} BETWEEN 1 AND 10000`),
		check(
			'interest_campaigns_ships_within_days_check',
			sql`${table.shipsWithinDays} BETWEEN 1 AND 365`
		),
		check('interest_campaigns_note_check', sql`char_length(${table.note}) <= 500`),
		check(
			'interest_campaigns_launch_message_check',
			sql`char_length(${table.launchMessage}) <= 1000`
		)
	]
);

/**
 * People who said they would buy an interest-check listing. Holds personal data (name, e-mail,
 * phone, delivery address): only staff endpoints return it. Service-role only.
 */
export const productInterests = pgTable(
	'product_interests',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		productId: uuid('product_id')
			.notNull()
			.references(() => products.id, { onDelete: 'cascade' }),
		userId: uuid('user_id').notNull(),
		name: text('name').notNull(),
		email: text('email').notNull(),
		phone: text('phone').notNull(),
		address: jsonb('address').$type<CheckoutAddress>().notNull(),
		createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
			.notNull()
			.defaultNow(),
		/** Unused since leaving deletes the row; kept so the previous release keeps working. */
		withdrawnAt: timestamp('withdrawn_at', { withTimezone: true, mode: 'string' }),
		notifiedAt: timestamp('notified_at', { withTimezone: true, mode: 'string' })
	},
	(table) => [
		unique('product_interests_product_id_user_id_key').on(table.productId, table.userId),
		index('product_interests_product_id_idx').on(table.productId),
		index('product_interests_user_id_idx').on(table.userId)
	]
);

/**
 * When each person was last sent the "you're on the list" e-mail for a listing, so leaving and
 * re-joining cannot be used to generate e-mail. No personal details. Service-role only.
 */
export const interestJoinNotices = pgTable(
	'interest_join_notices',
	{
		productId: uuid('product_id')
			.notNull()
			.references(() => products.id, { onDelete: 'cascade' }),
		userId: uuid('user_id').notNull(),
		sentAt: timestamp('sent_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow()
	},
	(table) => [
		primaryKey({ name: 'interest_join_notices_pkey', columns: [table.productId, table.userId] })
	]
);
