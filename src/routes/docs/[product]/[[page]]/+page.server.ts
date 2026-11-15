import { error } from '@sveltejs/kit';
import { getDocsProduct } from '$lib/docs/registry';
import { getDocPage, getDocsMeta, listDocPages } from '$lib/server/docs/content';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const product = getDocsProduct(params.product);
	if (!product) error(404, 'Docs not found');

	const page = await getDocPage(product.slug, params.page ?? '');
	if (!page) error(404, 'Docs page not found');

	return {
		product,
		page,
		pages: listDocPages(product.slug),
		meta: getDocsMeta(product.slug)
	};
};
