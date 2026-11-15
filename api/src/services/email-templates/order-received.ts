import { BRAND, renderEmailLayout, renderLabelValue, renderParagraph } from './layout.js';

export type OrderLineItem = {
	name: string;
	qty: number;
	priceInr: number;
};

export type OrderReceivedTemplateInput = {
	siteUrl: string;
	orderId: string;
	customerName?: string;
	items: OrderLineItem[];
	subtotalInr: number;
	deliveryFeeInr: number;
	totalInr: number;
	ordersUrl: string;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Short order reference shown to buyers: first 8 characters of `orders.id`, upper case.
 * Must match `formatOrderDisplayId` in src/lib/formatOrderDisplayId.ts (site and order list).
 */
export function formatOrderRef(orderId: string): string {
	const value = orderId.trim();
	if (UUID_RE.test(value)) return value.slice(0, 8).toUpperCase();
	return (value.length > 8 ? value.slice(0, 8) : value).toUpperCase();
}

function formatInr(amount: number): string {
	return `₹${amount.toLocaleString('en-IN')}`;
}

export function renderOrderReceivedEmail(input: OrderReceivedTemplateInput) {
	const orderRef = formatOrderRef(input.orderId);
	const greeting = input.customerName ? `Hi ${input.customerName},` : 'Hi there,';

	const itemsHtml = input.items
		.map(
			(item) =>
				`<tr>
					<td style="padding:8px 0;color:${BRAND.text};font-size:14px;">${escape(item.name)} × ${item.qty}</td>
					<td style="padding:8px 0;color:${BRAND.text};font-size:14px;text-align:right;">${formatInr(item.priceInr * item.qty)}</td>
				</tr>`
		)
		.join('');

	const bodyHtml = [
		renderParagraph(greeting),
		renderParagraph(
			'Thanks for your order. We have received your payment and started processing it.'
		),
		renderLabelValue('Order ID', orderRef),
		`<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:16px 0 8px;border-top:1px solid ${BRAND.border};border-bottom:1px solid ${BRAND.border};">
			${itemsHtml}
		</table>`,
		renderLabelValue('Subtotal', formatInr(input.subtotalInr)),
		renderLabelValue('Delivery', formatInr(input.deliveryFeeInr)),
		renderLabelValue('Total paid', formatInr(input.totalInr))
	].join('');

	const { html, text } = renderEmailLayout({
		siteUrl: input.siteUrl,
		title: 'Order received',
		preheader: `Your order ${orderRef} is confirmed.`,
		bodyHtml,
		cta: { label: 'View orders', href: input.ordersUrl }
	});

	return {
		subject: `Order received: ${orderRef}`,
		html,
		text
	};
}

function escape(value: string): string {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;');
}
