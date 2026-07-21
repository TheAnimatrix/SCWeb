import { eq, sql } from 'drizzle-orm';
import type { DbExecutor } from '../db/index.js';
import { printrequests } from '../db/schema/printrequests.js';
import { printRequestEvents } from '../db/schema/printRequestEvents.js';
import type { PrintRequestEvent } from './print-payments.js';

export type InsertPrintRequestEventParams = {
	printRequestId: string;
	type: string;
	actorUserId?: string | null;
	actorRole: string;
	amountPaise?: number | null;
	providerOrderId?: string | null;
	providerPaymentId?: string | null;
	reason?: string | null;
	metadata?: Record<string, unknown> | null;
};

export async function insertPrintRequestEvent(
	db: DbExecutor,
	params: InsertPrintRequestEventParams
) {
	const [row] = await db
		.insert(printRequestEvents)
		.values({
			printRequestId: params.printRequestId,
			type: params.type,
			actorUserId: params.actorUserId ?? null,
			actorRole: params.actorRole,
			amountPaise: params.amountPaise ?? null,
			providerOrderId: params.providerOrderId ?? null,
			providerPaymentId: params.providerPaymentId ?? null,
			reason: params.reason ?? null,
			metadata: params.metadata ?? null
		})
		.returning();

	return row!;
}

/** Atomically append one legacy JSONB event for UI compatibility without read-modify-write races. */
export async function appendLegacyPrintRequestEvent(
	db: DbExecutor,
	printRequestId: string,
	event: PrintRequestEvent
) {
	const fragment = JSON.stringify([event]);
	await db
		.update(printrequests)
		.set({
			events: sql`COALESCE(${printrequests.events}, '[]'::jsonb) || ${fragment}::jsonb`,
			lastUpdated: sql`now()`
		})
		.where(eq(printrequests.id, printRequestId));
}
