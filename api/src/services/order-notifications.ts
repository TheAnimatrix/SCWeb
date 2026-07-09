import { eq } from 'drizzle-orm';
import type { CheckoutAddress } from '../contracts/address.js';
import type { CheckoutOrderAddresses } from '../contracts/checkout.js';
import { getSiteUrl, type Env } from '../env.js';
import type { Database } from '../db/index.js';
import { orderItems } from '../db/schema/orderItems.js';
import { orders } from '../db/schema/orders.js';
import { printrequests } from '../db/schema/printrequests.js';
import { users } from '../db/schema/users.js';
import {
	renderOrderReceivedEmail,
	renderOrderStatusUpdateEmail
} from './email-templates/index.js';
import type { EmailService } from './email.js';

function asOrderAddresses(stored: unknown): CheckoutOrderAddresses | null {
	if (!stored || typeof stored !== 'object' || Array.isArray(stored)) {
		return null;
	}

	const record = stored as Record<string, unknown>;
	if ('shipping' in record && 'billing' in record) {
		return {
			shipping: record.shipping as CheckoutAddress,
			billing: record.billing as CheckoutAddress
		};
	}

	return {
		shipping: stored as CheckoutAddress,
		billing: stored as CheckoutAddress
	};
}

export async function resolveRecipientEmail(
	db: Database,
	userId: string | null | undefined,
	address: unknown
): Promise<string | null> {
	if (userId) {
		const [user] = await db
			.select({ email: users.email })
			.from(users)
			.where(eq(users.id, userId))
			.limit(1);

		if (user?.email) {
			return user.email;
		}
	}

	const addresses = asOrderAddresses(address);
	return addresses?.shipping.email ?? addresses?.billing.email ?? null;
}

export function notifyOrderReceived(
	db: Database,
	emailService: EmailService,
	env: Env,
	orderId: string
): void {
	void (async () => {
		const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
		if (!order) return;

		const to = await resolveRecipientEmail(db, order.userId, order.address);
		if (!to) return;

		const lines = await db
			.select({
				qty: orderItems.qty,
				productName: orderItems.productName,
				unitPrice: orderItems.unitPrice
			})
			.from(orderItems)
			.where(eq(orderItems.orderId, orderId));

		const siteUrl = getSiteUrl(env);
		const addresses = asOrderAddresses(order.address);
		const template = renderOrderReceivedEmail({
			siteUrl,
			orderId: order.id,
			customerName: addresses?.shipping.name,
			items: lines.map((line) => ({
				name: line.productName,
				qty: line.qty,
				priceInr: line.unitPrice
			})),
			subtotalInr: order.subtotal,
			deliveryFeeInr: order.deliveryFee,
			totalInr: order.total,
			ordersUrl: `${siteUrl}/user/profile/orders`
		});

		emailService.sendSafe({
			to,
			subject: template.subject,
			html: template.html,
			text: template.text
		});
	})().catch(() => undefined);
}

export function notifyPrintPaymentReceived(
	db: Database,
	emailService: EmailService,
	env: Env,
	printRequestId: string,
	userId: string,
	amountInr: number
): void {
	void (async () => {
		const to = await resolveRecipientEmail(db, userId, null);
		if (!to) return;

		const siteUrl = getSiteUrl(env);
		const template = renderOrderStatusUpdateEmail({
			siteUrl,
			title: 'Print order payment received',
			preheader: 'Your 3D print payment was confirmed.',
			intro: 'We received your payment for a 3D print request. The maker will begin production.',
			orderId: printRequestId,
			statusLabel: 'Paid',
			details: [{ label: 'Amount', value: `₹${amountInr.toLocaleString('en-IN')}` }],
			cta: {
				label: 'View request',
				href: `${siteUrl}/3dp-portal/user/${printRequestId}`
			}
		});

		emailService.sendSafe({
			to,
			subject: template.subject,
			html: template.html,
			text: template.text
		});
	})().catch(() => undefined);
}

type PrintStatusNotification = {
	action: 'quote' | 'decline' | 'cancel' | 'shipped' | 'complete';
	amountInr?: number;
	trackingId?: string;
	trackingLink?: string;
	courier?: string;
	reason?: string;
};

export function notifyPrintStatusUpdate(
	db: Database,
	emailService: EmailService,
	env: Env,
	printRequestId: string,
	recipientUserId: string,
	notification: PrintStatusNotification
): void {
	void (async () => {
		const to = await resolveRecipientEmail(db, recipientUserId, null);
		if (!to) return;

		const siteUrl = getSiteUrl(env);
		const copy = getPrintStatusCopy(notification);
		const template = renderOrderStatusUpdateEmail({
			siteUrl,
			title: copy.title,
			preheader: copy.preheader,
			intro: copy.intro,
			orderId: printRequestId,
			statusLabel: copy.statusLabel,
			details: copy.details,
			cta: {
				label: 'View request',
				href: `${siteUrl}/3dp-portal/user/${printRequestId}`
			}
		});

		emailService.sendSafe({
			to,
			subject: template.subject,
			html: template.html,
			text: template.text
		});
	})().catch(() => undefined);
}

function getPrintStatusCopy(notification: PrintStatusNotification): {
	title: string;
	preheader: string;
	intro: string;
	statusLabel: string;
	details: Array<{ label: string; value: string }>;
} {
	switch (notification.action) {
		case 'quote':
			return {
				title: 'Quote received',
				preheader: 'A maker sent a quote for your print request.',
				intro: 'A maker reviewed your 3D print request and shared a quote.',
				statusLabel: 'Quoted',
				details: notification.amountInr
					? [{ label: 'Quote amount', value: `₹${notification.amountInr.toLocaleString('en-IN')}` }]
					: []
			};
		case 'shipped':
			return {
				title: 'Order shipped',
				preheader: 'Your 3D print order is on the way.',
				intro: 'Your print request has been shipped.',
				statusLabel: 'Shipped',
				details: [
					...(notification.courier
						? [{ label: 'Courier', value: notification.courier }]
						: []),
					...(notification.trackingId
						? [{ label: 'Tracking ID', value: notification.trackingId }]
						: []),
					...(notification.trackingLink
						? [{ label: 'Tracking link', value: notification.trackingLink }]
						: [])
				]
			};
		case 'complete':
			return {
				title: 'Order completed',
				preheader: 'Your 3D print order is complete.',
				intro: 'Your print request has been marked complete. Thanks for using Selfcrafted.',
				statusLabel: 'Completed',
				details: []
			};
		case 'decline':
		case 'cancel':
			return {
				title: 'Request cancelled',
				preheader: 'A print request was cancelled.',
				intro: 'A print request was cancelled.',
				statusLabel: 'Cancelled',
				details: notification.reason ? [{ label: 'Reason', value: notification.reason }] : []
			};
	}
}

export async function getPrintRequestRecipient(
	db: Database,
	printRequestId: string
): Promise<{ userId: string; creatorId: string } | null> {
	const [row] = await db
		.select({ userId: printrequests.userId, creatorId: printrequests.creatorId })
		.from(printrequests)
		.where(eq(printrequests.id, printRequestId))
		.limit(1);

	if (!row?.userId || !row.creatorId) {
		return null;
	}

	return { userId: row.userId, creatorId: row.creatorId };
}
