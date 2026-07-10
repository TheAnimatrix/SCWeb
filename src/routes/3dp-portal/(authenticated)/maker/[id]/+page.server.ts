import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
export const load: PageServerLoad = async ({
	params,
	depends,
	locals: { supabase, supabaseAdmin }
}) => {
	depends('3dp-portal:printrequest');
	const { id } = params;
	// Get current user
	const {
		data: { user },
		error: userError
	} = await supabase.auth.getUser();
	if (userError || !user) {
		return { printRequest: null, error: 'Not authenticated' };
	}

	const { data: printRequest, error: prError } = await supabaseAdmin
		.from('printrequests')
		.select('*')
		.eq('id', id)
		.maybeSingle();

	if (prError || !printRequest) {
		throw error(404, {
			message: 'This print request could not be found.'
		});
	}

	if (printRequest.creator_id !== user.id) {
		throw error(403, {
			message: "This order isn't for your eyes — it belongs to another maker."
		});
	}

	//fetch username of user
	let username = 'The user';
	if (printRequest.user_id) {
		const { data: userData, error: userError2 } = await supabaseAdmin
			.from('users')
			.select('username')
			.eq('id', printRequest.user_id)
			.single();

		username = userError2 ? 'The user' : (userData?.username ?? 'The user');
	}

	return {
		printRequest,
		username
	};
};
