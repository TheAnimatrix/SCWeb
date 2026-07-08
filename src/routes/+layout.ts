import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_KEY } from '$env/static/public';
import type { LayoutLoad } from './$types';
import { createBrowserClient, isBrowser } from '@supabase/ssr';

export const load: LayoutLoad = async ({ fetch, data, depends }) => {
	depends('supabase:auth');

	const supabase_lt = isBrowser()
		? createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_KEY, {
				global: {
					fetch
				}
			})
		: null;

	let session = data.session;
	if (supabase_lt) {
		const {
			data: { session: clientSession }
		} = await supabase_lt.auth.getSession();
		session = clientSession ?? data.session;
	}

	return {
		supabase_lt,
		session,
		user: data.user,
		username: data.username,
		clientId: data.clientId,
		githubStars: data.githubStars
	};
};
