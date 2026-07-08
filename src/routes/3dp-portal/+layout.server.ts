import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
	//check if user is logged in, if not redirect to fabbly
	const { session } = await event.locals.safeGetSession();
	if (!session && event.url.pathname !== '/3dp-portal') {
		return redirect(303, '/3dp-portal');
	}

	const resp = await event.locals.supabase
		.from('constants')
		.select('*')
		.eq('key', 'FILTYPES')
		.single();
	if (!resp || resp.error) {
		return {
			filtypes: ['PLA', 'ABS', 'ASA', 'PETG', 'TPU', 'NYLON']
		};
	} else {
		return {
			filtypes: resp.data.value
		};
	}
};
