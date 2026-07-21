import {
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	uuid
} from 'drizzle-orm/pg-core';
import { makers } from './makers.js';
import { users } from './users.js';

export const MAKER_APPLICATION_STATUSES = ['pending', 'approved', 'rejected', 'withdrawn'] as const;
export type MakerApplicationStatus = (typeof MAKER_APPLICATION_STATUSES)[number];

export const makerApplications = pgTable('maker_applications', {
	id: uuid('id').primaryKey().defaultRandom(),
	userId: uuid('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	version: integer('version').notNull().default(1),
	answers: jsonb('answers').notNull().default({}),
	requestedCapabilities: text('requested_capabilities').array().notNull().default([]),
	status: text('status').notNull().default('pending'),
	reviewerId: uuid('reviewer_id').references(() => users.id),
	reviewNotes: text('review_notes'),
	reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export const listingReviews = pgTable('listing_reviews', {
	id: uuid('id').primaryKey().defaultRandom(),
	productId: uuid('product_id').notNull(),
	makerId: uuid('maker_id')
		.notNull()
		.references(() => makers.id, { onDelete: 'cascade' }),
	fromState: text('from_state'),
	toState: text('to_state').notNull(),
	reviewerId: uuid('reviewer_id').references(() => users.id),
	notes: text('notes'),
	snapshot: jsonb('snapshot'),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});
