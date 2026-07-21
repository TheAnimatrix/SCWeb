import { sql } from 'drizzle-orm';
import {
	check,
	integer,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid
} from 'drizzle-orm/pg-core';
import {
	PAYMENT_ATTEMPT_KIND,
	PAYMENT_ATTEMPT_STATUS,
	type PaymentAttemptKind,
	type PaymentAttemptStatus
} from '../../contracts/payment-attempts.js';

export const PAYMENT_ATTEMPT_KIND_VALUES = [
	PAYMENT_ATTEMPT_KIND.CART_ORDER,
	PAYMENT_ATTEMPT_KIND.PRINT_REQUEST
] as const;

export const PAYMENT_ATTEMPT_STATUS_VALUES = [
	PAYMENT_ATTEMPT_STATUS.PENDING,
	PAYMENT_ATTEMPT_STATUS.PAID,
	PAYMENT_ATTEMPT_STATUS.FAILED
] as const;

export const paymentAttempts = pgTable(
	'payment_attempts',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		kind: text('kind').notNull().$type<PaymentAttemptKind>(),
		entityId: uuid('entity_id').notNull(),
		provider: text('provider').notNull(),
		providerOrderId: text('provider_order_id').notNull(),
		providerPaymentId: text('provider_payment_id'),
		amountPaise: integer('amount_paise').notNull(),
		currency: text('currency').notNull().default('INR'),
		status: text('status').notNull().$type<PaymentAttemptStatus>(),
		failureReason: text('failure_reason'),
		createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
			.notNull()
			.defaultNow()
	},
	(table) => [
		check(
			'payment_attempts_kind_check',
			sql`kind IN ('cart_order', 'print_request')`
		),
		check(
			'payment_attempts_status_check',
			sql`status IN ('pending', 'paid', 'failed')`
		),
		uniqueIndex('payment_attempts_provider_order_id_unique').on(table.providerOrderId),
		uniqueIndex('payment_attempts_provider_payment_id_paid_unique')
			.on(table.providerPaymentId)
			.where(sql`provider_payment_id IS NOT NULL AND status = 'paid'`)
	]
);
