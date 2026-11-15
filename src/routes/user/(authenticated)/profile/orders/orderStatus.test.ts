import { describe, expect, it } from 'vitest';
import { isFailedPaymentAttempt, ORDER_STATUS_DISPLAY, toProfileOrderStatus } from './orderStatus';

describe('toProfileOrderStatus', () => {
	it('maps every cart order status', () => {
		expect(toProfileOrderStatus('cart', 'payment_pending')).toBe('payment_pending');
		expect(toProfileOrderStatus('cart', 'paid')).toBe('awaiting_dispatch');
		expect(toProfileOrderStatus('cart', 'fulfilled')).toBe('shipped');
		expect(toProfileOrderStatus('cart', 'failed')).toBe('payment_failed');
		expect(toProfileOrderStatus('cart', 'cancelled')).toBe('cancelled');
		expect(toProfileOrderStatus('cart', 'refunded')).toBe('refunded');
	});

	it('keeps refunded and cancelled apart from failed payments', () => {
		expect(toProfileOrderStatus('cart', 'refunded')).not.toBe('payment_failed');
		expect(toProfileOrderStatus('cart', 'cancelled')).not.toBe('payment_failed');
	});

	it('maps print request stages', () => {
		expect(toProfileOrderStatus('print', 'paid')).toBe('awaiting_dispatch');
		expect(toProfileOrderStatus('print', 'paid_externally')).toBe('awaiting_dispatch');
		expect(toProfileOrderStatus('print', 'shipped')).toBe('shipped');
		expect(toProfileOrderStatus('print', 'completed')).toBe('delivered');
	});

	it('does not call old paid purchases "awaiting dispatch"', () => {
		expect(toProfileOrderStatus('legacy', 'paid')).toBe('paid');
		expect(toProfileOrderStatus('legacy', 'completed')).toBe('paid');
		expect(toProfileOrderStatus('legacy', 'pending')).toBe('payment_pending');
		expect(toProfileOrderStatus('legacy', null)).toBe('unknown');
	});

	it('falls back to unknown', () => {
		expect(toProfileOrderStatus('cart', 'something_new')).toBe('unknown');
	});
});

describe('ORDER_STATUS_DISPLAY', () => {
	it('gives each state its own label', () => {
		const labels = Object.values(ORDER_STATUS_DISPLAY).map((d) => d.label);
		expect(new Set(labels).size).toBe(labels.length);
	});

	it('uses a different icon for pending and failed payments', () => {
		expect(ORDER_STATUS_DISPLAY.payment_pending.icon).not.toBe(
			ORDER_STATUS_DISPLAY.payment_failed.icon
		);
	});
});

describe('isFailedPaymentAttempt', () => {
	it('only flags failed payments', () => {
		expect(isFailedPaymentAttempt('payment_failed')).toBe(true);
		expect(isFailedPaymentAttempt('refunded')).toBe(false);
	});
});
