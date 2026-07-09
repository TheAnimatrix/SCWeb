import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './users.js';

/** Platform maker approval states — distinct from PrintingCrafters 3DP approval. */
export const MAKER_APPROVAL_STATES = ['pending', 'approved', 'rejected'] as const;
export type MakerApprovalState = (typeof MAKER_APPROVAL_STATES)[number];

/**
 * Platform maker profile. One row per user who applies to sell/build on Selfcrafted.
 * `id` matches `users.id` so existing `maker_id` / `creator_id` references stay stable.
 *
 * PrintingCrafters (Fabbly 3DP) is a capability subset — requires an approved maker row.
 */
export const makers = pgTable('makers', {
	id: uuid('id')
		.primaryKey()
		.references(() => users.id),
	displayName: text('display_name'),
	approvedState: text('approved_state').notNull().default('pending'),
	/** General maker application payload (future onboarding form). */
	application: jsonb('application'),
	approvedAt: timestamp('approved_at', { withTimezone: true }),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});
