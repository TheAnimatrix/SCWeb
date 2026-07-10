import {
	PRINT_PREVIEW_CID,
	renderColorLabelValue,
	renderEmailLayout,
	renderLabelValue,
	renderParagraph,
	renderPreviewImage
} from './layout.js';
import type { EmailInlineAttachment } from '../email.js';
import type { PrintDetail } from '../print-request-email.js';

export type PrintQuoteRequestedTemplateInput = {
	siteUrl: string;
	audience: 'inbox' | 'user' | 'maker';
	printRequestId: string;
	filename: string;
	intro: string;
	preheader: string;
	statusLabel: string;
	printOptions?: PrintDetail[];
	metadata?: PrintDetail[];
	hasPreview?: boolean;
	cta: { label: string; href: string };
};

function audienceTitle(input: PrintQuoteRequestedTemplateInput): string {
	switch (input.audience) {
		case 'inbox':
			return 'Print quote requested';
		case 'user':
			return 'Quote request submitted';
		case 'maker':
			return 'New print quote request';
	}
}

function renderDetail(detail: PrintDetail): string {
	if (detail.kind === 'color') {
		return renderColorLabelValue(detail.label, detail.value);
	}

	return renderLabelValue(detail.label, detail.value);
}

export function renderPrintQuoteRequestedEmail(
	input: PrintQuoteRequestedTemplateInput,
	options?: { previewBytes?: Uint8Array }
): {
	subject: string;
	html: string;
	text: string;
	attachments?: EmailInlineAttachment[];
} {
	const title = audienceTitle(input);

	const detailsHtml = [
		renderLabelValue('Reference', input.printRequestId),
		renderLabelValue('Status', input.statusLabel),
		...(input.metadata ?? []).map(renderDetail),
		...(input.printOptions ?? []).map(renderDetail)
	].join('');

	const previewHtml = input.hasPreview ? renderPreviewImage(PRINT_PREVIEW_CID, input.filename) : '';

	const bodyHtml = [renderParagraph(input.intro), previewHtml, detailsHtml].join('');

	const { html, text } = renderEmailLayout({
		siteUrl: input.siteUrl,
		title,
		preheader: input.preheader,
		bodyHtml,
		cta: input.cta
	});

	const attachments =
		input.hasPreview && options?.previewBytes && options.previewBytes.byteLength > 0
			? [
					{
						cid: PRINT_PREVIEW_CID,
						content: options.previewBytes,
						contentType: 'image/png',
						filename: 'model-preview.png'
					}
				]
			: undefined;

	return {
		subject: `${title} — ${input.printRequestId.slice(0, 8)}`,
		html,
		text,
		attachments
	};
}
