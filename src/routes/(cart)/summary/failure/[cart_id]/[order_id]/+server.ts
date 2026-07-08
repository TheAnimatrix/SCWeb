import { json, type RequestHandler } from '@sveltejs/kit';
import { isCartOwnedBy } from '$lib/server/cart';
import { getAuthenticatedUserId } from '$lib/server/user';

/**
 * Idempotent, ownership-checked cart failure finalization.
 * Called from the checkout flow when Razorpay reports payment failure.
 */
export const POST: RequestHandler = async ({ locals, params }) => {
	if (!locals.supabase || !locals.supabaseAdmin) {
		return json({ error: true, message: 'Internal server error' }, { status: 500 });
	}

	const cartId = params.cart_id;
	const razorpayOrderId = params.order_id;

	if (!cartId || !razorpayOrderId) {
		return json({ error: true, message: 'Cart and order id are required' }, { status: 400 });
	}

	const { data: cart, error: cartError } = await locals.supabaseAdmin
		.from('cart')
		.select()
		.eq('id', cartId)
		.maybeSingle();

	if (cartError || !cart) {
		return json({ error: true, message: 'Cart not found' }, { status: 404 });
	}

	const userId = await getAuthenticatedUserId(locals.supabase);
	if (!isCartOwnedBy(cart, locals.clientId, userId)) {
		return json({ error: true, message: 'Forbidden' }, { status: 403 });
	}

	if (cart.payment_id_a && cart.payment_id_a !== razorpayOrderId) {
		return json({ error: true, message: 'Order id mismatch' }, { status: 400 });
	}

	if (cart.status === 'paid') {
		return json({ error: false, message: 'Cart already paid' });
	}

	if (cart.status === 'failed') {
		return json({ error: false, message: 'Payment already marked failed' });
	}

	if (cart.status !== 'payment_pending') {
		return json({ error: true, message: 'Cart is not awaiting payment' }, { status: 400 });
	}

	const { error: updateError } = await locals.supabaseAdmin
		.from('cart')
		.update({ status: 'failed' })
		.eq('id', cartId)
		.eq('status', 'payment_pending');

	if (updateError) {
		return json({ error: true, message: updateError.message }, { status: 400 });
	}

	const { data: existingFailure } = await locals.supabaseAdmin
		.from('purchases')
		.select('id')
		.eq('cart_id', cartId)
		.eq('payment_id', razorpayOrderId)
		.eq('payment_status', 'failed')
		.maybeSingle();

	if (!existingFailure) {
		await locals.supabaseAdmin.from('purchases').insert({
			payment_status: 'failed',
			payment_method: 'razorpay',
			payment_id: razorpayOrderId,
			billing_address: cart.address,
			shipping_address: cart.address,
			client_id: cart.client_id,
			cart_id: cartId,
			amount: cart.price,
			uid: userId ?? cart.uid
		});
	}

	return json({ error: false, message: 'Payment failed' });
};
