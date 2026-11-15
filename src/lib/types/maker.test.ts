import { describe, expect, it } from 'vitest';
import { formatQuoteTime } from './maker';

describe('formatQuoteTime', () => {
	it('returns null for empty or invalid values', () => {
		expect(formatQuoteTime(null)).toBeNull();
		expect(formatQuoteTime(undefined)).toBeNull();
		expect(formatQuoteTime('')).toBeNull();
		expect(formatQuoteTime('0')).toBeNull();
		expect(formatQuoteTime('abc')).toBeNull();
		expect(formatQuoteTime('01:30:00')).toBeNull();
	});

	it('treats the stored value as seconds', () => {
		expect(formatQuoteTime('20')).toBe('Usually quotes within 1 min');
		expect(formatQuoteTime('900')).toBe('Usually quotes within 15 min');
		expect(formatQuoteTime(3599)).toBe('Usually quotes within 60 min');
	});

	it('formats hours and days', () => {
		expect(formatQuoteTime('3600')).toBe('Usually quotes within 1 hour');
		expect(formatQuoteTime('5400')).toBe('Usually quotes within 2 hours');
		expect(formatQuoteTime(86399)).toBe('Usually quotes within 24 hours');
		expect(formatQuoteTime('86400')).toBe('Usually quotes within 1 day');
		expect(formatQuoteTime(3 * 86400 + 1)).toBe('Usually quotes within 4 days');
	});
});
