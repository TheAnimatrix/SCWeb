import type { Product } from '$lib/types/product';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const uid = (await event.locals.supabase.auth.getUser()).data.user?.id;
	let products: Product[];
	if (!uid) return {};

	const result = await event.locals.supabase.from('products').select('*').eq('uid', uid);

	products = [];
	if (result.error || !result.data) {
		null;
	} else {
		products = result.data as Product[];
	}
	return {
		products,
		uid
	};
};
