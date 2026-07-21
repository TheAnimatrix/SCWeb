import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	const { session } = await locals.safeGetSession();
	if (!session) {
		throw redirect(303, `/user/sign?redirectTo=${encodeURIComponent(url.pathname)}`);
	}

	const maker = await locals.getMaker();
	if (!maker || maker.approved_state !== 'approved') {
		throw redirect(303, '/maker/apply?source=portal');
	}

	return { maker, session };
};
