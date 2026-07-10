import { describe, expect, it } from 'vitest';
import {
	renderAccountWelcomeEmail,
	renderOrderReceivedEmail,
	renderPasswordResetEmail,
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
			orderId: 'order-1234-5678',
			customerName: 'Jane Doe',
			items: [{ name: 'Widget', qty: 2, priceInr: 499 }],
			subtotalInr: 998,
			deliveryFeeInr: 49,
			totalInr: 1047,
			ordersUrl: 'http://localhost:5173/user/profile/orders'
		});

		expect(result.subject).toContain('order-12');
		expect(result.html).toContain('order-1234-5678');
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
});
