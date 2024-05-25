import { getActiveCart } from '$lib/client/cart';
import { checkUser } from '$lib/server/user';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const cart = await getActiveCart(event.locals.supabase, event.locals.clientId);
	if(cart.error || (cart.data?.list??[]).length <= 0){
		throw redirect(303, '/cart');
	}
	const result = await checkUser(event.locals.supabase);
	let addresses;
	if (result) {
		addresses = await event.locals.supabase.from('addresses').select('*');

		if (addresses.error) {
			addresses = undefined;
		} else {
			addresses = addresses.data;
		}
	} else addresses = undefined;
	return { userExists: result, addresses: addresses, cart};
};
