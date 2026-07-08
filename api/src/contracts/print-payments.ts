import { z } from 'zod';
import { checkoutAddressSchema } from './address.js';
import { printRequestIdParamSchema } from './print-files.js';

export { printRequestIdParamSchema };

export const createPrintPaymentOrderBodySchema = z
	.object({
		address: checkoutAddressSchema
	})
	.strict();

export type CreatePrintPaymentOrderBody = z.infer<typeof createPrintPaymentOrderBodySchema>;

export const createPrintPaymentOrderResponseSchema = z.object({
	razorpayOrderId: z.string(),
	amountPaise: z.number().int().positive(),
	currency: z.literal('INR')
});

export type CreatePrintPaymentOrderResponse = z.infer<typeof createPrintPaymentOrderResponseSchema>;

export const confirmPrintPaymentBodySchema = z
	.object({
		razorpayOrderId: z.string().min(1),
		razorpayPaymentId: z.string().min(1),
		razorpaySignature: z.string().min(1)
	})
	.strict();

export type ConfirmPrintPaymentBody = z.infer<typeof confirmPrintPaymentBodySchema>;

export const confirmPrintPaymentResponseSchema = z.object({
	status: z.enum(['paid', 'already_paid'])
});

export type ConfirmPrintPaymentResponse = z.infer<typeof confirmPrintPaymentResponseSchema>;

export const failPrintPaymentBodySchema = z
	.object({
		razorpayOrderId: z.string().min(1),
		reason: z.string().optional()
	})
	.strict();

export type FailPrintPaymentBody = z.infer<typeof failPrintPaymentBodySchema>;

export const failPrintPaymentResponseSchema = z.object({
	status: z.string()
});

export type FailPrintPaymentResponse = z.infer<typeof failPrintPaymentResponseSchema>;
