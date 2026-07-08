import { describe, expect, it } from 'vitest';
import { mapApiError, stripCheckoutAddress } from '$lib/client/cartApi';
import type { Address } from '$lib/types/product';

describe('mapApiError', () => {
	it('maps insufficient_stock with limit', () => {
		expect(mapApiError(409, { error: 'insufficient_stock', limit: 3 })).toEqual({
			kind: 'insufficient_stock',
			limit: 3,
			message: 'Sorry! we only have 3 units at the moment.'
		});
	});

	it('maps product_not_found', () => {
		expect(mapApiError(404, { error: 'product_not_found' })).toEqual({
			kind: 'product_not_found',
			message: 'That product is no longer available.'
		});
	});

	it('maps payments_unconfigured', () => {
		expect(mapApiError(503, { error: 'payments_unconfigured' })).toEqual({
			kind: 'payments_unconfigured',
			message: 'Payments are temporarily unavailable. Please try again later.'
		});
	});

	it('maps rate_limited by status when error code missing', () => {
		expect(mapApiError(429, {})).toEqual({
			kind: 'rate_limited',
			message: 'Too many requests. Please wait and try again.'
		});
	});

	it('maps unknown server errors', () => {
		expect(mapApiError(500, { error: 'internal_error' })).toEqual({
			kind: 'unknown',
			message: 'Server error. Please try again.'
		});
	});
});

describe('stripCheckoutAddress', () => {
	it('drops id, email, and created_at', () => {
		const address: Address = {
			id: 'addr-1',
			email: 'user@example.com',
			created_at: '2026-01-01T00:00:00Z',
			name: 'Jane Doe',
			line1: '123 Example Street, Block A',
			line2: 'Near Park',
			city: 'Bengaluru',
			pincode: '560001',
			state: 'Karnataka',
			phone: '+919876543210'
		};

		expect(stripCheckoutAddress(address)).toEqual({
			name: 'Jane Doe',
			line1: '123 Example Street, Block A',
			line2: 'Near Park',
			city: 'Bengaluru',
			pincode: '560001',
			state: 'Karnataka',
			phone: '+919876543210'
		});
	});
});
