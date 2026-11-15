import { getCheckoutOrderStatus } from '$lib/client/cartApi';
import type { PageServerLoad } from './$types';

/**
 * The reason comes from the URL, so only show short plain sentences (what Razorpay sends,
 * e.g. "Payment was declined by the bank."), never links, addresses or numbers to call.
 */
function safeReason(raw: string | null): string | null {
	const value = raw?.trim();
	if (!value || value.length > 160) return null;
	if (!/^[A-Za-z ,.'()-]+$/.test(value)) return null;
	if (/\b(www|https?|com|org|net)\b/i.test(value)) return null;
	return value;
}

/**
 * `order_id` is the Razorpay order ID. Shop checkout and print payments both land here, so look
 * up which one it was (owner-only) to send "Try again" to the right place.
 * Query: `reason` (Razorpay's error description), `payment` (Razorpay payment ID, if known).
 */
export const load: PageServerLoad = async ({ params, url, fetch }) => {
	const result = await getCheckoutOrderStatus(fetch, { razorpayOrderId: params.order_id });
	const kind = result.ok ? result.data.kind : null;

	const reason = safeReason(url.searchParams.get('reason'));
	const rawPaymentId = url.searchParams.get('payment');
	const paymentId =
		rawPaymentId && /^pay_[A-Za-z0-9]{6,40}$/.test(rawPaymentId) ? rawPaymentId : null;

	return {
		razorpayOrderId: params.order_id,
		paymentId,
		reason,
		retryHref:
			result.ok && result.data.kind === 'print_request'
				? `/3dp-portal/user/${result.data.printRequestId}`
				: '/checkout',
		isPrint: kind === 'print_request'
	};
};
