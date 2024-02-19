import { redirect } from '@sveltejs/kit';
import type { LayoutLoad } from '../$types';

export const load: LayoutLoad = async ({ route, parent}) => {
	const data = await parent();
	const {supabase_lt} = data;
	const {data : {session}} = await supabase_lt.auth.getSession();
	let user = session?.user;
	//user.id
	if (user?.id && route.id == '/user/sign') redirect(303, '/user/profile/account');
	else if (user?.id && route.id == '/user/(authenticated)/profile')
		redirect(303, '/user/profile/account');
	else if (!user?.id && route.id?.indexOf('authenticated') != -1) redirect(303, '/user/sign');
	return { route };
};
