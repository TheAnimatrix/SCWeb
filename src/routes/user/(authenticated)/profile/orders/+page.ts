import { requireBrowserSupabase } from '$lib/client/requireBrowserSupabase';
import type { Orders } from '$lib/types/product';
import type { PageLoad } from './$types';
export const ssr = false;

export const load: PageLoad = async ({ parent }) => {
	const data = await parent();
	const supabase_lt = requireBrowserSupabase(data.supabase_lt);
	let orders: Orders = [];
	orders = (await supabase_lt.from('purchases').select().order('created_at', { ascending: false }))
		.data as Orders;
	return {
		orders
	};
};
