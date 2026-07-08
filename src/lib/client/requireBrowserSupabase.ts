import type { SupabaseClient } from '@supabase/supabase-js';

/** Browser-only Supabase client from layout load; null during SSR. */
export function requireBrowserSupabase(client: SupabaseClient | null): SupabaseClient {
	if (!client) {
		throw new Error('Supabase browser client is not available');
	}
	return client;
}
