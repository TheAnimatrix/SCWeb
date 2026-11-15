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
	/** Whole INR rupees — mirrors the cart total used for this payment. */
	totalRupees: z.number().int().positive(),
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
	status: z.enum(['paid', 'already_paid']),
	/** `orders.id` — the ID shown in e-mails and the order list. */
	orderId: z.string().uuid()
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

/** Look up a cart order (or print payment) by Razorpay payment ID or Razorpay order ID. */
export const checkoutOrderStatusQuerySchema = z
	.object({
		paymentId: z.string().min(1).max(64).optional(),
		razorpayOrderId: z.string().min(1).max(64).optional()
	})
	.refine((value) => Boolean(value.paymentId || value.razorpayOrderId), {
		message: 'paymentId or razorpayOrderId is required'
	});

export type CheckoutOrderStatusQuery = z.infer<typeof checkoutOrderStatusQuerySchema>;

export type CheckoutOrderStatusResponse =
	| {
			kind: 'cart_order';
			orderId: string;
			/** `payment_pending` | `paid` | `failed` | `fulfilled` | `cancelled` | `refunded` */
			status: string;
			items: { productId: string; name: string; qty: number; unitPriceRupees: number }[];
			subtotalRupees: number;
			deliveryFeeRupees: number;
			totalRupees: number;
			shipping: {
				name: string | null;
				line1: string | null;
				line2: string | null;
				city: string | null;
				state: string | null;
				pincode: string | null;
			} | null;
			/** Contact e-mail typed at checkout (guests). Signed-in buyers get mail at their account e-mail. */
			email: string | null;
			createdAt: string;
	  }
	| {
			kind: 'print_request';
			printRequestId: string;
			paid: boolean;
	  };
