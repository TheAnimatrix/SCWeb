import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const { session } = await locals.safeGetSession();
	if (!session) {
		throw redirect(303, `/user/sign?postLogin=${encodeURIComponent(url.pathname + url.search)}`);
	}

	const maker = await locals.getMaker();
	// `/makers/me` adds the latest application for makers who are not approved yet.
	const latestApplication = maker?.latest_application ?? null;
	return {
		maker,
		latestApplication,
		source: url.searchParams.get('source') ?? 'direct'
	};
};
