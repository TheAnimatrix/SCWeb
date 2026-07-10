import { asAddressList } from '$lib/types/product';
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({
	params,
	depends,
	locals: { supabase, supabaseAdmin }
}) => {
	depends('3dp-portal:printrequest');
	const { id } = params;
	const {
		data: { user },
		error: userError
	} = await supabase.auth.getUser();
	if (userError || !user) {
		throw error(401, {
			message: 'Sign in with the customer account linked to this order to view its details.'
		});
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

	if (printRequest.user_id !== user.id) {
		throw error(403, {
			message: "This order isn't for your eyes — it belongs to another customer."
		});
	}

	let maker = null;
	if (printRequest.creator_id) {
		const { data: makerData } = await supabaseAdmin
			.from('PrintingCrafters')
			.select('name, email, contact_number')
			.eq('maker_id', printRequest.creator_id)
			.single();
		maker = makerData;
	}

	const { data: addresses } = await supabaseAdmin.from('addresses').select('*').eq('uid', user.id);

	return {
		printRequest,
		maker,
		addresses: asAddressList(addresses)
	};
};
