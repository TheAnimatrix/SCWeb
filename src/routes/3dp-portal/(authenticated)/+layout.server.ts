import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({locals: {supabaseServer, supabase}, url}) => {

    let makerStatus: 'approved' | 'pending' | 'not_maker' = 'not_maker'; // Default status

	const session = await supabase.auth.getUser();
	if (session.error || !session.data.user) {
        // Construct the redirect URL with the current path as postLogin query parameter
		return redirect(303, `/user/sign?postLogin=${encodeURIComponent(url.pathname)}`); // Redirect if not logged in
	}
	let makerData = null;

	try {
		const { data: crafterData, error: dbError } = await supabaseServer
			.from('PrintingCrafters')
			.select('approved_state, name')
			.eq('maker_id', session.data.user.id) // Assuming 'userId' is the column linking to auth.users.id
			.maybeSingle();

		if (dbError) {
			console.error("Error fetching PrintingCrafters data:", dbError);
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
		console.error("Exception fetching maker status:", e);
		// Handle unexpected errors
	}

   
   return {
    makerStatus,
    makerData,
    session
   };
};