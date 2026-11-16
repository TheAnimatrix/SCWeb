import { error } from '@sveltejs/kit';
import { isStaffUser } from '$lib/server/maker';
import { getInterestList, sortEntriesNewestFirst } from '$lib/client/adminInterestApi';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, fetch, params }) => {
	// Names, phone numbers and addresses: staff only, checked before anything is fetched.
	const { session, user } = await locals.safeGetSession();
	if (!session || !user || !isStaffUser(user.id)) {
		throw error(403, 'Staff only');
	}
	const result = await getInterestList(fetch, params.productId);
	if (!result.ok) {
		if (result.error.kind === 'product_not_found') throw error(404, 'Not found');
		return { list: null, error: result.error.message };
	}
	return {
		list: { ...result.data, entries: sortEntriesNewestFirst(result.data.entries) },
		error: null
	};
};
