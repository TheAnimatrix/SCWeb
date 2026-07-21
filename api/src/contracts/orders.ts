import { z } from 'zod';
import { checkoutOrderAddressesSchema } from './checkout.js';

export const userOrderItemViewSchema = z.object({
	productId: z.string().uuid(),
	productName: z.string(),
	qty: z.number().int().positive(),
	unitPricePaise: z.number().int(),
	author: z.string().nullable(),
	authorTier: z.string().nullable()
});

export type UserOrderItemView = z.infer<typeof userOrderItemViewSchema>;

export const userOrderViewSchema = z.object({
	id: z.string().uuid(),
	cartId: z.string().uuid(),
	status: z.string(),
	totalPaise: z.number().int(),
	subtotalPaise: z.number().int(),
	deliveryFeePaise: z.number().int(),
	createdAt: z.string(),
	address: checkoutOrderAddressesSchema,
	items: z.array(userOrderItemViewSchema),
	providerPaymentId: z.string().nullable()
});

export type UserOrderView = z.infer<typeof userOrderViewSchema>;

export const listUserOrdersResponseSchema = z.object({
	orders: z.array(userOrderViewSchema)
});

export type ListUserOrdersResponse = z.infer<typeof listUserOrdersResponseSchema>;
