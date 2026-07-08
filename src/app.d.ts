// See https://kit.svelte.dev/docs/types#app

/// <reference types="vite-plugin-pwa/info" />
/// <reference types="vite-plugin-pwa/svelte" />
/// <reference types="vite-plugin-pwa/vanillajs" />

import type { SupabaseClient } from "@supabase/supabase-js";

// for information about these interfaces
declare global {
	namespace App {
		interface Locals {
		  supabase: SupabaseClient<Database>,
		  supabaseAdmin: SupabaseClient<Database>,
		  safeGetSession(): Promise<{ session: Session | null, user: User | null }>
		  clientId: string
		}
		interface PageData {
		  session: Session | null
		}
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
