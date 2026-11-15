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
	 * (network error, unknown order); callers then carry on as if nothing was found.
	 * Optional so test doubles and the unconfigured stub can leave it out.
	 */
	fetchOrderPayments?(orderId: string): Promise<RazorpayOrderPayment[] | null>;
}

/** The captured payment on a Razorpay order, if Razorpay reports one. */
export async function findCapturedPayment(
	client: RazorpayClient,
	orderId: string
): Promise<RazorpayOrderPayment | null> {
	if (!client.fetchOrderPayments) return null;
	const payments = await client.fetchOrderPayments(orderId);
	return payments?.find((payment) => payment.status === 'captured') ?? null;
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
				const order = await instance.orders.fetch(orderId);
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
				const result = await instance.orders.fetchPayments(orderId);
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
