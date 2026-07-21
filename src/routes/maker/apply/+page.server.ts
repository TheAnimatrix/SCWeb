import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const { session } = await locals.safeGetSession();
	if (!session) {
		throw redirect(303, `/user/sign?redirectTo=${encodeURIComponent(url.pathname)}`);
	}

	const maker = await locals.getMaker();
	return {
		maker,
		source: url.searchParams.get('source') ?? 'direct'
	};
};
