import { describe, expect, it } from 'vitest';
import { formatOrderDisplayId } from './formatOrderDisplayId';

describe('formatOrderDisplayId', () => {
	it('uses the first UUID segment as the display ref', () => {
		expect(formatOrderDisplayId('70ec41d8-f86f-461e-9e43-14b180231d48')).toBe('70ec41d8');
	});

	it('uses numeric legacy purchase ids as-is', () => {
		expect(formatOrderDisplayId(47)).toBe('47');
	});

	it('unwraps legacy-prefixed ids', () => {
		expect(formatOrderDisplayId('legacy-21')).toBe('21');
	});
});
