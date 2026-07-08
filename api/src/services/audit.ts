import type { DbExecutor } from '../db/index.js';
import { auditLog } from '../db/schema/auditLog.js';

// Audit rows are written in the same transaction as the business transition; a
// failure here rolls back the entire transition by design.
export type AuditEntityType = 'order' | 'print_request' | 'cart';

export interface AuditEntry {
	actorUserId?: string | null;
	actorClientId?: string | null;
	entityType: AuditEntityType;
	entityId: string;
	action: string;
	fromState?: string | null;
	toState?: string | null;
	providerIds?: Record<string, string> | null;
	meta?: Record<string, unknown> | null;
}

const AUDIT_REASON_MAX_LENGTH = 200;

export function truncateAuditReason(reason?: string): string | undefined {
	if (!reason) return undefined;
	return reason.length > AUDIT_REASON_MAX_LENGTH
		? reason.slice(0, AUDIT_REASON_MAX_LENGTH)
		: reason;
}

export async function writeAudit(tx: DbExecutor, entry: AuditEntry) {
	await tx.insert(auditLog).values({
		actorUserId: entry.actorUserId ?? null,
		actorClientId: entry.actorClientId ?? null,
		entityType: entry.entityType,
		entityId: entry.entityId,
		action: entry.action,
		fromState: entry.fromState ?? null,
		toState: entry.toState ?? null,
		providerIds: entry.providerIds ?? null,
		meta: entry.meta ?? null
	});
}
