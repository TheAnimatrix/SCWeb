import type { Product } from '$lib/stores/types/product.js';
import { error } from '@sveltejs/kit';


export async function load({params, parent}){
    const data = await parent();
    const result = await data.supabase_lt.from('products').select().eq('id',params.item);
    if(result && !result.error && result.data && result.data.length > 0)
    {
        return {product:result.data[0] as Product};
    }
    else
        return error(404, "Product not found")
}