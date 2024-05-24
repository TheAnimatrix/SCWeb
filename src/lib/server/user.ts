import type { SupabaseClient } from "@supabase/supabase-js";

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

	/**
	 * Get the current session from Supabase using `getSession()`.
	 */
	
	const {
		data: { session }
	} = await supabase.auth.getSession();

	

	/**
	 * If the session is not null and truthy, the user is logged in.
	 */
	if (session != null && session) return true;

	/**
	 * Otherwise, the user is not logged in.
	 */
	else return false;
}
