import { describe, expect, it } from 'vitest';
import {
	renderAccountWelcomeEmail,
	renderOrderReceivedEmail,
	renderPasswordResetEmail
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
});
