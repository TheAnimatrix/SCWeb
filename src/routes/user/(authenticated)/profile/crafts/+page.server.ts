import type { Product } from '$lib/types/product';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
	const { user } = await safeGetSession();
	if (!user) {
		return {};
	}

	const result = await supabase.from('products').select('*').eq('uid', user.id);

	let products: Product[] = [];
	if (!result.error && result.data) {
		products = result.data as Product[];
	}

	return {
		products,
		uid: user.id
	};
};
