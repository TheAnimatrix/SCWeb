import { renderEmailLayout, renderParagraph } from './layout.js';

export type AccountWelcomeTemplateInput = {
	siteUrl: string;
	username?: string;
	confirmUrl: string;
};

export function renderAccountWelcomeEmail(input: AccountWelcomeTemplateInput) {
	const greeting = input.username ? `Hi ${input.username},` : 'Hi there,';

	const bodyHtml = [
		renderParagraph(greeting),
		renderParagraph(
			'Welcome to Selfcrafted India — the marketplace for indie hardware makers. Confirm your email to finish setting up your account.'
		)
	].join('');

	const { html, text } = renderEmailLayout({
		siteUrl: input.siteUrl,
		title: 'Confirm your email',
		preheader: 'One step left to activate your Selfcrafted account.',
		bodyHtml,
		cta: { label: 'Confirm email', href: input.confirmUrl }
	});

	return {
		subject: 'Confirm your Selfcrafted account',
		html,
		text
	};
}
