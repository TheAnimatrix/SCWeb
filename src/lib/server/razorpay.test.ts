import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { verifyRazorpaySignature } from '$lib/server/razorpay';

const orderId = 'order_test123';
const paymentId = 'pay_test456';
const secret = 'test_razorpay_secret';

function sign(order: string, payment: string, key: string): string {
	return createHmac('sha256', key).update(`${order}|${payment}`).digest('hex');
}

describe('verifyRazorpaySignature', () => {
	it('accepts a valid signature', () => {
		const signature = sign(orderId, paymentId, secret);
		expect(verifyRazorpaySignature(orderId, paymentId, signature, secret)).toBe(true);
	});

	it('rejects a tampered signature', () => {
		const signature = sign(orderId, paymentId, secret);
		const tampered = signature.replace(/a/, 'b');
		expect(verifyRazorpaySignature(orderId, paymentId, tampered, secret)).toBe(false);
	});

	it('rejects a wrong-length signature without throwing', () => {
		expect(() =>
			verifyRazorpaySignature(orderId, paymentId, 'tooshort', secret)
		).not.toThrow();
		expect(verifyRazorpaySignature(orderId, paymentId, 'tooshort', secret)).toBe(false);
	});

	it('accepts an uppercase-hex signature', () => {
		const signature = sign(orderId, paymentId, secret).toUpperCase();
		expect(verifyRazorpaySignature(orderId, paymentId, signature, secret)).toBe(true);
	});
});
