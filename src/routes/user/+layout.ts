import { redirect } from '@sveltejs/kit';
import type { Session } from '@supabase/supabase-js';
import { postLoginFromSearchParams, signInPath } from '$lib/postLoginUrl';
import type { LayoutLoad } from '../$types';

export const load: LayoutLoad = async ({ depends, route, parent, url }) => {
	depends('supabase:auth');
	const parentData = (await parent()) as { session: Session | null };
	const { session } = parentData;
	if (session?.user?.id) {
		if (route.id === '/user/sign') {
			redirect(303, postLoginFromSearchParams(url.searchParams) ?? '/user/profile/account');
		}
	} else if (route.id?.includes('/(authenticated)/')) {
		redirect(303, signInPath(url.pathname + url.search));
	}

	return { ...parentData, session };
};
