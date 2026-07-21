import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ depends, route, locals }) => {
	depends('supabase:auth');
	const session = await locals.supabase.auth.getUser();
	if (session.error || !session.data.user) {
		redirect(302, '/user/sign');
	}

	if (route.id == '/user/(authenticated)/profile') {
		redirect(300, '/user/profile/account');
	}

	const maker = await locals.getMaker();

	return {
		url: route.id,
		session,
		maker
	};
};
