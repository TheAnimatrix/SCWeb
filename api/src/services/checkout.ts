import { CART_ORDER_STATUS, DELIVERY_FLAT_FEE } from '../contracts/cart.js';
import type { CheckoutAddress } from '../contracts/address.js';
import {
	canFulfillQuantity,
	getPurchasableLimit,
	isOnDemand,
	parseProductStock
} from '../contracts/stock.js';
import type { Actor } from '../types/context.js';
import type { ProductSnapshot } from './cart.js';
import { computeCartTotals, computeSubtotal } from './cart.js';

export type CheckoutLine = {
	productId: string;
	qty: number;
	product: ProductSnapshot;
};

export type OrderItemSnapshot = {
	productId: string;
	productName: string;
	unitPrice: number;
	qty: number;
};

export type StockValidationFailure = {
	error: 'insufficient_stock';
	productId: string;
	limit: number;
};

export type OrderTotals = {
	subtotal: number;
	deliveryFee: number;
	total: number;
};

export function isOrderOwnedBy(
	order: { userId: string | null; clientId: string | null },
	actor: Actor
): boolean {
	if (actor.userId) {
		return order.userId === actor.userId;
	}

	if (actor.clientId) {
		return order.userId === null && order.clientId === actor.clientId;
	}

	return false;
}

export function validateCheckoutLines(lines: CheckoutLine[]): StockValidationFailure | null {
	for (const line of lines) {
		const stock = parseProductStock(line.product.stock);
		if (!canFulfillQuantity(stock, line.qty)) {
			return {
				error: 'insufficient_stock',
				productId: line.productId,
				limit: getPurchasableLimit(stock)
			};
		}
	}

	return null;
}

export function buildOrderItemSnapshots(lines: CheckoutLine[]): OrderItemSnapshot[] {
	return lines.map((line) => {
		const unitPrice = line.product.price?.new;
		if (unitPrice == null || !Number.isInteger(unitPrice)) {
			throw new Error(`product ${line.productId} has invalid unit price`);
		}

		return {
			productId: line.productId,
			productName: line.product.name ?? '',
			unitPrice,
			qty: line.qty
		};
	});
}

export function computeOrderTotals(items: OrderItemSnapshot[]): OrderTotals {
	const pricedItems = items.map((item) => ({
		unitPrice: item.unitPrice,
		qty: item.qty
	}));

	const subtotal = computeSubtotal(pricedItems);
	return computeCartTotals(subtotal);
}

export function shouldReuseRazorpayOrder(razorpayOrderId: string | null | undefined): boolean {
	return Boolean(razorpayOrderId);
}

export function resolveFailOrderStatus(currentStatus: string): string {
	if (currentStatus === CART_ORDER_STATUS.PAID) {
		return CART_ORDER_STATUS.PAID;
	}

	if (currentStatus === CART_ORDER_STATUS.PAYMENT_PENDING) {
		return CART_ORDER_STATUS.FAILED;
	}

	return currentStatus;
}

export function shouldDecrementStock(stock: unknown): boolean {
	return !isOnDemand(parseProductStock(stock));
}

export function normalizeCheckoutAddress(address: CheckoutAddress): CheckoutAddress {
	return {
		...address,
		line2: address.line2 || undefined
	};
}

export function checkoutAddressesEqual(stored: unknown, incoming: CheckoutAddress): boolean {
	if (!stored || typeof stored !== 'object') {
		return false;
	}

	const left = normalizeCheckoutAddress(stored as CheckoutAddress);
	const right = normalizeCheckoutAddress(incoming);

	return (
		left.name === right.name &&
		left.line1 === right.line1 &&
		left.line2 === right.line2 &&
		left.city === right.city &&
		left.pincode === right.pincode &&
		left.state === right.state &&
		left.phone === right.phone
	);
}

export { DELIVERY_FLAT_FEE };
