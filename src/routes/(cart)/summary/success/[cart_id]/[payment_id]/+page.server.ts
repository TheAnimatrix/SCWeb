import { getCheckoutOrderStatus } from '$lib/client/cartApi';
import type { PageServerLoad } from './$types';

/**
 * The order is looked up by Razorpay payment ID through the API, which only returns it to its
 * owner (the signed-in buyer, or the guest whose signed client-id cookie placed it). Anyone else
 * gets "not found", so this page never confirms someone else's order. The first URL segment
 * (order or print request ID) is not trusted.
 */
export const load: PageServerLoad = async ({ params, fetch, locals }) => {
	const [result, userResult] = await Promise.all([
		getCheckoutOrderStatus(fetch, { paymentId: params.payment_id }),
		locals.supabase.auth.getUser()
	]);

	const user = userResult.data.user;

	return {
		paymentId: params.payment_id,
		order: result.ok ? result.data : null,
		lookupFailed: !result.ok && result.error.kind !== 'order_not_found',
		signedIn: user != null,
		accountEmail: user?.email ?? null
	};
};
