import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ depends, route, locals: { supabase } }) => {
	depends('supabase:auth');
	const session = await supabase.auth.getUser();
	if (session.error || !session.data.user) {
		redirect(302, '/user/sign');
	}

	// Original redirect logic
	if (route.id == '/user/(authenticated)/profile') {
		redirect(300, '/user/profile/account');
	}

	return {
		url: route.id,
		session: session // Pass session data if needed by child pages
	};
};
