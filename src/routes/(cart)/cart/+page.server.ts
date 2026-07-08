import { getCart } from '$lib/client/cartApi';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch, depends }) => {
	depends('cart:change');
	const result = await getCart(fetch);
	return {
		cart: result.ok ? result.data.cart : null
	};
};
