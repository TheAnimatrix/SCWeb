import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const userResponse = await event.locals.supabase.auth.getUser();
	let user;
	let email: string | undefined;
	let user_data;
	let username;
	let tier;
	if (userResponse?.data.user) {
		user = userResponse.data.user;
		email = user.email;
		user_data = await event.locals.supabase.from('users').select().eq('id', user.id);
		if (user_data && user_data.data && user_data.data[0]) {
			username = user_data.data[0].username;
			tier = user_data.data[0].tier ? user_data.data[0].tier : 'Bee';
		}
	}
	return {
		user,
		email,
		user_data,
		username,
		tier
	};
};