import { env } from '$env/dynamic/public';
import { createBrowserClient, isBrowser } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

function getPublicSupabaseUrl(): string {
	const url = env.PUBLIC_SUPABASE_URL;
	if (!url) {
		throw new Error(
			'PUBLIC_SUPABASE_URL is not set. Configure it as a runtime environment variable.'
		);
	}
	return url;
}

function getPublicSupabaseAnonKey(): string {
	const key = env.PUBLIC_SUPABASE_KEY;
	if (!key) {
		throw new Error(
			'PUBLIC_SUPABASE_KEY is not set. Configure it as a runtime environment variable.'
		);
	}
	return key;
}

let browserClient: SupabaseClient | null = null;

export function getBrowserSupabase(fetch?: typeof globalThis.fetch): SupabaseClient | null {
	if (!isBrowser()) return null;

	if (!browserClient) {
		browserClient = createBrowserClient(getPublicSupabaseUrl(), getPublicSupabaseAnonKey(), {
			global: {
				fetch: fetch ?? globalThis.fetch.bind(globalThis)
			}
		});
	}

	return browserClient;
}
