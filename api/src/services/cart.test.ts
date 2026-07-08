import { describe, expect, it } from 'vitest';
import {
	buildCartView,
	classifyMergeScenario,
	computeCartTotals,
	mergeCartLines,
	resolveEffectiveQuantity,
	resolveItemMutation
} from './cart.js';

describe('resolveEffectiveQuantity', () => {
	it('sets absolute quantity in set mode', () => {
		expect(resolveEffectiveQuantity({ currentQty: 2, qty: 5, mode: 'set' })).toEqual({
			action: 'upsert',
			qty: 5
		});
	});

	it('adds to current quantity in add mode', () => {
		expect(resolveEffectiveQuantity({ currentQty: 2, qty: 3, mode: 'add' })).toEqual({
			action: 'upsert',
			qty: 5
		});
	});

	it('deletes when effective quantity is zero or negative', () => {
		expect(resolveEffectiveQuantity({ currentQty: 1, qty: 0, mode: 'set' })).toEqual({
			action: 'delete'
		});
		expect(resolveEffectiveQuantity({ currentQty: 2, qty: -5, mode: 'add' })).toEqual({
			action: 'delete'
		});
	});
});

describe('resolveItemMutation', () => {
	it('rejects quantities above the stock limit', () => {
		expect(
			resolveItemMutation({
				currentQty: 1,
				qty: 5,
				mode: 'set',
				stockLimit: 3
			})
		).toEqual({
			action: 'reject',
			error: 'insufficient_stock',
			limit: 3
		});
	});

	it('allows delete without stock check', () => {
		expect(
			resolveItemMutation({
				currentQty: 2,
				qty: 0,
				mode: 'set',
				stockLimit: 0
			})
		).toEqual({ action: 'delete' });
	});
});

describe('mergeCartLines', () => {
	it('sums guest and user quantities clamped to stock limits', () => {
		const merged = mergeCartLines(
			[
				{ productId: 'p1', qty: 4 },
				{ productId: 'p2', qty: 2 }
			],
			[{ productId: 'p1', qty: 3 }],
			(productId) => (productId === 'p1' ? 5 : 10)
		);

		expect(merged).toEqual([
			{ productId: 'p1', qty: 5 },
			{ productId: 'p2', qty: 2 }
		]);
	});
});

describe('classifyMergeScenario', () => {
	it('classifies merge scenarios', () => {
		expect(classifyMergeScenario(false, false)).toBe('neither');
		expect(classifyMergeScenario(true, false)).toBe('only_guest');
		expect(classifyMergeScenario(false, true)).toBe('only_user');
		expect(classifyMergeScenario(true, true)).toBe('both');
	});
});

describe('computeCartTotals', () => {
	it('adds the flat delivery fee', () => {
		expect(computeCartTotals(401)).toEqual({
			subtotal: 401,
			deliveryFee: 99,
			total: 500
		});
	});
});

describe('buildCartView', () => {
	it('computes subtotal from live unit prices', () => {
		const view = buildCartView({ id: 'cart-1', status: 'active' }, [
			{
				qty: 2,
				product: {
					id: 'p1',
					name: 'Widget',
					price: { new: 100, old: 120 },
					stock: { count: 5, status: 'in stock' },
					images: [{ url: 'https://example.com/a.png' }]
				}
			}
		]);

		expect(view.subtotal).toBe(200);
		expect(view.total).toBe(299);
		expect(view.items[0]?.imageUrl).toBe('https://example.com/a.png');
	});
});
