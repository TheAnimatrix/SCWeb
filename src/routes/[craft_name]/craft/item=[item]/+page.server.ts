import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { getAvatarUrlFromMetadata } from '$lib/utils/userAvatar';

export const load: PageServerLoad = async ({ locals, params, parent }) => {
    if (!locals.supabaseServer) return { error: true, message: 'Internal server error' };

    const data = await parent();
    const pid = params.item;

    const productResult = await locals.supabaseServer.from('products').select('*,users(tier,username)').eq('id', pid);
    if (productResult && !productResult.error && productResult.data && productResult.data.length > 0) {
        const product = productResult.data[0];
        const reviews = await locals.supabaseServer.from('reviews').select('*, users(username,tier)').eq('product_id', pid).order('created_at', { ascending: false });

        let makerAvatarUrl: string | null = null;
        if (product.uid) {
            const { data: authUser } = await locals.supabaseServer.auth.admin.getUserById(product.uid);
            makerAvatarUrl = getAvatarUrlFromMetadata(authUser?.user?.user_metadata);
        }

        return {
            product,
            reviews: reviews.data,
            reviewsError: reviews.error,
            makerAvatarUrl,
            ...data
        };
    } else {
        return error(404, "Product not found");
    }
};
