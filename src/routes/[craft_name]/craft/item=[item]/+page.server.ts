import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals, params, parent }) => {
    if (!locals.supabaseServer) return { error: true, message: 'Internal server error' };

    const data = await parent();
    const pid = params.item;

    const productResult = await locals.supabaseServer.from('products').select().eq('id', pid);
    if (productResult && !productResult.error && productResult.data && productResult.data.length > 0) {
        const reviews = await locals.supabaseServer.from('reviews').select('*, users(username)').eq('product_id', pid).order('created_at', { ascending: false });

        return {
            product: productResult.data[0],
            reviews: reviews.data,
            reviewsError: reviews.error,
            ...data
        };
    } else {
        return error(404, "Product not found");
    }
};
