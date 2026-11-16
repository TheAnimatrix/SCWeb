import { describe, expect, it } from 'vitest';
import {
	renderAccountWelcomeEmail,
	renderOrderReceivedEmail,
	renderPasswordResetEmail,
	renderInterestClosedEmail,
	renderInterestJoinedEmail,
	renderInterestLaunchedEmail,
	renderPrintQuoteRequestedEmail
} from './index.js';

describe('email templates', () => {
	it('renders account welcome with confirm link', () => {
		const result = renderAccountWelcomeEmail({
			siteUrl: 'http://localhost:5173',
			username: 'maker_one',
			confirmUrl: 'http://localhost:5173/auth/confirm?token=abc'
		});

		expect(result.subject).toContain('Confirm');
		expect(result.html).toContain('maker_one');
		expect(result.html).toContain('http://localhost:5173/auth/confirm?token=abc');
		expect(result.text).toContain('Confirm email');
	});

	it('renders password reset email', () => {
		const result = renderPasswordResetEmail({
			siteUrl: 'http://localhost:5173',
			resetUrl: 'http://localhost:5173/user/reset-password?token_hash=abc'
		});

		expect(result.subject.toLowerCase()).toContain('reset');
		expect(result.html).toContain('token_hash=abc');
		expect(result.html).toContain('text-align:center');
		expect(result.html).toContain('color-scheme" content="light"');
	});

	it('renders order received with order id', () => {
		const result = renderOrderReceivedEmail({
			siteUrl: 'http://localhost:5173',
			orderId: '70ec41d8-f86f-461e-9e43-14b180231d48',
			customerName: 'Jane Doe',
			items: [{ name: 'Widget', qty: 2, priceInr: 499 }],
			subtotalInr: 998,
			deliveryFeeInr: 49,
			totalInr: 1047,
			ordersUrl: 'http://localhost:5173/user/profile/orders'
		});

		// Same short ID the site and the order list show (formatOrderDisplayId).
		expect(result.subject).toBe('Order received: 70EC41D8');
		expect(result.html).toContain('70EC41D8');
		expect(result.html).not.toContain('70ec41d8-f86f');
		expect(result.html).toContain('Widget');
		expect(result.html).toContain('₹1,047');
	});

	it('renders print quote requested with preview attachment and color swatch', () => {
		const previewBytes = new Uint8Array([137, 80, 78, 71]);
		const result = renderPrintQuoteRequestedEmail(
			{
				siteUrl: 'http://localhost:5173',
				audience: 'maker',
				printRequestId: 'print-1234-5678',
				filename: 'bracket.stl',
				preheader: 'A customer requested a quote for bracket.stl.',
				intro: 'A customer submitted a 3D print quote request for you to review.',
				statusLabel: 'Requested',
				metadata: [
					{ label: 'File', value: 'bracket.stl' },
					{ label: 'File size', value: '2.0 KB' }
				],
				printOptions: [
					{ label: 'Material', value: 'PLA' },
					{ kind: 'color', label: 'Color', value: '#ff0000' }
				],
				hasPreview: true,
				cta: {
					label: 'Review request',
					href: 'http://localhost:5173/3dp-portal/maker/print-1234-5678'
				}
			},
			{ previewBytes }
		);

		expect(result.subject).toContain('New print quote request');
		expect(result.html).toContain('cid:print-model-preview');
		expect(result.html).toContain('background:#ff0000');
		expect(result.html).toContain('#ff0000');
		expect(result.attachments).toHaveLength(1);
	});

	it('renders the three interest-check e-mails with the agreed wording', () => {
		const listing = 'https://selfcrafted.in/Moon_Lamp/craft/item=abc';
		const joined = renderInterestJoinedEmail({
			siteUrl: 'https://selfcrafted.in',
			productName: 'Moon Lamp',
			makerName: 'Clay Studio',
			targetCount: 20,
			interestedCount: 4,
			shipsWithinDays: 30,
			listingUrl: listing
		});
		expect(joined.subject).toBe("You're on the list for Moon Lamp");
		expect(joined.text).toContain("This isn't an order and you haven't paid anything.");
		expect(joined.text).toContain(
			'Clay Studio will produce it once 20 people show interest (4 so far), and plans to ship within 30 days of reaching that number.'
		);
		expect(joined.text).toContain(`View the listing: ${listing}`);

		const launched = renderInterestLaunchedEmail({
			siteUrl: 'https://selfcrafted.in',
			productName: 'Moon Lamp',
			makerName: 'Clay Studio',
			priceInr: 1499,
			deliveryFeeInr: 99,
			message: '<b>Hi</b>',
			buyUrl: listing
		});
		expect(launched.subject).toBe('Moon Lamp is ready to order');
		expect(launched.text).toContain('Price: ₹1,499, plus ₹99 delivery.');
		expect(launched.text).toContain('A note from Clay Studio:');
		expect(launched.html).toContain('&lt;b&gt;Hi&lt;/b&gt;');
		expect(launched.html).not.toContain('<b>Hi</b>');
		expect(launched.text).toContain(`Buy Moon Lamp: ${listing}`);

		const closed = renderInterestClosedEmail({
			siteUrl: 'https://selfcrafted.in',
			productName: 'Moon Lamp',
			makerName: 'Clay Studio'
		});
		expect(closed.subject).toBe("Moon Lamp won't be produced");
		expect(closed.text).toContain("You weren't charged, and there is nothing you need to do.");
		expect(closed.text).not.toContain('A note from');
	});
});
