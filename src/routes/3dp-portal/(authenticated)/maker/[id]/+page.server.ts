import { error } from '@sveltejs/kit';
import { isPaidStage } from '$lib/types/printRequest';
import type { PageServerLoad } from './$types';

export interface ShipTo {
	name: string;
	lines: string[];
	phone: string;
}

/**
 * The customer's shipping address is written to `printrequests.address` when they start
 * paying (`{ shipping, billing }`; older rows may hold a flat address). Only the fields a
 * maker needs to post the parcel are passed on.
 */
function toShipTo(address: unknown): ShipTo | null {
	if (!address || typeof address !== 'object' || Array.isArray(address)) return null;
	const record = address as Record<string, unknown>;
	const shipping =
		record.shipping && typeof record.shipping === 'object' && !Array.isArray(record.shipping)
			? (record.shipping as Record<string, unknown>)
			: record;

	const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
	const cityLine = [text(shipping.city), text(shipping.state)].filter(Boolean).join(', ');
	const lines = [
		text(shipping.line1),
		text(shipping.line2),
		[cityLine, text(shipping.pincode)].filter(Boolean).join(' ')
	].filter(Boolean);

	const shipTo = { name: text(shipping.name), lines, phone: text(shipping.phone) };
	return shipTo.name || shipTo.lines.length > 0 ? shipTo : null;
}

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
		throw error(401, {
			message: 'Sign in with the maker account this request was sent to.'
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

	// Only the maker the request was sent to may open this page.
	if (printRequest.creator_id !== user.id) {
		throw error(403, {
			message:
				'This request was sent to a different maker. Sign in with the account it was sent to.'
		});
	}

	// The address is saved when the customer starts paying, before the payment is
	// confirmed, so it is withheld until the request is actually paid.
	const { address, ...requestWithoutAddress } = printRequest;
	const shipTo = isPaidStage(printRequest.request_stage) ? toShipTo(address) : null;

	//fetch username of user
	let username = 'Customer';
	if (printRequest.user_id) {
		const { data: userData, error: userError2 } = await supabaseAdmin
			.from('users')
			.select('username')
			.eq('id', printRequest.user_id)
			.single();

		username = userError2 ? 'Customer' : (userData?.username ?? 'Customer');
	}

	return {
		printRequest: requestWithoutAddress,
		shipTo,
		username
	};
};
