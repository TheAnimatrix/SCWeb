import type { SupabaseClient } from '@supabase/supabase-js';

/** Returns the authenticated user's id, or null when anonymous. */
export async function getAuthenticatedUserId(
	supabase: SupabaseClient<any, 'public', any>
): Promise<string | null> {
	const {
		data: { user }
	} = await supabase.auth.getUser();
	return user?.id ?? null;
}

/**
 * Checks if the user is currently logged in using Supabase.
 *
 * @param supabase - Supabase client object.
 * @returns - True if the user is logged in, false otherwise.
 */
export async function checkUser(supabase: SupabaseClient<any, 'public', any>): Promise<boolean> {
	/**
	 * If the Supabase client is invalid, return false.
	 */
	if (!supabase) return Promise.resolve(false);

	const {
		data: { user }
	} = await supabase.auth.getUser();

	return user != null;
}
