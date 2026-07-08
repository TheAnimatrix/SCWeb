import { getActiveCart } from '$lib/client/cart';
import { asAddressList } from '$lib/types/product';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const cart = await getActiveCart(event.locals.supabase, event.locals.clientId);
	if (cart.error || (cart.data?.list ?? []).length <= 0) {
		throw redirect(303, '/cart');
	}
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
	return { email: resultUser.data.user?.email, userExists: userExists, addresses: addresses, cart };
};
