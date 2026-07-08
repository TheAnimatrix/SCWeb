import { describe, expect, it } from 'vitest';
import { resolveCartQuantityChange } from '$lib/client/cart';

describe('resolveCartQuantityChange', () => {
	it('relative add within stock', () => {
		expect(
			resolveCartQuantityChange({
				currentQty: 2,
				changeQty: 1,
				absoluteStockChange: false,
				stockLimit: 10
			})
		).toEqual({ action: 'set', qty: 3 });
	});

	it('relative add exceeding stock (reject + message)', () => {
		expect(
			resolveCartQuantityChange({
				currentQty: 8,
				changeQty: 5,
				absoluteStockChange: false,
				stockLimit: 10
			})
		).toEqual({
			action: 'reject',
			message: 'We only have 10 left. You already have 8 in your cart.'
		});
	});

	it('absolute set to 0 (remove)', () => {
		expect(
			resolveCartQuantityChange({
				currentQty: 3,
				changeQty: 0,
				absoluteStockChange: true,
				stockLimit: 10
			})
		).toEqual({ action: 'remove' });
	});

	it('relative decrement below zero (remove, NOT negative)', () => {
		expect(
			resolveCartQuantityChange({
				currentQty: 1,
				changeQty: -2,
				absoluteStockChange: false,
				stockLimit: 10
			})
		).toEqual({ action: 'remove' });
	});

	it('new item with qty <= 0 (no-op)', () => {
		expect(
			resolveCartQuantityChange({
				currentQty: undefined,
				changeQty: 0,
				absoluteStockChange: false,
				stockLimit: 10
			})
		).toEqual({ action: 'noop' });

		expect(
			resolveCartQuantityChange({
				currentQty: undefined,
				changeQty: -1,
				absoluteStockChange: false,
				stockLimit: 10
			})
		).toEqual({ action: 'noop' });
	});

	it('new item exceeding stock (reject)', () => {
		expect(
			resolveCartQuantityChange({
				currentQty: undefined,
				changeQty: 15,
				absoluteStockChange: false,
				stockLimit: 10
			})
		).toEqual({
			action: 'reject',
			message: 'We only have 10 left.'
		});
	});
});
