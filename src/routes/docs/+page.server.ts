import { docsProducts } from '$lib/docs/registry';
import { listDocPages } from '$lib/server/docs/content';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => ({
	products: docsProducts.map((product) => ({
		...product,
		pageCount: listDocPages(product.slug).length
	}))
});
