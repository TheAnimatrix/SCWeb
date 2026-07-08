import { createHmac, timingSafeEqual } from 'node:crypto';

const CLIENT_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function signClientId(clientId: string, secret: string): string {
	const signature = createHmac('sha256', secret).update(clientId).digest('base64url');
	return `${clientId}.${signature}`;
}

export function verifyClientIdCookie(
	rawCookie: string | undefined,
	signingSecret: string | undefined
): string | null {
	if (!rawCookie) {
		return null;
	}

	if (!signingSecret) {
		return CLIENT_ID_PATTERN.test(rawCookie) ? rawCookie : null;
	}

	const separator = rawCookie.lastIndexOf('.');
	if (separator === -1) {
		return null;
	}

	const clientId = rawCookie.slice(0, separator);
	const signature = rawCookie.slice(separator + 1);

	if (!CLIENT_ID_PATTERN.test(clientId) || !signature) {
		return null;
	}

	const expected = createHmac('sha256', signingSecret).update(clientId).digest('base64url');
	const provided = Buffer.from(signature);
	const expectedBuffer = Buffer.from(expected);

	if (provided.length !== expectedBuffer.length) {
		return null;
	}

	return timingSafeEqual(provided, expectedBuffer) ? clientId : null;
}
