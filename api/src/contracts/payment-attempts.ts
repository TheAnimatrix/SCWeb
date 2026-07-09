import { z } from 'zod';

export const PAYMENT_ATTEMPT_KIND = {
	CART_ORDER: 'cart_order',
	PRINT_REQUEST: 'print_request'
} as const;

export type PaymentAttemptKind = (typeof PAYMENT_ATTEMPT_KIND)[keyof typeof PAYMENT_ATTEMPT_KIND];

export const PAYMENT_ATTEMPT_STATUS = {
	PENDING: 'pending',
	PAID: 'paid',
	FAILED: 'failed'
} as const;

export type PaymentAttemptStatus =
	(typeof PAYMENT_ATTEMPT_STATUS)[keyof typeof PAYMENT_ATTEMPT_STATUS];

export const PAYMENT_PROVIDER = {
	RAZORPAY: 'razorpay'
} as const;

export type PaymentProvider = (typeof PAYMENT_PROVIDER)[keyof typeof PAYMENT_PROVIDER];

export const paymentAttemptKindSchema = z.enum([
	PAYMENT_ATTEMPT_KIND.CART_ORDER,
	PAYMENT_ATTEMPT_KIND.PRINT_REQUEST
]);

export const paymentAttemptStatusSchema = z.enum([
	PAYMENT_ATTEMPT_STATUS.PENDING,
	PAYMENT_ATTEMPT_STATUS.PAID,
	PAYMENT_ATTEMPT_STATUS.FAILED
]);
