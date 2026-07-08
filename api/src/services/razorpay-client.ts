import Razorpay from 'razorpay';
import type { Env } from '../env.js';

export type RazorpayCreateOrderResult = {
	id: string;
	amount: number;
	currency: string;
};

export interface RazorpayClient {
	createOrder(amountPaise: number, receipt: string): Promise<RazorpayCreateOrderResult>;
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
		}
	};
}
