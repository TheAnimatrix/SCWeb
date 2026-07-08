import type { PageServerLoad } from './$types';

/** Read-only load; failure state is recorded via POST on this route. */
export const load: PageServerLoad = async () => {
	return { error: false, message: 'Payment failed' };
};
