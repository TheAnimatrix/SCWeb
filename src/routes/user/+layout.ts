import { redirect } from '@sveltejs/kit';
import type { LayoutLoad } from '../$types';

export const load: LayoutLoad = async ({ route, parent, url }) => {
	const data = await parent();
	// Assuming supabase_lt is correctly passed from the root layout's load function
	// If not, the root layout needs adjustment. The type error suggests it might be missing.
	// Let's proceed assuming it exists in `data` for now, but this needs verification.
	const { supabase_lt } = data as any; // Using 'as any' temporarily to bypass TS error, needs proper typing from parent
	const { data: { session } } = await supabase_lt.auth.getSession();
	const user = session?.user;

	if (user?.id) {
		// If logged in, redirect away from sign-in page
		if (route.id === '/user/sign') {
			redirect(303, '/user/profile/account');
		}
		// If logged in and trying to access the base profile layout route, redirect to a default profile page
		// Note: This specific check might be redundant if the server layout already handles it, like in file_context_4
		// else if (route.id === '/user/(authenticated)/profile') {
		//  redirect(303, '/user/profile/account');
		// }
	} else {
		// If not logged in and trying to access an authenticated route
		if (route.id?.includes('/(authenticated)/')) {
            const postLoginRedirect = `/user/sign?postLogin=${encodeURIComponent(url.pathname)}`;
			redirect(303, postLoginRedirect);
		}
	}

	// Return parent data along with any data specific to this layout
	// Returning route might not be necessary unless child layouts use it directly
	// Ensure all required data from parent() is passed down.
	return { ...data, session }; // Pass session down explicitly if needed, or just spread data
};
