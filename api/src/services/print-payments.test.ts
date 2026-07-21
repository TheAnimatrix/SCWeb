import { describe, expect, it } from 'vitest';
import {
	getLatestQuote,
	getLatestQuoteRejection,
	shouldReusePrintPaymentOrder
} from './print-payments.js';
import { PAYMENT_ATTEMPT_STATUS } from '../contracts/payment-attempts.js';

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

describe('shouldReusePrintPaymentOrder', () => {
	it('reuses when pending attempt amount matches quote', () => {
		expect(
			shouldReusePrintPaymentOrder(
				{
					amountPaise: 250000,
					status: PAYMENT_ATTEMPT_STATUS.PENDING,
					providerOrderId: 'order_1'
				},
				2500
			)
		).toBe(true);
	});

	it('does not reuse failed attempts', () => {
		expect(
			shouldReusePrintPaymentOrder(
				{
					amountPaise: 250000,
					status: PAYMENT_ATTEMPT_STATUS.FAILED,
					providerOrderId: 'order_1'
				},
				2500
			)
		).toBe(false);
	});

	it('does not reuse when quote amount changed', () => {
		expect(
			shouldReusePrintPaymentOrder(
				{
					amountPaise: 250000,
					status: PAYMENT_ATTEMPT_STATUS.PENDING,
					providerOrderId: 'order_1'
				},
				3000
			)
		).toBe(false);
	});
});
