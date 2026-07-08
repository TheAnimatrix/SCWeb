import { describe, expect, it } from 'vitest';
import { getLatestQuote, getLatestQuoteRejection } from './print-payments.js';

describe('getLatestQuote', () => {
	it('returns the latest maker quote', () => {
		const events = [
			{
				by: 'maker',
				type: 'quoted',
				timestamp: '2026-01-01T00:00:00.000Z',
				extra: { quote: 2000 }
			},
			{
				by: 'maker',
				type: 'quoted',
				timestamp: '2026-01-02T00:00:00.000Z',
				extra: { quote: 2500 }
			}
		];

		expect(getLatestQuote(events)).toBe(2500);
	});

	it('ignores quoted events with by: user', () => {
		const events = [
			{
				by: 'user',
				type: 'quoted',
				timestamp: '2026-01-02T00:00:00.000Z',
				extra: { quote: 9999 }
			},
			{
				by: 'maker',
				type: 'quoted',
				timestamp: '2026-01-01T00:00:00.000Z',
				extra: { quote: 2500 }
			}
		];

		expect(getLatestQuote(events)).toBe(2500);
	});

	it('returns null when only user-quoted events exist', () => {
		const events = [
			{
				by: 'user',
				type: 'quoted',
				timestamp: '2026-01-01T00:00:00.000Z',
				extra: { quote: 9999 }
			}
		];

		expect(getLatestQuote(events)).toBeNull();
		expect(getLatestQuoteRejection(events)).toBe('no_quote');
	});

	it('treats fractional maker quotes as invalid', () => {
		const events = [
			{
				by: 'maker',
				type: 'quoted',
				timestamp: '2026-01-01T00:00:00.000Z',
				extra: { quote: 2500.5 }
			}
		];

		expect(getLatestQuote(events)).toBeNull();
		expect(getLatestQuoteRejection(events)).toBe('invalid_quote');
	});

	it('treats NaN maker quotes as invalid', () => {
		const events = [
			{
				by: 'maker',
				type: 'quoted',
				timestamp: '2026-01-01T00:00:00.000Z',
				extra: { quote: 'not-a-number' }
			}
		];

		expect(getLatestQuote(events)).toBeNull();
		expect(getLatestQuoteRejection(events)).toBe('invalid_quote');
	});
});
