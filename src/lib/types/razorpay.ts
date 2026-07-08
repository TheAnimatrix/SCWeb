export interface RazorpayCheckoutSuccessResponse {
	razorpay_order_id: string;
	razorpay_payment_id: string;
	razorpay_signature: string;
}

export interface RazorpayPaymentFailedResponse {
	error?: {
		metadata?: { order_id?: string };
		description?: string;
	};
}

export interface RazorpayCheckoutOptions {
	key: string;
	amount: number;
	currency: string;
	name: string;
	image?: string;
	order_id: string;
	handler: (response: RazorpayCheckoutSuccessResponse) => void | Promise<void>;
	modal?: {
		ondismiss?: () => void | Promise<void>;
	};
	prefill?: Record<string, string>;
	theme?: {
		color?: string;
	};
}
