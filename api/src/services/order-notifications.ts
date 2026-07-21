import { eq } from 'drizzle-orm';
import { paiseToRupees } from '../contracts/money.js';
import type { Database } from '../db/index.js';
import { orderItems } from '../db/schema/orderItems.js';
import { orders } from '../db/schema/orders.js';
import { printrequests } from '../db/schema/printrequests.js';
import { products } from '../db/schema/products.js';
import {
	renderOrderReceivedEmail,
	renderOrderStatusUpdateEmail,
	renderPrintQuoteRequestedEmail
} from './email-templates/index.js';
import type { MailService, RenderedEmail } from './mail.js';
import { storeLog } from '../middleware/logging.js';
import {
	formatBytes,
	formatDimensions,
	buildPrintMetadataDetails,
	buildPrintOptionDetails,
	parsePrintModelData
} from './print-request-email.js';
import { getPrintRequestDisplayName, parsePrintModelMetadata } from './print-files.js';

type PrintParties = {
	userId: string;
	creatorId: string;
};

type PrintStatusNotification = {
	action: 'quote' | 'decline' | 'cancel' | 'shipped' | 'complete';
	amountInr?: number;
	trackingId?: string;
	trackingLink?: string;
	courier?: string;
	reason?: string;
	initiatedBy?: 'user' | 'maker';
};

function buildPrintStatusTemplate(
	mail: MailService,
	printRequestId: string,
	input: {
		title: string;
		preheader: string;
		intro: string;
		statusLabel: string;
		details?: Array<{ label: string; value: string }>;
		ctaHref: string;
	}
): RenderedEmail {
	return renderOrderStatusUpdateEmail({
		siteUrl: mail.siteUrl,
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

async function resolvePrintPartyEmails(
	mail: MailService,
	parties: PrintParties
): Promise<{ userEmail: string | null; makerEmail: string | null }> {
	const emails = await mail.resolveUserEmails([parties.userId, parties.creatorId]);
	return {
		userEmail: emails.get(parties.userId) ?? null,
		makerEmail: emails.get(parties.creatorId) ?? null
	};
}

function sendPrintStatusEmails(
	mail: MailService,
	partyEmails: { userEmail: string | null; makerEmail: string | null },
	copies: {
		user?: RenderedEmail;
		maker?: RenderedEmail;
		inbox: RenderedEmail;
	},
	meta: Record<string, unknown>
): void {
	mail.send(mail.ordersInbox, copies.inbox, meta);

	if (copies.user) {
		mail.send(partyEmails.userEmail, copies.user, meta);
	}

	if (copies.maker) {
		mail.send(partyEmails.makerEmail, copies.maker, meta);
	}
}

export function notifyOrderReceived(db: Database, mail: MailService, orderId: string): void {
	mail.dispatch('order.received', async () => {
		const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
		if (!order) {
			return;
		}

		const customerEmail = await mail.resolveUserEmail(order.userId, order.address);
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
		const makerEmails = await mail.resolveUserEmails(makerIds);
		const addresses = order.address as {
			shipping?: { name?: string };
		} | null;

		const customerTemplate = renderOrderReceivedEmail({
			siteUrl: mail.siteUrl,
			orderId: order.id,
			customerName: addresses?.shipping?.name,
			items: lines.map((line) => ({
				name: line.productName,
				qty: line.qty,
				priceInr: paiseToRupees(line.unitPricePaise)
			})),
			subtotalInr: paiseToRupees(order.subtotalPaise),
			deliveryFeeInr: paiseToRupees(order.deliveryFeePaise),
			totalInr: paiseToRupees(order.totalPaise),
			ordersUrl: `${mail.siteUrl}/user/profile/orders`
		});

		const inboxTemplate = renderOrderStatusUpdateEmail({
			siteUrl: mail.siteUrl,
			title: 'New order placed',
			preheader: `Order ${order.id} was placed.`,
			intro: 'A new storefront order was placed and payment was confirmed.',
			orderId: order.id,
			statusLabel: 'Paid',
			details: [
				{
					label: 'Customer',
					value: addresses?.shipping?.name ?? customerEmail ?? 'Unknown'
				},
				{
					label: 'Total',
					value: `₹${paiseToRupees(order.totalPaise).toLocaleString('en-IN')}`
				}
			],
			cta: {
				label: 'View orders',
				href: `${mail.siteUrl}/user/profile/orders`
			}
		});

		const makerTemplate = renderOrderStatusUpdateEmail({
			siteUrl: mail.siteUrl,
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
				{
					label: 'Total',
					value: `₹${paiseToRupees(order.totalPaise).toLocaleString('en-IN')}`
				}
			]
		});

		const meta = { orderId: order.id };
		mail.send(mail.ordersInbox, inboxTemplate, meta);
		mail.send(customerEmail, customerTemplate, meta);

		for (const makerEmail of makerEmails.values()) {
			mail.send(makerEmail, makerTemplate, meta);
		}
	});
}

export function notifyPrintQuoteRequested(
	db: Database,
	mail: MailService,
	printRequestId: string,
	parties: PrintParties,
	context?: {
		previewImageBytes?: Uint8Array;
	}
): void {
	mail.dispatch('print.quote_requested', async () => {
		storeLog('info', 'mail.notify.start', {
			event: 'print.quote_requested',
			printRequestId,
			smtpConfigured: mail.isConfigured,
			ordersInbox: mail.ordersInbox
		});

		const [row] = await db
			.select({
				model: printrequests.model,
				modelMetadata: printrequests.modelMetadata,
				modelData: printrequests.modelData
			})
			.from(printrequests)
			.where(eq(printrequests.id, printRequestId))
			.limit(1);

		const filename = getPrintRequestDisplayName(row?.model, row?.modelMetadata);
		const metadata = parsePrintModelMetadata(row?.modelMetadata);
		const modelData = parsePrintModelData(row?.modelData);
		const metadataDetails = buildPrintMetadataDetails(filename, metadata);
		const printOptions = buildPrintOptionDetails(modelData);
		const hasPreview = Boolean(context?.previewImageBytes && context.previewImageBytes.byteLength > 0);
		const meta = { printRequestId, filename };

		const partyEmails = await resolvePrintPartyEmails(mail, parties);

		const shared = {
			siteUrl: mail.siteUrl,
			printRequestId,
			filename,
			statusLabel: 'Requested',
			metadata: metadataDetails,
			printOptions,
			hasPreview
		};

		const previewOptions = { previewBytes: context?.previewImageBytes };

		sendPrintStatusEmails(
			mail,
			partyEmails,
			{
				inbox: renderPrintQuoteRequestedEmail(
					{
						...shared,
						audience: 'inbox',
						preheader: `A new 3D print quote request was submitted for ${filename}.`,
						intro: 'A customer submitted a new 3D print quote request.',
						cta: {
							label: 'View request',
							href: `${mail.siteUrl}/3dp-portal/maker/${printRequestId}`
						}
					},
					previewOptions
				),
				user: renderPrintQuoteRequestedEmail(
					{
						...shared,
						audience: 'user',
						preheader: `Your quote request for ${filename} is with the maker.`,
						intro: 'We received your 3D print quote request and shared it with the maker.',
						cta: {
							label: 'View request',
							href: `${mail.siteUrl}/3dp-portal/user/${printRequestId}`
						}
					},
					previewOptions
				),
				maker: renderPrintQuoteRequestedEmail(
					{
						...shared,
						audience: 'maker',
						preheader: `A customer requested a quote for ${filename}.`,
						intro: 'A customer submitted a 3D print quote request for you to review.',
						cta: {
							label: 'Review request',
							href: `${mail.siteUrl}/3dp-portal/maker/${printRequestId}`
						}
					},
					previewOptions
				)
			},
			meta
		);
	});
}

export function notifyPrintPaymentReceived(
	db: Database,
	mail: MailService,
	printRequestId: string,
	parties: PrintParties,
	amountInr: number
): void {
	mail.dispatch('print.payment_received', async () => {
		const partyEmails = await resolvePrintPartyEmails(mail, parties);
		const details = [{ label: 'Amount', value: `₹${amountInr.toLocaleString('en-IN')}` }];
		const meta = { printRequestId, amountInr };

		sendPrintStatusEmails(
			mail,
			partyEmails,
			{
				inbox: buildPrintStatusTemplate(mail, printRequestId, {
					title: 'Print order payment received',
					preheader: 'A 3D print request was paid.',
					intro: 'Payment was received for a 3D print request.',
					statusLabel: 'Paid',
					details,
					ctaHref: `${mail.siteUrl}/3dp-portal/maker/${printRequestId}`
				}),
				user: buildPrintStatusTemplate(mail, printRequestId, {
					title: 'Print order payment received',
					preheader: 'Your 3D print payment was confirmed.',
					intro: 'We received your payment for a 3D print request. The maker will begin production.',
					statusLabel: 'Paid',
					details,
					ctaHref: `${mail.siteUrl}/3dp-portal/user/${printRequestId}`
				}),
				maker: buildPrintStatusTemplate(mail, printRequestId, {
					title: 'Print order paid',
					preheader: 'A customer paid for a 3D print request.',
					intro: 'The customer paid for a 3D print request. You can begin production.',
					statusLabel: 'Paid',
					details,
					ctaHref: `${mail.siteUrl}/3dp-portal/maker/${printRequestId}`
				})
			},
			meta
		);
	});
}

export function notifyPrintStatusUpdate(
	db: Database,
	mail: MailService,
	printRequestId: string,
	parties: PrintParties,
	notification: PrintStatusNotification
): void {
	mail.dispatch(`print.status.${notification.action}`, async () => {
		storeLog('info', 'mail.notify.start', {
			event: `print.status.${notification.action}`,
			printRequestId,
			smtpConfigured: mail.isConfigured,
			ordersInbox: mail.ordersInbox,
			initiatedBy: notification.initiatedBy
		});

		const partyEmails = await resolvePrintPartyEmails(mail, parties);
		const copies = getPrintStatusCopies(mail, notification, printRequestId);

		sendPrintStatusEmails(mail, partyEmails, copies, {
			printRequestId,
			action: notification.action,
			initiatedBy: notification.initiatedBy,
			recipients: {
				user: partyEmails.userEmail,
				maker: partyEmails.makerEmail,
				inbox: mail.ordersInbox
			}
		});
	});
}

function getPrintStatusCopies(
	mail: MailService,
	notification: PrintStatusNotification,
	printRequestId: string
): {
	inbox: RenderedEmail;
	user?: RenderedEmail;
	maker?: RenderedEmail;
} {
	const userHref = `${mail.siteUrl}/3dp-portal/user/${printRequestId}`;
	const makerHref = `${mail.siteUrl}/3dp-portal/maker/${printRequestId}`;

	switch (notification.action) {
		case 'quote': {
			const details = notification.amountInr
				? [{ label: 'Quote amount', value: `₹${notification.amountInr.toLocaleString('en-IN')}` }]
				: [];

			return {
				inbox: buildPrintStatusTemplate(mail, printRequestId, {
					title: 'Print request quoted',
					preheader: 'A maker sent a quote for a print request.',
					intro: 'A maker sent a quote for a 3D print request.',
					statusLabel: 'Quoted',
					details,
					ctaHref: makerHref
				}),
				user: buildPrintStatusTemplate(mail, printRequestId, {
					title: 'Quote received',
					preheader: 'A maker sent a quote for your print request.',
					intro: 'A maker reviewed your 3D print request and shared a quote.',
					statusLabel: 'Quoted',
					details,
					ctaHref: userHref
				}),
				maker: buildPrintStatusTemplate(mail, printRequestId, {
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
				inbox: buildPrintStatusTemplate(mail, printRequestId, {
					title: 'Print request shipped',
					preheader: 'A 3D print order was shipped.',
					intro: 'A 3D print request was marked as shipped.',
					statusLabel: 'Shipped',
					details,
					ctaHref: makerHref
				}),
				user: buildPrintStatusTemplate(mail, printRequestId, {
					title: 'Order shipped',
					preheader: 'Your 3D print order is on the way.',
					intro: 'Your print request has been shipped.',
					statusLabel: 'Shipped',
					details,
					ctaHref: userHref
				}),
				maker: buildPrintStatusTemplate(mail, printRequestId, {
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
				inbox: buildPrintStatusTemplate(mail, printRequestId, {
					title: 'Print request completed',
					preheader: 'A 3D print order was completed.',
					intro: 'A 3D print request was marked complete.',
					statusLabel: 'Completed',
					ctaHref: makerHref
				}),
				user: buildPrintStatusTemplate(mail, printRequestId, {
					title: 'Order completed',
					preheader: 'You marked your 3D print order complete.',
					intro: 'You marked this print request as complete. Thanks for using Selfcrafted.',
					statusLabel: 'Completed',
					ctaHref: userHref
				}),
				maker: buildPrintStatusTemplate(mail, printRequestId, {
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
			const userCancelled = notification.initiatedBy === 'user';

			return {
				inbox: buildPrintStatusTemplate(mail, printRequestId, {
					title: 'Print request cancelled',
					preheader: userCancelled
						? 'A customer cancelled a print request.'
						: 'A maker declined a print request.',
					intro: userCancelled
						? 'A customer cancelled their 3D print quote request.'
						: 'A maker declined a 3D print quote request.',
					statusLabel: 'Cancelled',
					details,
					ctaHref: makerHref
				}),
				user: buildPrintStatusTemplate(mail, printRequestId, {
					title: userCancelled ? 'Request cancelled' : 'Request declined by maker',
					preheader: userCancelled
						? 'Your print request was cancelled.'
						: 'The maker declined your print request.',
					intro: userCancelled
						? 'You cancelled this 3D print quote request.'
						: 'The maker declined this 3D print quote request.',
					statusLabel: 'Cancelled',
					details,
					ctaHref: userHref
				}),
				maker: buildPrintStatusTemplate(mail, printRequestId, {
					title: userCancelled ? 'Request cancelled by customer' : 'Request declined',
					preheader: userCancelled
						? 'A customer cancelled their print request.'
						: 'You declined a print request.',
					intro: userCancelled
						? 'The customer cancelled this 3D print quote request.'
						: 'You declined this 3D print quote request.',
					statusLabel: 'Cancelled',
					details,
					ctaHref: makerHref
				})
			};
		}
	}
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
