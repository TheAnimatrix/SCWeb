import { getActiveCart } from '$lib/client/cart';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const cart = await getActiveCart(event.locals.supabase, event.locals.clientId);
	if(cart.error || (cart.data?.list??[]).length <= 0){
		throw redirect(303, '/cart');
	}
	const resultUser = await event.locals.supabase.auth.getSession();
	const userExists = (resultUser.data.session != null && resultUser.data.session) ? true : false;
	let addresses;
	if (userExists) {
		addresses = await event.locals.supabase.from('addresses').select('*').eq('uid', resultUser.data.session?.user.id);

		if (addresses.error) {
			addresses = undefined;
		} else {
			addresses = addresses.data;
		}
	} else addresses = undefined;
	return { email: resultUser.data.session?.user.email, userExists: userExists, addresses: addresses, cart};
};
