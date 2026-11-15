import { describe, expect, it } from 'vitest';
import { mapApiError, stockLimitMessage, stripCheckoutAddress } from '$lib/client/cartApi';
import type { Address } from '$lib/types/product';

describe('mapApiError', () => {
	it('maps insufficient_stock with limit', () => {
		expect(mapApiError(409, { error: 'insufficient_stock', limit: 3, productId: 'p1' })).toEqual({
			kind: 'insufficient_stock',
			limit: 3,
			productId: 'p1',
			message: 'Only 3 left. Lower the quantity to continue.'
		});
	});

	it('says out of stock instead of "0 units"', () => {
		expect(mapApiError(409, { error: 'insufficient_stock', limit: 0 }).message).toBe(
			'This item is now out of stock. Remove it to check out.'
		);
		expect(stockLimitMessage(0, 'Clay mug')).toBe(
			'Clay mug is now out of stock. Remove it to check out.'
		);
		expect(stockLimitMessage(2, 'Clay mug')).toBe(
			'Only 2 left of Clay mug. Lower the quantity to continue.'
		);
	});

	it('maps listing_not_available with the product id', () => {
		expect(mapApiError(409, { error: 'listing_not_available', productId: 'p2' })).toMatchObject({
			kind: 'listing_not_available',
			productId: 'p2'
		});
	});

	it('maps a bare 401 to unauthorized', () => {
		expect(mapApiError(401, {}).kind).toBe('unauthorized');
	});

	it('keeps the paid order id on stock_conflict', () => {
		expect(mapApiError(409, { error: 'stock_conflict', orderId: 'o1' })).toMatchObject({
			kind: 'stock_conflict',
			orderId: 'o1'
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
			message: 'Payments are not available right now. Nothing was charged. Try again later.'
		});
	});

	it('maps rate_limited by status when error code missing', () => {
		expect(mapApiError(429, {})).toEqual({
			kind: 'rate_limited',
			message: 'Too many attempts. Wait a minute and try again.'
		});
	});

	it('maps unknown server errors', () => {
		expect(mapApiError(500, { error: 'internal_error' })).toEqual({
			kind: 'unknown',
			message: 'Something went wrong. Try again.'
		});
	});
});

describe('stripCheckoutAddress', () => {
	it('drops id and created_at but keeps email when present', () => {
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
			phone: '+919876543210',
			email: 'user@example.com'
		});
	});
});

describe('mapApiError payment outcomes', () => {
	it('maps payment_mismatch with the order id', () => {
		expect(mapApiError(409, { error: 'payment_mismatch', orderId: 'o1' })).toMatchObject({
			kind: 'payment_mismatch',
			orderId: 'o1'
		});
	});

	it('maps already_paid with the order and payment ids', () => {
		expect(
			mapApiError(409, { error: 'already_paid', orderId: 'o1', paymentId: 'pay_1' })
		).toMatchObject({ kind: 'already_paid', orderId: 'o1', paymentId: 'pay_1' });
	});
});
