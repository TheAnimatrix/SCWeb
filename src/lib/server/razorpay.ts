import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Verifies a Razorpay payment signature (HMAC-SHA256 over `order_id|payment_id`).
 */
export function verifyRazorpaySignature(
	orderId: string,
	paymentId: string,
	signature: string,
	secret: string
): boolean {
	const expected = createHmac('sha256', secret)
		.update(`${orderId}|${paymentId}`)
		.digest('hex');

	if (expected.length !== signature.length) {
		return false;
	}

	try {
		return timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(signature, 'utf8'));
	} catch {
		return false;
	}
}
