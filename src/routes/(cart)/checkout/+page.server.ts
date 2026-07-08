import { getCart } from '$lib/client/cartApi';
import { asAddressList } from '$lib/types/product';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const result = await getCart(event.fetch);

	const resultUser = await event.locals.supabase.auth.getUser();
	const userExists = resultUser.data.user != null && resultUser.data.user ? true : false;
	let addresses;
	if (userExists) {
		const userId = resultUser.data.user?.id;
		if (!userId) {
			addresses = undefined;
		} else {
			const addressResult = await event.locals.supabase
				.from('addresses')
				.select('*')
				.eq('uid', userId);

			if (addressResult.error) {
				addresses = undefined;
			} else {
				addresses = asAddressList(addressResult.data);
			}
		}
	} else addresses = undefined;

	if (!result.ok) {
		return {
			email: resultUser.data.user?.email,
			userExists,
			addresses,
			cart: null,
			apiError: true
		};
	}

	const cart = result.data.cart;
	if (!cart || cart.items.length <= 0) {
		throw redirect(303, '/cart');
	}

	return {
		email: resultUser.data.user?.email,
		userExists,
		addresses,
		cart,
		apiError: false
	};
};
