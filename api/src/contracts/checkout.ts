import { z } from 'zod';
import { checkoutAddressSchema } from './address.js';

export const checkoutOrderAddressesSchema = z
	.object({
		shipping: checkoutAddressSchema,
		billing: checkoutAddressSchema
	})
	.strict();

export type CheckoutOrderAddresses = z.infer<typeof checkoutOrderAddressesSchema>;

export const createCheckoutOrderBodySchema = z
	.object({
		/** Shipping address (legacy field name kept for compatibility). */
		address: checkoutAddressSchema,
		billingAddress: checkoutAddressSchema.optional(),
		/** Skip reusing a stored Razorpay order (e.g. after a stale order_id error). */
		refreshPayment: z.boolean().optional()
	})
	.strict();

export type CreateCheckoutOrderBody = z.infer<typeof createCheckoutOrderBodySchema>;

export const createCheckoutOrderResponseSchema = z.object({
	orderId: z.string().uuid(),
	razorpayOrderId: z.string(),
	amountPaise: z.number().int().positive(),
	currency: z.literal('INR')
});

export type CreateCheckoutOrderResponse = z.infer<typeof createCheckoutOrderResponseSchema>;

export const confirmCheckoutBodySchema = z
	.object({
		razorpayOrderId: z.string().min(1),
		razorpayPaymentId: z.string().min(1),
		razorpaySignature: z.string().min(1)
	})
	.strict();

export type ConfirmCheckoutBody = z.infer<typeof confirmCheckoutBodySchema>;

export const confirmCheckoutResponseSchema = z.object({
	status: z.enum(['paid', 'already_paid'])
});

export type ConfirmCheckoutResponse = z.infer<typeof confirmCheckoutResponseSchema>;

export const failCheckoutBodySchema = z
	.object({
		razorpayOrderId: z.string().min(1),
		reason: z.string().optional()
	})
	.strict();

export type FailCheckoutBody = z.infer<typeof failCheckoutBodySchema>;

export const failCheckoutResponseSchema = z.object({
	status: z.string()
});

export type FailCheckoutResponse = z.infer<typeof failCheckoutResponseSchema>;
