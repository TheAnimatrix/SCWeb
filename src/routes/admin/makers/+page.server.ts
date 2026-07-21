import { error } from '@sveltejs/kit';
import { isStaffUser } from '$lib/server/maker';
import { listPendingApplications } from '$lib/client/makersApi';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, fetch }) => {
	const { session, user } = await locals.safeGetSession();
	if (!session || !user || !isStaffUser(user.id)) {
		throw error(403, 'Staff only');
	}
	const result = await listPendingApplications(fetch);
	return {
		applications: result.ok ? result.data.applications : [],
		error: result.ok ? null : result.error.message
	};
};
