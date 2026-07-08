import Razorpay from 'razorpay';
import { json, type RequestHandler } from '@sveltejs/kit';
import { type CartItem } from '$lib/client/cart';
import type { Product } from '$lib/types/product';
import { canFulfillQuantity, isOnDemand } from '$lib/utils/stock';
import { PUBLIC_RAZORPAY_ID } from '$env/static/public';
import { RAZORPAY_KEY } from '$env/static/private';
import { DELIVERY_FLAT_FEE } from '$lib/constants/numbers';
import { isCartOwnedBy } from '$lib/server/cart';
import { purchaseAlreadyPaid } from '$lib/server/purchases';
import { verifyRazorpaySignature } from '$lib/server/razorpay';
import { getAuthenticatedUserId } from '$lib/server/user';

const instance = new Razorpay({
	key_id: PUBLIC_RAZORPAY_ID,
	key_secret: RAZORPAY_KEY
});

export const PATCH: RequestHandler = async ({ locals, request }) => {
	if (!locals.supabase || !locals.supabaseAdmin || !instance) {
		return json({ error: true, message: 'Internal server error' }, { status: 500 });
	}

	try {
		const data = await request.formData();
		const paymentIdA = data.get('payment_id_a');
		const paymentIdB = data.get('payment_id_b');
		const paymentSignature = data.get('payment_signature');
		if (
			!paymentIdA ||
			typeof paymentIdA !== 'string' ||
			paymentIdA.trim().length === 0 ||
			!paymentIdB ||
			typeof paymentIdB !== 'string' ||
			paymentIdB.trim().length === 0 ||
			!paymentSignature ||
			typeof paymentSignature !== 'string' ||
			paymentSignature.trim().length === 0
		) {
			return json({ error: true, message: 'invalid payment details' }, { status: 400 });
		}

		if (!verifyRazorpaySignature(paymentIdA, paymentIdB, paymentSignature, RAZORPAY_KEY)) {
			return json({ error: true, message: 'invalid payment signature' }, { status: 400 });
		}

		const userId = await getAuthenticatedUserId(locals.supabase);

		const cartLookup = await locals.supabaseAdmin
			.from('cart')
			.select()
			.eq('payment_id_a', paymentIdA)
			.maybeSingle();

		if (cartLookup.error || !cartLookup.data) {
			return json({ error: true, message: 'Order not found' }, { status: 404 });
		}

		const cartData = cartLookup.data;

		if (!isCartOwnedBy(cartData, locals.clientId, userId)) {
			return json({ error: true, message: 'Forbidden' }, { status: 403 });
		}

		if (cartData.status === 'paid') {
			return json({ error: false, message: 'ok' });
		}

		if (cartData.status !== 'payment_pending') {
			return json({ error: true, message: 'Invalid cart state for payment' }, { status: 400 });
		}

		if (await purchaseAlreadyPaid(locals.supabaseAdmin, paymentIdB)) {
			return json({ error: false, message: 'ok' });
		}

		const result = await locals.supabaseAdmin
			.from('cart')
			.update({
				payment_id_a: paymentIdA,
				payment_id_b: paymentIdB,
				payment_signature: paymentSignature,
				status: 'paid'
			})
			.eq('id', cartData.id)
			.eq('status', 'payment_pending')
			.select();

		if (result.error) {
			return json({ error: true, message: result.error.message }, { status: 400 });
		}
		if (!result.data?.length) {
			if (await purchaseAlreadyPaid(locals.supabaseAdmin, paymentIdB)) {
				return json({ error: false, message: 'ok' });
			}
			return json({ error: true, message: 'Payment already finalized' }, { status: 409 });
		}

		const updatedCart = result.data[0];
		const cartSnapshot: (CartItem & { product_name: string })[] = updatedCart.list as (CartItem & {
			product_name: string;
		})[];

		for (const item of updatedCart.list as CartItem[]) {
			const result_get_stock = await locals.supabaseAdmin
				.from('products')
				.select()
				.eq('id', item.product_id);
			const foundItem = cartSnapshot.find((i) => i.product_id === item.product_id);
			if (foundItem && result_get_stock.data?.[0]?.name) {
				foundItem.product_name = result_get_stock.data[0].name;
			}
		}

		const { error: purchaseError } = await locals.supabaseAdmin.from('purchases').insert({
			payment_status: 'paid',
			payment_method: 'razorpay',
			payment_id: paymentIdA,
			payment_id_b: paymentIdB,
			payment_signature: paymentSignature,
			billing_address: updatedCart.address,
			shipping_address: updatedCart.address,
			client_id: updatedCart.client_id,
			cart_id: updatedCart.id,
			amount: updatedCart.price,
			item_snapshot: cartSnapshot,
			uid: userId ?? updatedCart.uid
		});

		if (purchaseError) {
			if (purchaseError.code === '23505') {
				return json({ error: false, message: 'ok' });
			}
			return json({ error: true, message: purchaseError.message }, { status: 400 });
		}

		for (const item of updatedCart.list as CartItem[]) {
			const result_get_stock = await locals.supabaseAdmin
				.from('products')
				.select()
				.eq('id', item.product_id);
			if (result_get_stock?.data?.length) {
				const currentStock = result_get_stock.data[0].stock;
				if (!isOnDemand(currentStock)) {
					await locals.supabaseAdmin
						.from('products')
						.update({
							stock: {
								count: currentStock.count - item.qty,
								status: currentStock.status
							}
						})
						.eq('id', item.product_id);
				}
			}
		}

		return json({ error: false, message: 'ok' });
	} catch {
		return json({ error: true, message: 'Error parsing form data' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.supabase || !locals.supabaseAdmin || !instance) {
		return json({ error: true, message: 'Internal server error' }, { status: 500 });
	}

	try {
		const data = await request.formData();
		const orderId = data.get('orderId');
		if (!orderId || typeof orderId !== 'string' || orderId.trim().length === 0) {
			return json({ error: true, message: 'Order id is required' }, { status: 400 });
		}

		const address = data.get('address');
		if (!address || typeof address !== 'string' || address.trim().length === 0) {
			return json({ error: true, message: 'Address is required' }, { status: 400 });
		}

		const order = await locals.supabaseAdmin.from('cart').select().eq('id', orderId).maybeSingle();
		if (order.error || !order.data) {
			return json({ error: true, message: 'Order not found' }, { status: 400 });
		}

		const orderData = order.data;
		const userId = await getAuthenticatedUserId(locals.supabase);

		if (!isCartOwnedBy(orderData, locals.clientId, userId)) {
			return json({ error: true, message: 'Forbidden' }, { status: 403 });
		}

		if (orderData.status === 'paid') {
			return json({ error: true, message: 'Order already paid' }, { status: 400 });
		}

		if (orderData.status === 'payment_pending') {
			if (orderData.payment_id_a && orderData.price) {
				return json(
					{
						error: false,
						message: 'Order already created',
						orderId: orderData.payment_id_a,
						amount: orderData.price * 100
					},
					{ status: 200 }
				);
			}
			return json({ error: true, message: 'Cart is already awaiting payment' }, { status: 409 });
		}

		if (orderData.status === 'failed') {
			return json(
				{ error: true, message: 'Cart payment failed; please start a new order' },
				{ status: 400 }
			);
		}

		if (orderData.status !== 'active') {
			return json({ error: true, message: 'Invalid cart state for checkout' }, { status: 400 });
		}

		if ((orderData.list ?? []).length <= 0) {
			return json({ error: true, message: 'Order cart is empty' }, { status: 400 });
		}

		let totalPrice = 0;
		const itemList = orderData.list as CartItem[];
		for (const item of itemList) {
			const productResult = await locals.supabaseAdmin
				.from('products')
				.select()
				.eq('id', item.product_id);
			if (productResult.error || !productResult.data?.length) {
				return json(
					{ error: true, message: 'One ore more products in the cart are invalid' },
					{ status: 400 }
				);
			}
			const stock = productResult.data[0].stock;
			if (!canFulfillQuantity(stock, item.qty)) {
				return json(
					{
						error: true,
						message: 'Unable to checkout. One ore more products in the cart are out of stock.'
					},
					{ status: 400 }
				);
			}
			const product: Product = productResult.data[0];
			totalPrice += product.price.new * item.qty;
		}

		if (totalPrice == 0) {
			return json({ error: true, message: 'Unexpected error: Order cart is 0' }, { status: 400 });
		}
		totalPrice += DELIVERY_FLAT_FEE;

		try {
			const paymentOrderResult = await instance.orders.create({
				amount: totalPrice * 100,
				currency: 'INR',
				receipt: orderData.id
			});
			const updateResult = await locals.supabaseAdmin
				.from('cart')
				.update({
					payment_id_a: paymentOrderResult.id,
					address: address,
					price: totalPrice,
					status: 'payment_pending'
				})
				.eq('id', orderData.id)
				.eq('status', 'active')
				.select();

			if (updateResult.error) {
				return json({ error: true, message: updateResult.error.message }, { status: 400 });
			}

			if (!updateResult.data?.length) {
				const refreshed = await locals.supabaseAdmin
					.from('cart')
					.select()
					.eq('id', orderData.id)
					.maybeSingle();

				if (
					refreshed.data?.status === 'payment_pending' &&
					refreshed.data.payment_id_a &&
					refreshed.data.price
				) {
					return json(
						{
							error: false,
							message: 'Order already created',
							orderId: refreshed.data.payment_id_a,
							amount: refreshed.data.price * 100
						},
						{ status: 200 }
					);
				}

				return json(
					{ error: true, message: 'Unable to start checkout for this cart' },
					{ status: 409 }
				);
			}

			return json(
				{
					error: false,
					message: 'Order created successfully',
					orderId: paymentOrderResult.id,
					amount: paymentOrderResult.amount
				},
				{ status: 200 }
			);
		} catch (err) {
			const e = err as {
				statusCode: number;
				error: { code: string; description: string; reason: string; source: string };
			};
			return json({ error: true, message: e.error.description }, { status: e.statusCode });
		}
	} catch {
		return json({ error: true, message: 'Error parsing form data' }, { status: 500 });
	}
};
