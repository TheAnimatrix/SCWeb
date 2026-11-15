import { redirect } from '@sveltejs/kit';
import { signInPath } from '$lib/postLoginUrl';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ depends, route, locals, url }) => {
	depends('supabase:auth');
	const session = await locals.supabase.auth.getUser();
	if (session.error || !session.data.user) {
		redirect(303, signInPath(url.pathname + url.search));
	}

	if (route.id == '/user/(authenticated)/profile') {
		redirect(303, '/user/profile/account');
	}

	const maker = await locals.getMaker();

	return {
		url: route.id,
		session,
		maker
	};
};
