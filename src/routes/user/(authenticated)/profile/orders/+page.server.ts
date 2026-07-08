import type { Orders } from '$lib/types/product';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
	const { user } = await safeGetSession();
	if (!user) {
		return { orders: [] as Orders };
	}

	const { data } = await supabase
		.from('purchases')
		.select()
		.eq('uid', user.id)
		.order('created_at', { ascending: false });

	return {
		orders: (data ?? []) as unknown as Orders
	};
};
