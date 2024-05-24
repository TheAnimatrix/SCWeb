import type { Orders } from '$lib/types/product';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
    let orders : Orders = [];
    orders = (await event.locals.supabase.from('purchases').select()).data as Orders;

    return {
        orders
    };
};