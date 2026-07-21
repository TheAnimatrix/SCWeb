import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { verifyRazorpaySignature, verifyRazorpayWebhookSignature } from './razorpay.js';

const orderId = 'order_test_123';
const paymentId = 'pay_test_456';
const secret = 'test_razorpay_secret';

function sign(order: string, payment: string) {
	return createHmac('sha256', secret).update(`${order}|${payment}`).digest('hex');
}

describe('verifyRazorpaySignature', () => {
	it('accepts a valid signature', () => {
		const signature = sign(orderId, paymentId);
		expect(verifyRazorpaySignature(orderId, paymentId, signature, secret)).toBe(true);
	});

	it('rejects a tampered signature', () => {
		const signature = sign(orderId, paymentId);
		const tampered = `${signature.slice(0, -1)}${signature.endsWith('a') ? 'b' : 'a'}`;
		expect(verifyRazorpaySignature(orderId, paymentId, tampered, secret)).toBe(false);
	});

	it('normalizes uppercase signatures', () => {
		const signature = sign(orderId, paymentId).toUpperCase();
		expect(verifyRazorpaySignature(orderId, paymentId, signature, secret)).toBe(true);
	});
});

describe('verifyRazorpayWebhookSignature', () => {
	const rawBody = JSON.stringify({
		event: 'payment.captured',
		payload: { payment: { entity: { id: 'pay_1', order_id: 'order_1' } } }
	});

	it('accepts a valid raw body signature', () => {
		const signature = createHmac('sha256', secret).update(rawBody).digest('hex');
		expect(verifyRazorpayWebhookSignature(rawBody, signature, secret)).toBe(true);
	});

	it('rejects a signature for a reparsed or changed body', () => {
		const signature = createHmac('sha256', secret).update(rawBody).digest('hex');
		const changedBody = JSON.stringify(JSON.parse(rawBody), null, 2);
		expect(verifyRazorpayWebhookSignature(changedBody, signature, secret)).toBe(false);
	});
});
