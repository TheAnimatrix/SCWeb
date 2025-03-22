import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { PUBLIC_SUPABASE_KEY } from '$env/static/public';
import type { Banner } from '$lib/client/banner';
import type { LayoutLoad } from './$types';
import { createBrowserClient, isBrowser } from '@supabase/ssr';



export const load: LayoutLoad = async ({ fetch, data, depends }) => {
	depends('supabase:auth');

	//this is exposed to client, so use it only for safe queries (PUBLIC DATA)
	const supabase_lt = createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_KEY, {
		global: {
			fetch
		},
		cookies: {
			get(key) {
				if (!isBrowser()) return '';
				const cookies = document.cookie.split(';').map(c => c.trim());
				const cookie = cookies.find(c => c.startsWith(`${key}=`));
				return cookie ? cookie.split('=')[1] : '';
			},
			set(key, value, options) {
				if (!isBrowser()) return;
				document.cookie = `${key}=${value}; path=/`;
			},
			remove(key, options) {
				if (!isBrowser()) return;
				document.cookie = `${key}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
			}
		}
	});

	const {
		data: { session }
	} = await supabase_lt.auth.getSession();

	return { supabase_lt, session, clientId : data.clientId };
};
