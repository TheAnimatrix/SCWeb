import type { Product } from '$lib/types/product';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
	const { user } = await safeGetSession();
	if (!user) {
		return {};
	}

	const [productsResult, profileResult] = await Promise.all([
		supabase.from('products').select('*').eq('uid', user.id),
		supabase.from('users').select('username, tier').eq('id', user.id).maybeSingle()
	]);

	const maker = profileResult.data
		? {
				username: profileResult.data.username,
				tier: profileResult.data.tier
			}
		: null;

	let products: Product[] = [];
	if (!productsResult.error && productsResult.data) {
		products = productsResult.data.map((product) => ({
			...product,
			users: maker
		})) as Product[];
	}

	return {
		products,
		uid: user.id
	};
};
