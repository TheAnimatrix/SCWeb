import type { LayoutLoad } from './$types';
import { getBrowserSupabase } from '$lib/client/browserSupabase';

export const load: LayoutLoad = async ({ fetch, data, depends }) => {
	depends('supabase:auth');

	const supabase = getBrowserSupabase(fetch);

	return {
		supabase,
		session: data.session,
		user: data.user,
		username: data.username,
		clientId: data.clientId,
		githubStars: data.githubStars
	};
};
