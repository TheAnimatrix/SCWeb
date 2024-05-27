import Razorpay from 'razorpay';
import { json, type RequestHandler } from '@sveltejs/kit';
import { type CartItem } from '$lib/client/cart';
import type { Product } from '$lib/types/product';
import { PUBLIC_RAZORPAY_ID } from '$env/static/public';
import { RAZORPAY_KEY } from '$env/static/private';
import { DELIVERY_FLAT_FEE } from '$lib/constants/numbers';

const instance = new Razorpay({
	key_id: PUBLIC_RAZORPAY_ID,
	key_secret: RAZORPAY_KEY
});

export const PATCH: RequestHandler = async ({ locals, request }) => {
	if (!locals.supabase || !locals.supabaseServer || !instance)
		return json({ error: true, message: 'Internal server error' }, { status: 500 });
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
		const result = await locals.supabaseServer
			.from('cart')
			.update({
				payment_id_a: paymentIdA,
				payment_id_b: paymentIdB,
				payment_signature: paymentSignature,
				status: 'paid'
			})
			.eq('payment_id_a', paymentIdA)
			.select();
		if (result.error) return json({ error: true, message: result.error.message }, { status: 400 });
		if (!result.error && result.data.length > 0) {
			const cartData = result.data[0];
			// reduce qty from stock
			for (const item of cartData.list as CartItem[]) {
				//get stock
				const result_get_stock = await locals.supabase
					.from('products')
					.select()
					.eq('id', item.product_id);
				//change stock
				if (result_get_stock && result_get_stock.data && result_get_stock.data.length > 0) {
					await locals.supabaseServer
						.from('products')
						.update({ stock: { count: result_get_stock.data[0].stock.count - item.qty , status: result_get_stock.data[0].stock.status} })
						.eq('id', item.product_id);
				}
			}
			// add to purchases
			await locals.supabase.from('purchases').insert({
				payment_status: 'paid',
				payment_method: 'razorpay',
				payment_id: paymentIdA,
				payment_signature: paymentSignature,
				billing_address: cartData.address,
				shipping_address: cartData.address,
				client_id: cartData.client_id,
				cart_id: cartData.id,
				amount: cartData.price
			});
		}
		return json({ error: false, message: 'ok' });
	} catch (error) {
		return json({ error: true, message: 'Error parsing form data' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.supabase || !locals.supabaseServer || !instance)
		return json({ error: true, message: 'Internal server error' }, { status: 500 });
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

		const order = await locals.supabaseServer.from('cart').select().eq('id', orderId);
		if (!(!order.error && order.data && order.data.length > 0))
			return json({ error: true, message: 'Order not found' }, { status: 400 });
		const orderData = order.data[0];
		// if(orderData.payment_id) await instance.orders.edit(orderData.payment_id, {})
		if ((orderData.list ?? []).length <= 0)
			return json({ error: true, message: 'Order cart is empty' }, { status: 400 });
		let totalPrice = 0;
		const itemList = orderData.list as CartItem[];
		for (const item of itemList) {
			const productResult = await locals.supabaseServer
				.from('products')
				.select()
				.eq('id', item.product_id);
			if (productResult.error)
				return json(
					{ error: true, message: 'One ore more products in the cart are invalid' },
					{ status: 400 }
				);
			const product: Product = productResult.data[0];
			totalPrice += product.price.new * item.qty;
		}
		if (totalPrice == 0)
			return json({ error: true, message: 'Unexpected error: Order cart is 0' }, { status: 400 });
		else totalPrice += DELIVERY_FLAT_FEE;

		try {
			const paymentOrderResult = await instance.orders.create({
				amount: totalPrice * 100,
				currency: 'INR',
				receipt: orderData.id
			});
			await locals.supabaseServer
				.from('cart')
				.update({ payment_id_a: paymentOrderResult.id, address: address, price: totalPrice })
				.eq('id', orderData.id);
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
	} catch (error) {
		return json({ error: true, message: 'Error parsing form data' }, { status: 500 });
	}
};
