import { env } from '$env/dynamic/public';
import type { LayoutLoad } from './$types';
import { createBrowserClient, isBrowser } from '@supabase/ssr';

function getPublicSupabaseUrl(): string {
	const url = env.PUBLIC_SUPABASE_URL;
	if (!url) {
		throw new Error(
			'PUBLIC_SUPABASE_URL is not set. Configure it as a runtime environment variable.'
		);
	}
	return url;
}

function getPublicSupabaseAnonKey(): string {
	const key = env.PUBLIC_SUPABASE_KEY;
	if (!key) {
		throw new Error(
			'PUBLIC_SUPABASE_KEY is not set. Configure it as a runtime environment variable.'
		);
	}
	return key;
}

export const load: LayoutLoad = async ({ fetch, data, depends }) => {
	depends('supabase:auth');

	const supabase = isBrowser()
		? createBrowserClient(getPublicSupabaseUrl(), getPublicSupabaseAnonKey(), {
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
