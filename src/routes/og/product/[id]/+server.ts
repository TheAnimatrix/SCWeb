import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getProduct } from '$lib/client/catalogApi';
import { generateProductOgImage } from '$lib/server/og-product-image';
import { productImageUrl } from '$lib/seo/product';

const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const GET: RequestHandler = async ({ params, fetch }) => {
	if (!UUID_RE.test(params.id)) {
		return error(404, 'Product not found');
	}

	const productResult = await getProduct(fetch, params.id);
	if (!productResult.ok) {
		return error(404, 'Product not found');
	}

	const product = productResult.data.product;
	const image = generateProductOgImage(product.name, productImageUrl(product));

	return new Response(await image, {
		headers: {
			'Content-Type': 'image/jpeg',
			'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400'
		}
	});
};
