import { renderEmailLayout, renderLabelValue, renderParagraph, renderPreviewImage } from './layout.js';

export type PrintQuoteRequestedTemplateInput = {
	siteUrl: string;
	audience: 'inbox' | 'user' | 'maker';
	printRequestId: string;
	filename: string;
	intro: string;
	preheader: string;
	statusLabel: string;
	printOptions?: Array<{ label: string; value: string }>;
	metadata?: Array<{ label: string; value: string }>;
	previewImageDataUri?: string;
	cta: { label: string; href: string };
};

function audienceTitle(input: PrintQuoteRequestedTemplateInput): string {
	return input.filename;
}

export function renderPrintQuoteRequestedEmail(input: PrintQuoteRequestedTemplateInput) {
	const title = audienceTitle(input);

	const detailsHtml = [
		renderLabelValue('Reference', input.printRequestId),
		renderLabelValue('Status', input.statusLabel),
		...(input.metadata ?? []).map((detail) => renderLabelValue(detail.label, detail.value)),
		...(input.printOptions ?? []).map((detail) => renderLabelValue(detail.label, detail.value))
	].join('');

	const previewHtml = input.previewImageDataUri
		? renderPreviewImage(input.previewImageDataUri, `${input.filename} preview`)
		: '';

	const bodyHtml = [renderParagraph(input.intro), previewHtml, detailsHtml].join('');

	const { html, text } = renderEmailLayout({
		siteUrl: input.siteUrl,
		title,
		preheader: input.preheader,
		bodyHtml,
		cta: input.cta
	});

	return {
		subject: `${title} — ${input.printRequestId.slice(0, 8)}`,
		html,
		text
	};
}
