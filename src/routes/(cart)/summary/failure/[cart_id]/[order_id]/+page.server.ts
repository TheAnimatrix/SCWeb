import type { PageServerLoad } from './$types';
export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.supabaseServer) return { error: true, message: 'Internal server error' };
	const cartId = params.cart_id;
	const orderId = params.order_id;
	if (!cartId || cartId.length === 0) {
		return { error: true, message: 'Cart is required' };
	}

	const result = await locals.supabaseServer
		.from('cart')
		.update({ status: 'failed' })
		.eq('id', cartId)
		.select();
	const cartData = result.data?.[0];
	if (cartData)
		await locals.supabase.from('purchases').upsert({
			payment_status: 'failed',
			payment_method: 'razorpay',
			payment_id: orderId,
			billing_address: cartData.address,
			shipping_address: cartData.address,
			client_id: cartData.client_id,
			cart_id: cartId,
			amount: cartData.price
		});
	if (!result.error) {
		return { error: false, message: 'Payment failed' };
	} else {
		return { error: true, message: result.error.message };
	}
};
