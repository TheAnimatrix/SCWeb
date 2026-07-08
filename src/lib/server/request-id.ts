import { randomUUID } from 'node:crypto';

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{1,128}$/;

export function sanitizeRequestId(value: string | null | undefined): string {
	if (value && REQUEST_ID_PATTERN.test(value)) {
		return value;
	}

	return randomUUID();
}
