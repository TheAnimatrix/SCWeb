import { getActiveCart } from '$lib/client/cart';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({locals,depends}) => {
   depends('cart:change');
   const cart = await getActiveCart(locals.supabase, locals.clientId);
   return {
    cart 
   };
};