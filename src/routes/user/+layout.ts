import { redirect } from '@sveltejs/kit';
import type { Session } from '@supabase/supabase-js';
import type { LayoutLoad } from '../$types';

export const load: LayoutLoad = async ({ route, parent, url }) => {
	const parentData = (await parent()) as { session: Session | null };
	const { session } = parentData;
	if (session?.user?.id) {
		if (route.id === '/user/sign') {
			redirect(303, '/user/profile/account');
		}
		// If logged in and trying to access the base profile layout route, redirect to a default profile page
		// Note: This specific check might be redundant if the server layout already handles it, like in file_context_4
		// else if (route.id === '/user/(authenticated)/profile') {
		//  redirect(303, '/user/profile/account');
		// }
	} else {
		if (route.id?.includes('/(authenticated)/')) {
			const postLoginRedirect = `/user/sign?postLogin=${encodeURIComponent(url.pathname)}`;
			redirect(303, postLoginRedirect);
		}
	}

	return { ...parentData, session };
};
