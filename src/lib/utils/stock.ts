export type ProductStock = { count: number; status?: string | null };

const ON_DEMAND_PATTERN = /on[\s-]?demand/i;

/** Max quantity per on-demand line item (no warehouse count to cap against). */
export const ON_DEMAND_PURCHASE_LIMIT = 99;

export function isOnDemand(stock: ProductStock): boolean {
	return ON_DEMAND_PATTERN.test(stock.status ?? '');
}

export function isOutOfStock(stock: ProductStock): boolean {
	return stock.count <= 0 && !isOnDemand(stock);
}

export function isPurchasable(stock: ProductStock): boolean {
	return stock.count > 0 || isOnDemand(stock);
}

export function getPurchasableLimit(stock: ProductStock): number {
	if (isOnDemand(stock)) return ON_DEMAND_PURCHASE_LIMIT;
	return Math.max(stock.count, 0);
}

export function canFulfillQuantity(stock: ProductStock, qty: number): boolean {
	if (qty <= 0) return false;
	if (isOnDemand(stock)) return qty <= ON_DEMAND_PURCHASE_LIMIT;
	return qty <= stock.count;
}
