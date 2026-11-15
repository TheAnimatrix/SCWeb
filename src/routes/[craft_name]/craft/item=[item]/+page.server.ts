import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import {
	getProduct,
	getProductReviews,
	getProductVariants,
	isNotFoundStatus
} from '$lib/client/catalogApi';

export const load: PageServerLoad = async ({ fetch, params }) => {
	const pid = params.item;

	// Do not await parent() — that serializes layout + page and adds ~200ms+.
	// Layout data (session, supabase, etc.) is already merged into `data` by SvelteKit.
	// Variants load with the page so the purchase panel doesn't jump when they arrive.
	const [productResult, reviewsResult, variantsResult] = await Promise.all([
		getProduct(fetch, pid),
		getProductReviews(fetch, pid),
		getProductVariants(fetch, pid)
	]);

	if (!productResult.ok) {
		if (isNotFoundStatus(productResult.status)) {
			error(404, 'Product not found');
		}
		// Outage, timeout or 5xx: don't tell crawlers the page is gone.
		console.error(
			'[catalog] product load failed:',
			productResult.status,
			productResult.error.message
		);
		error(503, 'Product unavailable');
	}

	return {
		product: productResult.data.product,
		makerCraftCount: productResult.data.makerCraftCount,
		maker: productResult.data.maker ?? null,
		variants: variantsResult.ok ? variantsResult.data.variants : [],
		reviews: reviewsResult.ok ? reviewsResult.data.reviews : [],
		reviewsError: reviewsResult.ok ? null : reviewsResult.error.message
	};
};
