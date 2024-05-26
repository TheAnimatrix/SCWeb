import type { Product } from '$lib/types/product';
import type { PageLoad } from './$types';
export const ssr = false;

export const load: PageLoad = async ({parent}) => {
	const data = await parent();
	const uid = (await data.supabase_lt.auth.getUser()).data.user?.id;
	let products: Product[];
	if (!uid) return {};

	const result = await data.supabase_lt.from('products').select('*').eq('uid', uid);

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
