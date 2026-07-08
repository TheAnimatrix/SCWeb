import { getGithubStars } from '$lib/server/github';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals: { safeGetSession, clientId, supabase } }) => {
	const { session, user } = await safeGetSession();
	const githubStars = await getGithubStars();

	let username: string | null = null;
	if (user?.id) {
		const { data: userRow } = await supabase
			.from('users')
			.select('username')
			.eq('id', user.id)
			.maybeSingle();
		username = userRow?.username ?? null;
	}

	return {
		session,
		user,
		username,
		clientId,
		githubStars
	};
};