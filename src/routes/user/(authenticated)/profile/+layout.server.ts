import { redirect, error } from "@sveltejs/kit";
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async ({ url, route, locals: { supabase,supabaseServer } }) => {
	const session = await supabase.auth.getUser();
	if (session.error || !session.data.user) {
        // Construct the redirect URL with the current path as postLogin query parameter
        const postLoginRedirect = `/user/sign?postLogin=${encodeURIComponent(url.pathname)}`;
		redirect(302, postLoginRedirect); // Redirect if not logged in
	}


	// Original redirect logic
	if (route.id == '/user/(authenticated)/profile') {
		redirect(300, '/user/profile/account');
	}

	return {
		url: route.id,
		session: session, // Pass session data if needed by child pages
	};
};