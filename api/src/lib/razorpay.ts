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
	const expected = createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');

	const normalizedSignature = signature.trim().toLowerCase();

	if (expected.length !== normalizedSignature.length) {
		return false;
	}

	try {
		return timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(normalizedSignature, 'utf8'));
	} catch {
		return false;
	}
}

/**
 * Verifies a Razorpay webhook signature (HMAC-SHA256 over the raw request body).
 */
export function verifyRazorpayWebhookSignature(
	rawBody: string,
	signature: string,
	secret: string
): boolean {
	const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
	const normalizedSignature = signature.trim().toLowerCase();

	if (expected.length !== normalizedSignature.length) {
		return false;
	}

	try {
		return timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(normalizedSignature, 'utf8'));
	} catch {
		return false;
	}
}
