import { getTableColumns, getTableName } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { CART_ORDER_STATUS } from '../contracts/cart.js';
import { cartItems } from './schema/cartItems.js';
import { carts2 } from './schema/carts.js';
import { orderItems } from './schema/orderItems.js';
import { ORDER_STATUS_VALUES, orders } from './schema/orders.js';

describe('phase 2 cart/checkout schema', () => {
	it('exports carts2 mapped to the carts table', () => {
		expect(getTableName(carts2)).toBe('carts');

		const columns = Object.keys(getTableColumns(carts2));
		expect(columns).toEqual(
			expect.arrayContaining(['id', 'userId', 'clientId', 'status', 'createdAt', 'updatedAt'])
		);
		expect(carts2.status).toBeDefined();
	});

	it('exports cart_items with composite key and no price column', () => {
		expect(getTableName(cartItems)).toBe('cart_items');

		const columns = Object.keys(getTableColumns(cartItems));
		expect(columns).toEqual(
			expect.arrayContaining(['cartId', 'productId', 'qty', 'createdAt', 'updatedAt'])
		);
		expect(columns).not.toContain('price');
	});

	it('exports orders with pricing, address, and razorpay columns', () => {
		expect(getTableName(orders)).toBe('orders');

		const columns = Object.keys(getTableColumns(orders));
		expect(columns).toEqual(
			expect.arrayContaining([
				'id',
				'cartId',
				'userId',
				'clientId',
				'status',
				'address',
				'subtotal',
				'deliveryFee',
				'total',
				'razorpayOrderId',
				'razorpayPaymentId',
				'createdAt',
				'updatedAt'
			])
		);
	});

	it('exports order_items snapshot columns', () => {
		expect(getTableName(orderItems)).toBe('order_items');

		const columns = Object.keys(getTableColumns(orderItems));
		expect(columns).toEqual(
			expect.arrayContaining(['orderId', 'productId', 'productName', 'unitPrice', 'qty'])
		);
	});

	it('uses cart status constants as the single source of truth', () => {
		expect(CART_ORDER_STATUS.ACTIVE).toBe('active');
		expect(ORDER_STATUS_VALUES).toEqual([
			CART_ORDER_STATUS.PAYMENT_PENDING,
			CART_ORDER_STATUS.PAID,
			CART_ORDER_STATUS.FAILED,
			CART_ORDER_STATUS.FULFILLED,
			CART_ORDER_STATUS.CANCELLED,
			CART_ORDER_STATUS.REFUNDED
		]);
	});
});
