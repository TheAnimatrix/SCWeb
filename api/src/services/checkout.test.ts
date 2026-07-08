import { describe, expect, it } from 'vitest';
import { CART_ORDER_STATUS } from '../contracts/cart.js';
import {
	buildOrderItemSnapshots,
	canFailOrder,
	computeOrderTotals,
	isOrderOwnedBy,
	resolveFailOrderStatus,
	shouldDecrementStock,
	shouldReuseRazorpayOrder,
	validateCheckoutLines,
	type CheckoutLine
} from './checkout.js';

const product = (id: string, count: number, status = 'in stock', price = 100) => ({
	id,
	name: `Product ${id}`,
	price: { new: price, old: price + 20 },
	stock: { count, status },
	images: [{ url: 'https://example.com/a.png' }]
});

function line(productId: string, qty: number, count: number, status = 'in stock'): CheckoutLine {
	return {
		productId,
		qty,
		product: product(productId, count, status)
	};
}

describe('validateCheckoutLines', () => {
	it('returns null when every line is within stock limits', () => {
		expect(validateCheckoutLines([line('p1', 2, 5)])).toBeNull();
	});

	it('returns the first insufficient stock failure', () => {
		expect(validateCheckoutLines([line('p1', 6, 5)])).toEqual({
			error: 'insufficient_stock',
			productId: 'p1',
			limit: 5
		});
	});

	it('allows on-demand quantities up to the purchase limit', () => {
		expect(validateCheckoutLines([line('p1', 10, 0, 'on demand')])).toBeNull();
	});
});

describe('computeOrderTotals', () => {
	it('adds the flat delivery fee to the subtotal', () => {
		const items = buildOrderItemSnapshots([line('p1', 2, 5), line('p2', 1, 5, 'in stock')]);
		items[1] = { ...items[1]!, unitPrice: 50 };

		expect(computeOrderTotals(items)).toEqual({
			subtotal: 250,
			deliveryFee: 99,
			total: 349
		});
	});
});

describe('shouldReuseRazorpayOrder', () => {
	it('reuses when a razorpay order id already exists', () => {
		expect(shouldReuseRazorpayOrder('order_123')).toBe(true);
		expect(shouldReuseRazorpayOrder(null)).toBe(false);
	});
});

describe('resolveFailOrderStatus', () => {
	it('never downgrades a paid order', () => {
		expect(resolveFailOrderStatus(CART_ORDER_STATUS.PAID)).toBe(CART_ORDER_STATUS.PAID);
	});

	it('marks payment_pending orders as failed', () => {
		expect(resolveFailOrderStatus(CART_ORDER_STATUS.PAYMENT_PENDING)).toBe(
			CART_ORDER_STATUS.FAILED
		);
	});
});

describe('canFailOrder', () => {
	it('blocks failing paid orders', () => {
		expect(canFailOrder(CART_ORDER_STATUS.PAID)).toBe(false);
		expect(canFailOrder(CART_ORDER_STATUS.PAYMENT_PENDING)).toBe(true);
	});
});

describe('isOrderOwnedBy', () => {
	it('matches authenticated users by user id', () => {
		expect(
			isOrderOwnedBy(
				{ userId: 'user-1', clientId: 'guest-1' },
				{ userId: 'user-1', clientId: null }
			)
		).toBe(true);
		expect(
			isOrderOwnedBy({ userId: 'user-2', clientId: null }, { userId: 'user-1', clientId: null })
		).toBe(false);
	});

	it('matches guests by client id when user id is null', () => {
		expect(
			isOrderOwnedBy({ userId: null, clientId: 'guest-1' }, { userId: null, clientId: 'guest-1' })
		).toBe(true);
		expect(
			isOrderOwnedBy({ userId: null, clientId: 'guest-2' }, { userId: null, clientId: 'guest-1' })
		).toBe(false);
	});
});

describe('shouldDecrementStock', () => {
	it('skips on-demand products', () => {
		expect(shouldDecrementStock({ count: 0, status: 'on demand' })).toBe(false);
		expect(shouldDecrementStock({ count: 5, status: 'in stock' })).toBe(true);
	});
});
