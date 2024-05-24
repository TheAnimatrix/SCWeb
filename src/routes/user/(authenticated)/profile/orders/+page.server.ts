import type { Orders } from '$lib/types/product';
import { TimerReset } from 'lucide-svelte';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
    let orders : Orders = [];
    orders = (await event.locals.supabase.from('purchases').select()).data as Orders;
    await sleep(()=>{},5000);
    return {
        orders
    };
};

function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
async function sleep(fn, ...args) {
    await timeout(3000);
    return fn(...args);
}