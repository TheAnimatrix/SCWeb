import type { Orders } from '$lib/types/product';
import type { PageLoad } from './$types';
export const ssr = false;

export const load: PageLoad = async ({parent}) => {
    const data = await parent();
    let orders : Orders = [];
    orders = (await data.supabase_lt.from('purchases').select()).data as Orders;
    return {
        orders
    };
};