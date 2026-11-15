import { asAddressList } from '$lib/types/product';
import { isPaidStage } from '$lib/types/printRequest';
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
			message: 'Sign in with the account that placed this request.'
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
			message:
				'This request belongs to a different account. Sign in with the account that placed it.'
		});
	}

	// The maker's name is always shown. Their email and phone are shown only once this
	// customer has paid for this request; before that, the in-app chat is the way to reach them.
	const paid = isPaidStage(printRequest.request_stage);
	let maker: { name: string | null; email: string | null; contact_number: string | null } | null =
		null;
	if (printRequest.creator_id) {
		if (paid) {
			const { data: makerData } = await supabaseAdmin
				.from('PrintingCrafters')
				.select('name, email, contact_number')
				.eq('maker_id', printRequest.creator_id)
				.maybeSingle();
			if (makerData) {
				maker = {
					name: makerData.name ?? null,
					email: makerData.email ?? null,
					contact_number: makerData.contact_number ?? null
				};
			}
		} else {
			const { data: makerData } = await supabaseAdmin
				.from('PrintingCrafters')
				.select('name')
				.eq('maker_id', printRequest.creator_id)
				.maybeSingle();
			if (makerData) {
				maker = { name: makerData.name ?? null, email: null, contact_number: null };
			}
		}
	}

	const { data: addresses } = await supabaseAdmin.from('addresses').select('*').eq('uid', user.id);

	return {
		printRequest,
		maker,
		addresses: asAddressList(addresses)
	};
};
