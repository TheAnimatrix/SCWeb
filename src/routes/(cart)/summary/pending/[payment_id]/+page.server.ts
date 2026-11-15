import { redirect } from '@sveltejs/kit';
import { getCheckoutOrderStatus } from '$lib/client/cartApi';
import type { PageServerLoad } from './$types';

/**
 * "Payment received, confirming your order". Checkout sends the buyer here when Razorpay
 * reported success but /checkout/confirm failed. The Razorpay `payment.captured` webhook
 * (api/src/services/razorpay-webhooks.ts) marks the order paid and sends the receipt e-mail,
 * so the page polls until the order shows as paid, then moves to the success page.
 * The API only returns the order to its owner.
 */
export const load: PageServerLoad = async ({ params, url, fetch, depends }) => {
	depends('checkout:pending');

	const razorpayOrderId = url.searchParams.get('order') ?? undefined;
	// Only a hint from checkout. What the server recorded for this payment comes first.
	const reasonParam = url.searchParams.get('reason');

	const result = await getCheckoutOrderStatus(fetch, {
		paymentId: params.payment_id,
		razorpayOrderId
	});

	const order = result.ok && result.data.kind === 'cart_order' ? result.data : null;
	const confirmed = order != null && (order.status === 'paid' || order.status === 'fulfilled');
	const recorded = order?.needsSupport ?? null;
	const soldOut = recorded === 'stock_conflict' || (!recorded && reasonParam === 'stock');
	const duplicate = recorded === 'duplicate_payment' || (!recorded && reasonParam === 'duplicate');
	const mismatch = recorded === 'payment_mismatch' || (!recorded && reasonParam === 'mismatch');
	const notPayable = recorded === 'not_payable';

	if (confirmed && !soldOut && !duplicate && !mismatch && !notPayable) {
		redirect(303, `/summary/success/${order.orderId}/${encodeURIComponent(params.payment_id)}`);
	}

	return {
		paymentId: params.payment_id,
		orderId: order?.orderId ?? null,
		found: order != null,
		confirmed,
		soldOut,
		duplicate,
		mismatch,
		notPayable
	};
};
