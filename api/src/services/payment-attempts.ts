import { and, desc, eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import {
	PAYMENT_ATTEMPT_KIND,
	PAYMENT_ATTEMPT_STATUS,
	PAYMENT_PROVIDER,
	type PaymentAttemptKind
} from '../contracts/payment-attempts.js';
import type { DbExecutor } from '../db/index.js';
import { paymentAttempts } from '../db/schema/paymentAttempts.js';

export async function findPaymentAttemptByProviderOrderId(
	db: DbExecutor,
	providerOrderId: string
) {
	const [row] = await db
		.select()
		.from(paymentAttempts)
		.where(eq(paymentAttempts.providerOrderId, providerOrderId))
		.limit(1);

	return row ?? null;
}

export async function findPaymentAttemptById(db: DbExecutor, id: string) {
	const [row] = await db
		.select()
		.from(paymentAttempts)
		.where(eq(paymentAttempts.id, id))
		.limit(1);

	return row ?? null;
}

export async function createPaymentAttempt(
	db: DbExecutor,
	params: {
		kind: PaymentAttemptKind;
		entityId: string;
		providerOrderId: string;
		amountPaise: number;
		currency?: string;
	}
) {
	const [row] = await db
		.insert(paymentAttempts)
		.values({
			kind: params.kind,
			entityId: params.entityId,
			provider: PAYMENT_PROVIDER.RAZORPAY,
			providerOrderId: params.providerOrderId,
			amountPaise: params.amountPaise,
			currency: params.currency ?? 'INR',
			status: PAYMENT_ATTEMPT_STATUS.PENDING
		})
		.returning();

	return row!;
}

export async function markPaymentAttemptPaid(
	db: DbExecutor,
	providerOrderId: string,
	providerPaymentId: string
) {
	const updated = await db
		.update(paymentAttempts)
		.set({
			status: PAYMENT_ATTEMPT_STATUS.PAID,
			providerPaymentId,
			updatedAt: sql`now()`
		})
		.where(
			eq(paymentAttempts.providerOrderId, providerOrderId)
		)
		.returning({ id: paymentAttempts.id });

	return updated[0] ?? null;
}

export async function markPaymentAttemptFailed(
	db: DbExecutor,
	providerOrderId: string,
	failureReason?: string
) {
	const updated = await db
		.update(paymentAttempts)
		.set({
			status: PAYMENT_ATTEMPT_STATUS.FAILED,
			failureReason: failureReason ?? null,
			updatedAt: sql`now()`
		})
		.where(eq(paymentAttempts.providerOrderId, providerOrderId))
		.returning({ id: paymentAttempts.id });

	return updated[0] ?? null;
}

export function resolveProviderOrderId(
	activeAttempt: { providerOrderId: string } | null | undefined
): string | null {
	return activeAttempt?.providerOrderId ?? null;
}

export async function findActivePaymentAttemptForEntity(
	db: DbExecutor,
	kind: PaymentAttemptKind,
	entityId: string
) {
	const [row] = await db
		.select()
		.from(paymentAttempts)
		.where(
			and(
				eq(paymentAttempts.kind, kind),
				eq(paymentAttempts.entityId, entityId),
				eq(paymentAttempts.status, PAYMENT_ATTEMPT_STATUS.PENDING)
			)
		)
		.orderBy(desc(paymentAttempts.createdAt))
		.limit(1);

	return row ?? null;
}

export { PAYMENT_ATTEMPT_KIND, PAYMENT_ATTEMPT_STATUS, PAYMENT_PROVIDER };
