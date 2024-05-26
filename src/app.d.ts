// See https://kit.svelte.dev/docs/types#app

import type { SupabaseClient } from "@supabase/supabase-js";

// for information about these interfaces
declare global {
	namespace App {
		interface Locals {
		  supabase: SupabaseClient<Database>,
		  supabaseServer: SupabaseClient<Database>,
		  getSession(): Promise<Session | null>
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
