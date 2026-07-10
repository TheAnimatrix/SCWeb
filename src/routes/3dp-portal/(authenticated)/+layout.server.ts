import { redirect } from '@sveltejs/kit';
import { createLogger } from '$lib/server/logger';
import { isPrintRequestDetailPath } from '$lib/portal/printRequestPaths';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({
	locals: { supabaseAdmin, supabase, requestId, clientId },
	url,
	route
}) => {
	const log = createLogger({
		requestId,
		route: route.id ?? undefined,
		clientId
	});
	let makerStatus: 'approved' | 'pending' | 'not_maker' = 'not_maker'; // Default status

	const session = await supabase.auth.getUser();
	if (session.error || !session.data.user) {
		if (isPrintRequestDetailPath(url.pathname)) {
			return {
				makerStatus: 'not_maker' as const,
				makerData: null,
				session
			};
		}

		return redirect(303, `/user/sign?postLogin=${encodeURIComponent(url.pathname)}`);
	}
	let makerData = null;

	try {
		const { data: crafterData, error: dbError } = await supabaseAdmin
			.from('PrintingCrafters')
			.select('approved_state, name')
			.eq('maker_id', session.data.user.id) // Assuming 'userId' is the column linking to auth.users.id
			.maybeSingle();

		if (dbError) {
			log.error('maker.layout.crafter_lookup_failed');
			// Optionally throw an error or handle it gracefully
			// throw error(500, "Database error fetching maker status");
		}

		if (crafterData) {
			makerData = crafterData; // Store fetched data if needed later
			if (crafterData.approved_state === 'approved') {
				makerStatus = 'approved';
			} else {
				// Assuming any other state means pending or requires review
				makerStatus = 'pending';
			}
		} else {
			makerStatus = 'not_maker';
		}
	} catch (e) {
		log.error('maker.layout.unexpected_error', {
			error: e instanceof Error ? e.message : String(e)
		});
		// Handle unexpected errors
	}

	return {
		makerStatus,
		makerData,
		session
	};
};
