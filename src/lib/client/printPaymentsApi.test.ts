import { describe, expect, it } from 'vitest';
import { mapPrintPaymentsError } from '$lib/client/printPaymentsApi';

describe('mapPrintPaymentsError', () => {
	it('maps not_payable', () => {
		expect(mapPrintPaymentsError(409, { error: 'not_payable' })).toEqual({
			kind: 'not_payable',
			message: 'This print request is not ready for payment.'
		});
	});

	it('maps invalid_signature', () => {
		expect(mapPrintPaymentsError(400, { error: 'invalid_signature' })).toEqual({
			kind: 'invalid_signature',
			message: 'Payment verification failed.'
		});
	});

	it('maps order_mismatch', () => {
		expect(mapPrintPaymentsError(400, { error: 'order_mismatch' })).toEqual({
			kind: 'order_mismatch',
			message: 'Payment order does not match this request.'
		});
	});

	it('maps payments_unconfigured', () => {
		expect(mapPrintPaymentsError(503, { error: 'payments_unconfigured' })).toEqual({
			kind: 'payments_unconfigured',
			message: 'Payments are temporarily unavailable. Please try again later.'
		});
	});

	it('maps forbidden', () => {
		expect(mapPrintPaymentsError(403, { error: 'forbidden' })).toEqual({
			kind: 'forbidden',
			message: 'You do not have access to this print request.'
		});
	});

	it('maps not_found', () => {
		expect(mapPrintPaymentsError(404, { error: 'not_found' })).toEqual({
			kind: 'not_found',
			message: 'Print request not found.'
		});
	});
});
