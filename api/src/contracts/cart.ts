import { z } from 'zod';

export const CART_ORDER_STATUS = {
	ACTIVE: 'active',
	PAYMENT_PENDING: 'payment_pending',
	PAID: 'paid',
	FAILED: 'failed',
	FULFILLED: 'fulfilled',
	CANCELLED: 'cancelled',
	REFUNDED: 'refunded'
} as const;

export type CartOrderStatus = (typeof CART_ORDER_STATUS)[keyof typeof CART_ORDER_STATUS];

export const cartItemSchema = z.object({
	product_id: z.string(),
	qty: z.number().int().positive()
});

export type CartItemInput = z.infer<typeof cartItemSchema>;
