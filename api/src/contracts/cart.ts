import { z } from 'zod';
import { productStockSchema } from './stock-schemas.js';

export const DELIVERY_FLAT_FEE = 99;

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

export const cartItemViewSchema = z.object({
	productId: z.string(),
	qty: z.number().int().positive(),
	name: z.string(),
	author: z.string().nullable(),
	guarantee: z.string().nullable(),
	imageUrl: z.string().nullable(),
	unitPrice: z.number().int(),
	stock: productStockSchema
});

export type CartItemView = z.infer<typeof cartItemViewSchema>;

export const cartViewSchema = z.object({
	id: z.string(),
	status: z.string(),
	items: z.array(cartItemViewSchema),
	subtotal: z.number().int(),
	deliveryFee: z.number().int(),
	total: z.number().int()
});

export type CartView = z.infer<typeof cartViewSchema>;

export const getCartResponseSchema = z.object({
	cart: cartViewSchema.nullable()
});

export type GetCartResponse = z.infer<typeof getCartResponseSchema>;

export const upsertCartItemBodySchema = z
	.object({
		qty: z.number().int().min(0).max(10000),
		mode: z.enum(['set', 'add'])
	})
	.strict();

export type UpsertCartItemBody = z.infer<typeof upsertCartItemBodySchema>;

export const mergeCartBodySchema = z
	.object({
		clientId: z.string().min(1)
	})
	.strict();

export type MergeCartBody = z.infer<typeof mergeCartBodySchema>;

export const mergeCartResponseSchema = z.object({
	merged: z.boolean()
});

export type MergeCartResponse = z.infer<typeof mergeCartResponseSchema>;

export const insufficientStockErrorSchema = z.object({
	error: z.literal('insufficient_stock'),
	limit: z.number().int()
});

export type InsufficientStockError = z.infer<typeof insufficientStockErrorSchema>;
