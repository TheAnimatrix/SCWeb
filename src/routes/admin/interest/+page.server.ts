import { error } from '@sveltejs/kit';
import { isStaffUser } from '$lib/server/maker';
import { listInterestCampaigns } from '$lib/client/adminInterestApi';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, fetch }) => {
	const { session, user } = await locals.safeGetSession();
	if (!session || !user || !isStaffUser(user.id)) {
		throw error(403, 'Staff only');
	}
	const result = await listInterestCampaigns(fetch);
	return {
		campaigns: result.ok ? result.data.campaigns : [],
		error: result.ok ? null : result.error.message
	};
};
