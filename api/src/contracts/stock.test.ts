import { describe, expect, it } from 'vitest';
import {
	canFulfillQuantity,
	getPurchasableLimit,
	isOnDemand,
	ON_DEMAND_PURCHASE_LIMIT,
	parseProductStock
} from '../contracts/stock.js';

describe('stock contract semantics', () => {
	it('parses stock jsonb', () => {
		expect(parseProductStock({ count: 5, status: 'in stock' })).toEqual({
			count: 5,
			status: 'in stock'
		});
	});

	it('treats on-demand items with their own purchase limit', () => {
		const stock = parseProductStock({ count: 0, status: 'on-demand' });
		expect(isOnDemand(stock)).toBe(true);
		expect(getPurchasableLimit(stock)).toBe(ON_DEMAND_PURCHASE_LIMIT);
		expect(canFulfillQuantity(stock, ON_DEMAND_PURCHASE_LIMIT)).toBe(true);
		expect(canFulfillQuantity(stock, ON_DEMAND_PURCHASE_LIMIT + 1)).toBe(false);
	});

	it('caps warehouse stock by count', () => {
		const stock = parseProductStock({ count: 3, status: 'in stock' });
		expect(getPurchasableLimit(stock)).toBe(3);
		expect(canFulfillQuantity(stock, 3)).toBe(true);
		expect(canFulfillQuantity(stock, 4)).toBe(false);
	});
});
