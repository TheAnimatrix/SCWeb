import { describe, expect, it } from 'vitest';
import { canTransition } from './print-requests.js';

describe('print-request transitions', () => {
	it('allows shipped from paid_externally', () => {
		expect(canTransition('paid_externally', 'shipped')).toBe(true);
	});

	it('allows shipped from paid', () => {
		expect(canTransition('paid', 'shipped')).toBe(true);
	});

	it('rejects shipped from requested', () => {
		expect(canTransition('requested', 'shipped')).toBe(false);
	});
});
