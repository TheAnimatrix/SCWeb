import {
	DELIVERY_FLAT_FEE,
	type CartItemView,
	type CartView,
	type GetCartResponse
} from '../contracts/cart.js';
import { getPurchasableLimit, parseProductStock } from '../contracts/stock.js';
import type { Actor } from '../types/context.js';

export type QuantityMode = 'set' | 'add';

export type QuantityResolution = { action: 'delete' } | { action: 'upsert'; qty: number };

export type StockRejection = { action: 'reject'; error: 'insufficient_stock'; limit: number };

export type ItemMutationResult = QuantityResolution | StockRejection;

export type MergeLine = { productId: string; qty: number };

export type MergeScenario = 'only_guest' | 'only_user' | 'both' | 'neither';

export type ActorType = 'user' | 'guest';

export function hasActor(actor: Actor): boolean {
	return Boolean(actor.userId || actor.clientId);
}

export function actorType(actor: Actor): ActorType {
	return actor.userId ? 'user' : 'guest';
}

export function resolveEffectiveQuantity(params: {
	currentQty: number | undefined;
	qty: number;
	mode: QuantityMode;
}): QuantityResolution {
	const { currentQty, qty, mode } = params;
	const effective = mode === 'add' ? (currentQty ?? 0) + qty : qty;

	if (effective <= 0) {
		return { action: 'delete' };
	}

	return { action: 'upsert', qty: effective };
}

export function applyStockLimit(qty: number, stockLimit: number): StockRejection | { qty: number } {
	if (qty > stockLimit) {
		return { action: 'reject', error: 'insufficient_stock', limit: stockLimit };
	}

	return { qty };
}

export function resolveItemMutation(params: {
	currentQty: number | undefined;
	qty: number;
	mode: QuantityMode;
	stockLimit: number;
}): ItemMutationResult {
	const resolution = resolveEffectiveQuantity(params);

	if (resolution.action === 'delete') {
		return resolution;
	}

	const stockResult = applyStockLimit(resolution.qty, params.stockLimit);
	if ('action' in stockResult) {
		return stockResult;
	}

	return { action: 'upsert', qty: stockResult.qty };
}

export function classifyMergeScenario(hasGuestCart: boolean, hasUserCart: boolean): MergeScenario {
	if (!hasGuestCart && !hasUserCart) return 'neither';
	if (hasGuestCart && !hasUserCart) return 'only_guest';
	if (!hasGuestCart && hasUserCart) return 'only_user';
	return 'both';
}

export function mergeCartLines(
	guestLines: MergeLine[],
	userLines: MergeLine[],
	getStockLimit: (productId: string) => number
): MergeLine[] {
	const byProduct = new Map<string, number>();

	for (const line of userLines) {
		byProduct.set(line.productId, line.qty);
	}

	for (const line of guestLines) {
		const current = byProduct.get(line.productId) ?? 0;
		byProduct.set(line.productId, current + line.qty);
	}

	return Array.from(byProduct.entries())
		.map(([productId, qty]) => ({
			productId,
			qty: Math.min(qty, getStockLimit(productId))
		}))
		.filter((line) => line.qty > 0);
}

export function computeSubtotal(items: Pick<CartItemView, 'unitPrice' | 'qty'>[]): number {
	return items.reduce((sum, item) => sum + item.unitPrice * item.qty, 0);
}

export function computeCartTotals(
	subtotal: number
): Pick<CartView, 'subtotal' | 'deliveryFee' | 'total'> {
	return {
		subtotal,
		deliveryFee: DELIVERY_FLAT_FEE,
		total: subtotal + DELIVERY_FLAT_FEE
	};
}

export type ProductSnapshot = {
	id: string;
	name: string | null;
	price: { new: number; old: number } | null;
	stock: unknown;
	images: { url: string }[] | null;
};

export function mapProductToCartItem(product: ProductSnapshot, qty: number): CartItemView | null {
	const unitPrice = product.price?.new;
	if (unitPrice == null || !Number.isInteger(unitPrice)) {
		return null;
	}

	const stock = parseProductStock(product.stock);
	const imageUrl = product.images?.[0]?.url ?? null;

	return {
		productId: product.id,
		qty,
		name: product.name ?? '',
		imageUrl,
		unitPrice,
		stock: {
			count: stock.count,
			status: stock.status ?? null
		}
	};
}

export function buildCartView(
	cart: { id: string; status: string },
	lines: { product: ProductSnapshot; qty: number }[]
): CartView {
	const items = lines
		.map(({ product, qty }) => mapProductToCartItem(product, qty))
		.filter((item): item is CartItemView => item !== null);

	const subtotal = computeSubtotal(items);
	const totals = computeCartTotals(subtotal);

	return {
		id: cart.id,
		status: cart.status,
		items,
		...totals
	};
}

export function buildGetCartResponse(cart: CartView | null): GetCartResponse {
	return { cart };
}

export function stockLimitFromProduct(product: ProductSnapshot): number {
	return getPurchasableLimit(parseProductStock(product.stock));
}
