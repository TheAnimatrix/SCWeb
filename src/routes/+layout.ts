import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_KEY } from '$env/static/public';
import type { LayoutLoad } from './$types';
import { createBrowserClient, isBrowser } from '@supabase/ssr';

export const load: LayoutLoad = async ({ fetch, data, depends }) => {
	depends('supabase:auth');

	const supabase = isBrowser()
		? createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_KEY, {
				global: {
					fetch
				}
			})
		: null;

	let session = data.session;
	if (supabase) {
		const {
			data: { session: clientSession }
		} = await supabase.auth.getSession();
		session = clientSession ?? data.session;
	}

	return {
		supabase,
		session,
		user: data.user,
		username: data.username,
		clientId: data.clientId,
		githubStars: data.githubStars
	};
};
