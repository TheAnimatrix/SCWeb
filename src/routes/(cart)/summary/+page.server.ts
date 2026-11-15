import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/** Bare /summary has no order to show; send the buyer to their cart. */
export const load: PageServerLoad = () => {
	redirect(303, '/cart');
};
