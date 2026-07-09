import { renderEmailLayout, renderLabelValue, renderParagraph } from './layout.js';

export type OrderStatusUpdateTemplateInput = {
	siteUrl: string;
	title: string;
	preheader: string;
	intro: string;
	orderId: string;
	statusLabel: string;
	details?: Array<{ label: string; value: string }>;
	cta?: { label: string; href: string };
};

export function renderOrderStatusUpdateEmail(input: OrderStatusUpdateTemplateInput) {
	const detailsHtml = (input.details ?? [])
		.map((detail) => renderLabelValue(detail.label, detail.value))
		.join('');

	const bodyHtml = [
		renderParagraph(input.intro),
		renderLabelValue('Reference', input.orderId),
		renderLabelValue('Status', input.statusLabel),
		detailsHtml
	].join('');

	const { html, text } = renderEmailLayout({
		siteUrl: input.siteUrl,
		title: input.title,
		preheader: input.preheader,
		bodyHtml,
		cta: input.cta
	});

	return {
		subject: `${input.title} — ${input.orderId.slice(0, 8)}`,
		html,
		text
	};
}
