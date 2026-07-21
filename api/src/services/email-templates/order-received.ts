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

function formatInr(amount: number): string {
	return `₹${amount.toLocaleString('en-IN')}`;
}

export function renderOrderReceivedEmail(input: OrderReceivedTemplateInput) {
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
		renderParagraph('Thanks for your order. We have received your payment and started processing it.'),
		renderLabelValue('Order ID', input.orderId),
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
		preheader: `Your order ${input.orderId} is confirmed.`,
		bodyHtml,
		cta: { label: 'View orders', href: input.ordersUrl }
	});

	return {
		subject: `Order received — ${input.orderId.slice(0, 8)}`,
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
