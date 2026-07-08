import { getGithubStars } from '$lib/server/github';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({
	locals: { getLayoutSession, clientId, supabase }
}) => {
	const [{ session, user }, githubStars] = await Promise.all([
		getLayoutSession(),
		getGithubStars()
	]);

	let username: string | null = null;
	if (user?.id) {
		const metadata = user.user_metadata ?? {};
		if (typeof metadata.username === 'string' && metadata.username) {
			username = metadata.username;
		} else {
			const { data: userRow } = await supabase
				.from('users')
				.select('username')
				.eq('id', user.id)
				.maybeSingle();
			username = userRow?.username ?? null;
		}
	}

	return {
		session,
		user,
		username,
		clientId,
		githubStars
	};
};
