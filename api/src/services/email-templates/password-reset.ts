import { renderEmailLayout, renderParagraph } from './layout.js';

export type PasswordResetTemplateInput = {
	siteUrl: string;
	resetUrl: string;
};

export function renderPasswordResetEmail(input: PasswordResetTemplateInput) {
	const bodyHtml = [
		renderParagraph('We received a request to reset your Selfcrafted password.'),
		renderParagraph(
			'If you made this request, use the button below. This link expires soon. If you did not request a reset, you can ignore this email.'
		)
	].join('');

	const { html, text } = renderEmailLayout({
		siteUrl: input.siteUrl,
		title: 'Reset your password',
		preheader: 'Reset your Selfcrafted password.',
		bodyHtml,
		cta: { label: 'Reset password', href: input.resetUrl }
	});

	return {
		subject: 'Reset your Selfcrafted password',
		html,
		text
	};
}
