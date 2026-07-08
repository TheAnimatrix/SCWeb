import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { getProduct, getProductReviews } from '$lib/client/catalogApi';

export const load: PageServerLoad = async ({ fetch, params }) => {
	const pid = params.item;

	// Do not await parent() — that serializes layout + page and adds ~200ms+.
	// Layout data (session, supabase, etc.) is already merged into `data` by SvelteKit.
	const [productResult, reviewsResult] = await Promise.all([
		getProduct(fetch, pid),
		getProductReviews(fetch, pid)
	]);

	if (!productResult.ok) {
		return error(404, 'Product not found');
	}

	return {
		product: productResult.data.product,
		reviews: reviewsResult.ok ? reviewsResult.data.reviews : [],
		reviewsError: reviewsResult.ok ? null : reviewsResult.error
	};
};
