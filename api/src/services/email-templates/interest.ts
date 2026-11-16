import { BRAND, renderEmailLayout, renderParagraph } from './layout.js';

/** Wording comes from interest-copy.md ("Emails"). Keep it verbatim. */

function formatInr(amount: number): string {
	return `₹${amount.toLocaleString('en-IN')}`;
}

function escapeHtml(value: string): string {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');
}

function renderMakerNote(maker: string, message: string | null | undefined): string {
	const trimmed = message?.trim();
	if (!trimmed) return '';
	const body = trimmed
		.split(/\r?\n/)
		.map((line) => escapeHtml(line))
		.join('<br />');
	return [
		renderParagraph(`A note from ${maker}:`),
		`<blockquote style="margin:0 0 12px;padding:8px 14px;border-left:3px solid ${BRAND.border};color:${BRAND.text};">${body}</blockquote>`
	].join('');
}

export type InterestJoinedEmailInput = {
	siteUrl: string;
	productName: string;
	makerName: string;
	targetCount: number;
	interestedCount: number;
	shipsWithinDays: number;
	listingUrl: string;
};

export function renderInterestJoinedEmail(input: InterestJoinedEmailInput) {
	const title = `You're on the list for ${input.productName}`;
	const bodyHtml = [
		renderParagraph(`Thanks for showing interest in ${input.productName} by ${input.makerName}.`),
		renderParagraph(`This isn't an order and you haven't paid anything.`),
		renderParagraph(
			`${input.makerName} will produce it once ${input.targetCount} people show interest (${input.interestedCount} so far), and plans to ship within ${input.shipsWithinDays} days of reaching that number.`
		),
		renderParagraph(`We'll email you a link to buy when it launches.`),
		renderParagraph(`Changed your mind? Open the listing and choose "Take me off the list".`)
	].join('');

	const { html, text } = renderEmailLayout({
		siteUrl: input.siteUrl,
		title,
		preheader: `This isn't an order and you haven't paid anything.`,
		bodyHtml,
		cta: { label: 'View the listing', href: input.listingUrl }
	});
	return { subject: title, html, text };
}

export type InterestLaunchedEmailInput = {
	siteUrl: string;
	productName: string;
	makerName: string;
	/** Rupees. */
	priceInr: number;
	/** Rupees. */
	deliveryFeeInr: number;
	message?: string | null;
	buyUrl: string;
};

export function renderInterestLaunchedEmail(input: InterestLaunchedEmailInput) {
	const title = `${input.productName} is ready to order`;
	const bodyHtml = [
		renderParagraph(
			`${input.productName} by ${input.makerName} has launched. You showed interest in it, so here is the link to buy.`
		),
		renderMakerNote(input.makerName, input.message),
		renderParagraph(
			`Price: ${formatInr(input.priceInr)}, plus ${formatInr(input.deliveryFeeInr)} delivery.`
		),
		renderParagraph(`Being on the list doesn't reserve a unit, and stock is limited to this batch.`)
	].join('');

	const { html, text } = renderEmailLayout({
		siteUrl: input.siteUrl,
		title,
		preheader: `${input.productName} by ${input.makerName} has launched.`,
		bodyHtml,
		cta: { label: `Buy ${input.productName}`, href: input.buyUrl }
	});
	return { subject: title, html, text };
}

export type InterestClosedEmailInput = {
	siteUrl: string;
	productName: string;
	makerName: string;
	message?: string | null;
};

export function renderInterestClosedEmail(input: InterestClosedEmailInput) {
	const title = `${input.productName} won't be produced`;
	const bodyHtml = [
		renderParagraph(`${input.makerName} has decided not to produce ${input.productName}.`),
		renderParagraph(`You weren't charged, and there is nothing you need to do.`),
		renderMakerNote(input.makerName, input.message)
	].join('');

	const { html, text } = renderEmailLayout({
		siteUrl: input.siteUrl,
		title,
		preheader: `You weren't charged, and there is nothing you need to do.`,
		bodyHtml
	});
	return { subject: title, html, text };
}
