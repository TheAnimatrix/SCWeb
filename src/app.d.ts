// See https://kit.svelte.dev/docs/types#app

/// <reference types="vite-plugin-pwa/info" />
/// <reference types="vite-plugin-pwa/svelte" />
/// <reference types="vite-plugin-pwa/vanillajs" />

import type { Session, User } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../supabase/types';

// for information about these interfaces
declare global {
	interface RazorpayInstance {
		open(): void;
		close(): void;
		on(event: string, handler: (response: unknown) => void): void;
	}

	const Razorpay: new (options: Record<string, unknown>) => RazorpayInstance;

	namespace App {
		interface Locals {
			supabase: SupabaseClient<Database>;
			supabaseAdmin: SupabaseClient<Database>;
			safeGetSession(): Promise<{ session: Session | null; user: User | null }>;
			clientId: string;
		}
		interface PageData {
			session: Session | null;
		}
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
