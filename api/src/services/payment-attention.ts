import { and, eq, sql } from 'drizzle-orm';
import { paiseToRupees } from '../contracts/money.js';
import type { Database } from '../db/index.js';
import { auditLog } from '../db/schema/auditLog.js';
import { storeLog } from '../middleware/logging.js';
import { writeAudit } from './audit.js';
import { renderOrderStatusUpdateEmail } from './email-templates/index.js';
import type { MailService } from './mail.js';

/**
 * A captured Razorpay payment that did not end up as its own fulfilled order or print request.
 * Someone has to refund it in Razorpay or resolve it by hand. Find them with:
 *   select * from audit_log where action = 'payment.requires_refund' order by at desc;
 */
export const PAYMENT_ATTENTION_ACTION = 'payment.requires_refund';

export type PaymentAttentionReason =
	| 'duplicate_capture'
	| 'amount_mismatch'
	| 'entity_not_payable'
	| 'stock_conflict';

export type PaymentAttention = {
	razorpayPaymentId: string;
	razorpayOrderId: string;
	amountPaise: number | null;
	entityType: 'order' | 'print_request';
	/** Cart order ID or print request ID. */
	entityId: string;
	reason: PaymentAttentionReason;
	detectedBy: 'webhook' | 'confirm' | 'reconcile';
	/** Extra facts for whoever resolves it, e.g. the order that was already paid. */
	details?: Record<string, unknown>;
};

const REASON_LABELS: Record<PaymentAttentionReason, string> = {
	duplicate_capture: 'Paid twice. Another payment already covers this order or request.',
	amount_mismatch: 'The amount paid does not match the current order total.',
	entity_not_payable: 'The order or request could not take a payment in its current state.',
	stock_conflict: 'Paid, but an item sold out before stock could be reserved.'
};

function sendAttentionEmail(mail: MailService, attention: PaymentAttention): void {
	try {
		mail.dispatch(PAYMENT_ATTENTION_ACTION, async () => {
			const amount =
				attention.amountPaise == null
					? 'Unknown'
					: `₹${paiseToRupees(attention.amountPaise).toLocaleString('en-IN')} (${attention.amountPaise} paise)`;
			const template = renderOrderStatusUpdateEmail({
				siteUrl: mail.siteUrl,
				title: 'Payment needs attention',
				preheader: `Razorpay payment ${attention.razorpayPaymentId} was captured but not fulfilled.`,
				intro:
					'This payment was captured but not fulfilled. Refund it in Razorpay or resolve it by hand.',
				orderId: attention.entityId,
				statusLabel: 'Needs attention',
				details: [
					{ label: 'Reason', value: REASON_LABELS[attention.reason] },
					{ label: 'Razorpay payment ID', value: attention.razorpayPaymentId },
					{ label: 'Razorpay order ID', value: attention.razorpayOrderId },
					{ label: 'Amount', value: amount },
					{
						label: attention.entityType === 'order' ? 'Cart order ID' : 'Print request ID',
						value: attention.entityId
					},
					{ label: 'Detected by', value: attention.detectedBy }
				]
			});
			mail.send(mail.ordersInbox, template, {
				razorpayPaymentId: attention.razorpayPaymentId,
				reason: attention.reason
			});
		});
	} catch (error) {
		storeLog('error', 'payment.attention.mail_failed', {
			razorpayPaymentId: attention.razorpayPaymentId,
			error: error instanceof Error ? error.message : String(error)
		});
	}
}

/**
 * Durably records a captured payment that needs a refund or manual handling, then e-mails the
 * orders inbox. Pass the root database handle: call this after any transaction that could roll
 * back has finished. Idempotent per Razorpay payment ID; returns false when already recorded.
 */
export async function recordPaymentAttention(
	db: Database,
	mail: MailService | undefined,
	attention: PaymentAttention
): Promise<boolean> {
	const recorded = await db.transaction(async (tx) => {
		// Serialises the webhook and the browser confirm reporting the same payment.
		await tx.execute(
			sql`select pg_advisory_xact_lock(hashtext(${`payment_attention:${attention.razorpayPaymentId}`}))`
		);

		const [existing] = await tx
			.select({ id: auditLog.id })
			.from(auditLog)
			.where(
				and(
					eq(auditLog.entityType, attention.entityType),
					eq(auditLog.entityId, attention.entityId),
					eq(auditLog.action, PAYMENT_ATTENTION_ACTION),
					sql`${auditLog.providerIds}->>'razorpayPaymentId' = ${attention.razorpayPaymentId}`
				)
			)
			.limit(1);
		if (existing) return false;

		await writeAudit(tx, {
			actorUserId: null,
			actorClientId: null,
			entityType: attention.entityType,
			entityId: attention.entityId,
			action: PAYMENT_ATTENTION_ACTION,
			providerIds: {
				razorpayOrderId: attention.razorpayOrderId,
				razorpayPaymentId: attention.razorpayPaymentId
			},
			meta: {
				reason: attention.reason,
				detectedBy: attention.detectedBy,
				amountPaise: attention.amountPaise,
				...(attention.details ?? {})
			}
		});
		return true;
	});

	if (!recorded) return false;

	storeLog('error', 'payment.requires_refund', {
		razorpayPaymentId: attention.razorpayPaymentId,
		razorpayOrderId: attention.razorpayOrderId,
		amountPaise: attention.amountPaise,
		entityType: attention.entityType,
		entityId: attention.entityId,
		reason: attention.reason,
		detectedBy: attention.detectedBy
	});

	if (mail) sendAttentionEmail(mail, attention);
	return true;
}
