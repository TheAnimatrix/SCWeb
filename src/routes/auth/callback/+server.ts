import { redirect } from '@sveltejs/kit';
import { resolveAuthCallbackNext } from '$lib/postLoginUrl';

export const GET = async (event) => {
	const {
		url,
		locals: { supabase }
	} = event;
	const code = url.searchParams.get('code');

	if (code) {
		const { error } = await supabase.auth.exchangeCodeForSession(code);
		if (!error) {
			// `next` is attacker-controllable; only same-origin relative paths survive.
			redirect(303, resolveAuthCallbackNext(url.searchParams.get('next')));
		}
	}

	// return the user to an error page with instructions
	redirect(303, '/auth/auth-code-error');
};
