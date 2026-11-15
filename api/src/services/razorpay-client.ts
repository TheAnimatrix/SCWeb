import Razorpay from 'razorpay';
import type { Env } from '../env.js';

export type RazorpayCreateOrderResult = {
	id: string;
	amount: number;
	currency: string;
};

export type RazorpayOrderPayment = {
	id: string;
	/** `created` | `authorized` | `captured` | `refunded` | `failed` */
	status: string;
	amount: number;
	currency: string;
};

export interface RazorpayClient {
	createOrder(amountPaise: number, receipt: string): Promise<RazorpayCreateOrderResult>;
	/** Returns null when the order is missing or belongs to a different Razorpay account. */
	fetchOrder(orderId: string): Promise<RazorpayCreateOrderResult | null>;
	/**
	 * Payments made against a Razorpay order. Returns null when Razorpay could not be asked
	 * (network error, unknown order). Optional so test doubles and the unconfigured stub can leave
	 * it out; a client without it reports every earlier order as not captured.
	 */
	fetchOrderPayments?(orderId: string): Promise<RazorpayOrderPayment[] | null>;
}

/** How long checkout waits for Razorpay to say whether an earlier order was paid. */
export const PAYMENT_LOOKUP_TIMEOUT_MS = 8000;

/**
 * What Razorpay says about an earlier Razorpay order. `unknown` means Razorpay could not be asked
 * (error, timeout) or a payment is authorised but not captured yet: the buyer may have paid, so
 * the caller must not start another payment.
 */
export type CapturedPaymentLookup =
	| { kind: 'captured'; payment: RazorpayOrderPayment }
	| { kind: 'not_captured' }
	| { kind: 'unknown' };

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T | 'timeout'> {
	let timer: ReturnType<typeof setTimeout> | undefined;
	try {
		return await Promise.race([
			promise,
			new Promise<'timeout'>((resolve) => {
				timer = setTimeout(() => resolve('timeout'), timeoutMs);
			})
		]);
	} finally {
		if (timer) clearTimeout(timer);
	}
}

/** Asks Razorpay whether a Razorpay order has a captured payment, waiting at most `timeoutMs`. */
export async function lookupCapturedPayment(
	client: RazorpayClient,
	orderId: string,
	timeoutMs = PAYMENT_LOOKUP_TIMEOUT_MS
): Promise<CapturedPaymentLookup> {
	if (!client.fetchOrderPayments) return { kind: 'not_captured' };
	try {
		const payments = await withTimeout(client.fetchOrderPayments(orderId), timeoutMs);
		if (payments === 'timeout' || payments === null) return { kind: 'unknown' };
		const captured = payments.find((payment) => payment.status === 'captured');
		if (captured) return { kind: 'captured', payment: captured };
		// Money is held but not captured yet (auto-capture runs shortly): not safe to charge again.
		if (payments.some((payment) => payment.status === 'authorized')) return { kind: 'unknown' };
		return { kind: 'not_captured' };
	} catch {
		return { kind: 'unknown' };
	}
}

export function isPaymentsConfigured(env: Env): boolean {
	return Boolean(env.PUBLIC_RAZORPAY_ID && env.RAZORPAY_KEY);
}

export function createRazorpayClient(env: Env): RazorpayClient {
	if (!env.PUBLIC_RAZORPAY_ID || !env.RAZORPAY_KEY) {
		throw new Error('Razorpay credentials are not configured');
	}

	const instance = new Razorpay({
		key_id: env.PUBLIC_RAZORPAY_ID,
		key_secret: env.RAZORPAY_KEY
	});

	return {
		async createOrder(amountPaise, receipt) {
			const order = await instance.orders.create({
				amount: amountPaise,
				currency: 'INR',
				receipt
			});

			return {
				id: order.id,
				amount: Number(order.amount),
				currency: order.currency
			};
		},
		async fetchOrder(orderId) {
			try {
				const order = await withTimeout(instance.orders.fetch(orderId), PAYMENT_LOOKUP_TIMEOUT_MS);
				if (order === 'timeout') return null;
				return {
					id: order.id,
					amount: Number(order.amount),
					currency: order.currency
				};
			} catch {
				return null;
			}
		},
		async fetchOrderPayments(orderId) {
			try {
				const result = await withTimeout(
					instance.orders.fetchPayments(orderId),
					PAYMENT_LOOKUP_TIMEOUT_MS
				);
				if (result === 'timeout') return null;
				return result.items.map((payment) => ({
					id: payment.id,
					status: String(payment.status),
					amount: Number(payment.amount),
					currency: String(payment.currency)
				}));
			} catch {
				return null;
			}
		}
	};
}
