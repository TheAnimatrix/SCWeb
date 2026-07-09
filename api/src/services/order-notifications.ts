import { eq, inArray } from 'drizzle-orm';
import type { CheckoutAddress } from '../contracts/address.js';
import type { CheckoutOrderAddresses } from '../contracts/checkout.js';
import { paiseToRupees } from '../contracts/money.js';
import { getSiteUrl, type Env } from '../env.js';
import type { Database } from '../db/index.js';
import { orderItems } from '../db/schema/orderItems.js';
import { orders } from '../db/schema/orders.js';
import { printrequests } from '../db/schema/printrequests.js';
import { products } from '../db/schema/products.js';
import { users } from '../db/schema/users.js';
import {
	renderOrderReceivedEmail,
	renderOrderStatusUpdateEmail
} from './email-templates/index.js';
import type { EmailMessage, EmailService } from './email.js';

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

export function getOrdersInboxEmail(env: Env): string {
	return env.ORDERS_INBOX_EMAIL;
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

async function resolveUserEmails(db: Database, userIds: string[]): Promise<Map<string, string>> {
	const uniqueIds = [...new Set(userIds.filter(Boolean))];
	if (uniqueIds.length === 0) {
		return new Map();
	}

	const rows = await db
		.select({ id: users.id, email: users.email })
		.from(users)
		.where(inArray(users.id, uniqueIds));

	return new Map(
		rows
			.filter((row): row is { id: string; email: string } => Boolean(row.email))
			.map((row) => [row.id, row.email])
	);
}

function sendTemplateToRecipients(
	emailService: EmailService,
	recipients: Array<string | null | undefined>,
	template: Pick<EmailMessage, 'subject' | 'html' | 'text'>
): void {
	const uniqueRecipients = [...new Set(recipients.filter((email): email is string => Boolean(email)))];

	for (const to of uniqueRecipients) {
		emailService.sendSafe({ to, ...template });
	}
}

type PrintParties = {
	userId: string;
	creatorId: string;
};

async function resolvePrintPartyEmails(
	db: Database,
	parties: PrintParties
): Promise<{ userEmail: string | null; makerEmail: string | null }> {
	const emails = await resolveUserEmails(db, [parties.userId, parties.creatorId]);
	return {
		userEmail: emails.get(parties.userId) ?? null,
		makerEmail: emails.get(parties.creatorId) ?? null
	};
}

function sendPrintStatusEmails(
	emailService: EmailService,
	env: Env,
	partyEmails: { userEmail: string | null; makerEmail: string | null },
	copies: {
		user?: Pick<EmailMessage, 'subject' | 'html' | 'text'>;
		maker?: Pick<EmailMessage, 'subject' | 'html' | 'text'>;
		inbox: Pick<EmailMessage, 'subject' | 'html' | 'text'>;
	}
): void {
	sendTemplateToRecipients(emailService, [getOrdersInboxEmail(env)], copies.inbox);

	if (copies.user) {
		sendTemplateToRecipients(emailService, [partyEmails.userEmail], copies.user);
	}

	if (copies.maker) {
		sendTemplateToRecipients(emailService, [partyEmails.makerEmail], copies.maker);
	}
}

function buildPrintStatusTemplate(
	env: Env,
	printRequestId: string,
	input: {
		title: string;
		preheader: string;
		intro: string;
		statusLabel: string;
		details?: Array<{ label: string; value: string }>;
		ctaHref: string;
	}
) {
	const siteUrl = getSiteUrl(env);
	return renderOrderStatusUpdateEmail({
		siteUrl,
		title: input.title,
		preheader: input.preheader,
		intro: input.intro,
		orderId: printRequestId,
		statusLabel: input.statusLabel,
		details: input.details,
		cta: {
			label: 'View request',
			href: input.ctaHref
		}
	});
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

		const customerEmail = await resolveRecipientEmail(db, order.userId, order.address);
		const lines = await db
			.select({
				qty: orderItems.qty,
				productName: orderItems.productName,
				unitPricePaise: orderItems.unitPricePaise,
				productUid: products.uid
			})
			.from(orderItems)
			.leftJoin(products, eq(products.id, orderItems.productId))
			.where(eq(orderItems.orderId, orderId));

		const makerIds = [
			...new Set(
				lines.map((line) => line.productUid).filter((uid): uid is string => Boolean(uid))
			)
		];
		const makerEmails = await resolveUserEmails(db, makerIds);

		const siteUrl = getSiteUrl(env);
		const addresses = asOrderAddresses(order.address);
		const customerTemplate = renderOrderReceivedEmail({
			siteUrl,
			orderId: order.id,
			customerName: addresses?.shipping.name,
			items: lines.map((line) => ({
				name: line.productName,
				qty: line.qty,
				priceInr: paiseToRupees(line.unitPricePaise)
			})),
			subtotalInr: paiseToRupees(order.subtotalPaise),
			deliveryFeeInr: paiseToRupees(order.deliveryFeePaise),
			totalInr: paiseToRupees(order.totalPaise),
			ordersUrl: `${siteUrl}/user/profile/orders`
		});

		const inboxTemplate = renderOrderStatusUpdateEmail({
			siteUrl,
			title: 'New order placed',
			preheader: `Order ${order.id} was placed.`,
			intro: 'A new storefront order was placed and payment was confirmed.',
			orderId: order.id,
			statusLabel: 'Paid',
			details: [
				{ label: 'Customer', value: addresses?.shipping.name ?? customerEmail ?? 'Unknown' },
				{ label: 'Total', value: `₹${paiseToRupees(order.totalPaise).toLocaleString('en-IN')}` }
			],
			cta: {
				label: 'View orders',
				href: `${siteUrl}/user/profile/orders`
			}
		});

		const makerTemplate = renderOrderStatusUpdateEmail({
			siteUrl,
			title: 'New order for your product',
			preheader: `Order ${order.id} includes your product.`,
			intro: 'A customer placed an order that includes your product.',
			orderId: order.id,
			statusLabel: 'Paid',
			details: [
				{
					label: 'Items',
					value: lines.map((line) => `${line.productName} × ${line.qty}`).join(', ')
				},
				{ label: 'Total', value: `₹${paiseToRupees(order.totalPaise).toLocaleString('en-IN')}` }
			]
		});

		sendTemplateToRecipients(emailService, [getOrdersInboxEmail(env)], inboxTemplate);

		if (customerEmail) {
			sendTemplateToRecipients(emailService, [customerEmail], customerTemplate);
		}

		for (const makerEmail of makerEmails.values()) {
			sendTemplateToRecipients(emailService, [makerEmail], makerTemplate);
		}
	})().catch(() => undefined);
}

export function notifyPrintQuoteRequested(
	db: Database,
	emailService: EmailService,
	env: Env,
	printRequestId: string,
	parties: PrintParties
): void {
	void (async () => {
		const partyEmails = await resolvePrintPartyEmails(db, parties);
		const siteUrl = getSiteUrl(env);

		const inboxTemplate = buildPrintStatusTemplate(env, printRequestId, {
			title: 'Print quote requested',
			preheader: 'A new 3D print quote request was submitted.',
			intro: 'A customer submitted a new 3D print quote request.',
			statusLabel: 'Requested',
			ctaHref: `${siteUrl}/3dp-portal/maker/${printRequestId}`
		});

		const userTemplate = buildPrintStatusTemplate(env, printRequestId, {
			title: 'Quote request submitted',
			preheader: 'Your 3D print quote request is with the maker.',
			intro: 'We received your 3D print quote request and shared it with the maker.',
			statusLabel: 'Requested',
			ctaHref: `${siteUrl}/3dp-portal/user/${printRequestId}`
		});

		const makerTemplate = buildPrintStatusTemplate(env, printRequestId, {
			title: 'New print quote request',
			preheader: 'A customer requested a quote from you.',
			intro: 'A customer submitted a 3D print quote request for you to review.',
			statusLabel: 'Requested',
			ctaHref: `${siteUrl}/3dp-portal/maker/${printRequestId}`
		});

		sendPrintStatusEmails(emailService, env, partyEmails, {
			inbox: inboxTemplate,
			user: userTemplate,
			maker: makerTemplate
		});
	})().catch(() => undefined);
}

export function notifyPrintPaymentReceived(
	db: Database,
	emailService: EmailService,
	env: Env,
	printRequestId: string,
	parties: PrintParties,
	amountInr: number
): void {
	void (async () => {
		const partyEmails = await resolvePrintPartyEmails(db, parties);
		const siteUrl = getSiteUrl(env);
		const details = [{ label: 'Amount', value: `₹${amountInr.toLocaleString('en-IN')}` }];

		const inboxTemplate = buildPrintStatusTemplate(env, printRequestId, {
			title: 'Print order payment received',
			preheader: 'A 3D print request was paid.',
			intro: 'Payment was received for a 3D print request.',
			statusLabel: 'Paid',
			details,
			ctaHref: `${siteUrl}/3dp-portal/maker/${printRequestId}`
		});

		const userTemplate = buildPrintStatusTemplate(env, printRequestId, {
			title: 'Print order payment received',
			preheader: 'Your 3D print payment was confirmed.',
			intro: 'We received your payment for a 3D print request. The maker will begin production.',
			statusLabel: 'Paid',
			details,
			ctaHref: `${siteUrl}/3dp-portal/user/${printRequestId}`
		});

		const makerTemplate = buildPrintStatusTemplate(env, printRequestId, {
			title: 'Print order paid',
			preheader: 'A customer paid for a 3D print request.',
			intro: 'The customer paid for a 3D print request. You can begin production.',
			statusLabel: 'Paid',
			details,
			ctaHref: `${siteUrl}/3dp-portal/maker/${printRequestId}`
		});

		sendPrintStatusEmails(emailService, env, partyEmails, {
			inbox: inboxTemplate,
			user: userTemplate,
			maker: makerTemplate
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
	parties: PrintParties,
	notification: PrintStatusNotification
): void {
	void (async () => {
		const partyEmails = await resolvePrintPartyEmails(db, parties);
		const copies = getPrintStatusCopies(env, notification, printRequestId);

		sendPrintStatusEmails(emailService, env, partyEmails, {
			inbox: copies.inbox,
			user: copies.user,
			maker: copies.maker
		});
	})().catch(() => undefined);
}

function getPrintStatusCopies(
	env: Env,
	notification: PrintStatusNotification,
	printRequestId: string
): {
	inbox: ReturnType<typeof renderOrderStatusUpdateEmail>;
	user?: ReturnType<typeof renderOrderStatusUpdateEmail>;
	maker?: ReturnType<typeof renderOrderStatusUpdateEmail>;
} {
	const siteUrl = getSiteUrl(env);
	const userHref = `${siteUrl}/3dp-portal/user/${printRequestId}`;
	const makerHref = `${siteUrl}/3dp-portal/maker/${printRequestId}`;

	switch (notification.action) {
		case 'quote': {
			const details = notification.amountInr
				? [{ label: 'Quote amount', value: `₹${notification.amountInr.toLocaleString('en-IN')}` }]
				: [];

			return {
				inbox: buildPrintStatusTemplate(env, printRequestId, {
					title: 'Print request quoted',
					preheader: 'A maker sent a quote for a print request.',
					intro: 'A maker sent a quote for a 3D print request.',
					statusLabel: 'Quoted',
					details,
					ctaHref: makerHref
				}),
				user: buildPrintStatusTemplate(env, printRequestId, {
					title: 'Quote received',
					preheader: 'A maker sent a quote for your print request.',
					intro: 'A maker reviewed your 3D print request and shared a quote.',
					statusLabel: 'Quoted',
					details,
					ctaHref: userHref
				}),
				maker: buildPrintStatusTemplate(env, printRequestId, {
					title: 'Quote submitted',
					preheader: 'Your quote was sent to the customer.',
					intro: 'Your quote was sent to the customer for this print request.',
					statusLabel: 'Quoted',
					details,
					ctaHref: makerHref
				})
			};
		}
		case 'shipped': {
			const details = [
				...(notification.courier ? [{ label: 'Courier', value: notification.courier }] : []),
				...(notification.trackingId
					? [{ label: 'Tracking ID', value: notification.trackingId }]
					: []),
				...(notification.trackingLink
					? [{ label: 'Tracking link', value: notification.trackingLink }]
					: [])
			];

			return {
				inbox: buildPrintStatusTemplate(env, printRequestId, {
					title: 'Print request shipped',
					preheader: 'A 3D print order was shipped.',
					intro: 'A 3D print request was marked as shipped.',
					statusLabel: 'Shipped',
					details,
					ctaHref: makerHref
				}),
				user: buildPrintStatusTemplate(env, printRequestId, {
					title: 'Order shipped',
					preheader: 'Your 3D print order is on the way.',
					intro: 'Your print request has been shipped.',
					statusLabel: 'Shipped',
					details,
					ctaHref: userHref
				}),
				maker: buildPrintStatusTemplate(env, printRequestId, {
					title: 'Shipment recorded',
					preheader: 'You marked a print request as shipped.',
					intro: 'You marked this print request as shipped.',
					statusLabel: 'Shipped',
					details,
					ctaHref: makerHref
				})
			};
		}
		case 'complete':
			return {
				inbox: buildPrintStatusTemplate(env, printRequestId, {
					title: 'Print request completed',
					preheader: 'A 3D print order was completed.',
					intro: 'A 3D print request was marked complete.',
					statusLabel: 'Completed',
					ctaHref: makerHref
				}),
				user: buildPrintStatusTemplate(env, printRequestId, {
					title: 'Order completed',
					preheader: 'You marked your 3D print order complete.',
					intro: 'You marked this print request as complete. Thanks for using Selfcrafted.',
					statusLabel: 'Completed',
					ctaHref: userHref
				}),
				maker: buildPrintStatusTemplate(env, printRequestId, {
					title: 'Order completed',
					preheader: 'The customer marked the print order complete.',
					intro: 'The customer marked this print request as complete.',
					statusLabel: 'Completed',
					ctaHref: makerHref
				})
			};
		case 'decline':
		case 'cancel': {
			const details = notification.reason
				? [{ label: 'Reason', value: notification.reason }]
				: [];

			return {
				inbox: buildPrintStatusTemplate(env, printRequestId, {
					title: 'Print request cancelled',
					preheader: 'A print request was cancelled.',
					intro: 'A print request was cancelled.',
					statusLabel: 'Cancelled',
					details,
					ctaHref: makerHref
				}),
				user: buildPrintStatusTemplate(env, printRequestId, {
					title: 'Request cancelled',
					preheader: 'A print request was cancelled.',
					intro: 'This print request was cancelled.',
					statusLabel: 'Cancelled',
					details,
					ctaHref: userHref
				}),
				maker: buildPrintStatusTemplate(env, printRequestId, {
					title: 'Request cancelled',
					preheader: 'A print request was cancelled.',
					intro: 'This print request was cancelled.',
					statusLabel: 'Cancelled',
					details,
					ctaHref: makerHref
				})
			};
		}
	}
}

export function notifyPrintMessageReceived(
	db: Database,
	emailService: EmailService,
	env: Env,
	printRequestId: string,
	recipientUserId: string,
	message: string
): void {
	void (async () => {
		const [row] = await db
			.select({ userId: printrequests.userId })
			.from(printrequests)
			.where(eq(printrequests.id, printRequestId))
			.limit(1);

		if (!row?.userId || row.userId !== recipientUserId) {
			return;
		}

		const to = await resolveRecipientEmail(db, recipientUserId, null);
		if (!to) return;

		const siteUrl = getSiteUrl(env);
		const preview =
			message.length > 240 ? `${message.slice(0, 237).trimEnd()}...` : message;
		const template = renderOrderStatusUpdateEmail({
			siteUrl,
			title: 'New message on your print request',
			preheader: 'You received a new message about your 3D print quote.',
			intro: `You received a new message: "${preview}"`,
			orderId: printRequestId,
			statusLabel: 'Message',
			cta: {
				label: 'View conversation',
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

export async function getPrintRequestRecipient(
	db: Database,
	printRequestId: string
): Promise<PrintParties | null> {
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
