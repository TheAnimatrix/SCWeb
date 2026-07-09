import { invalidate } from '$app/navigation';
import type { AuthChangeEvent, SupabaseClient } from '@supabase/supabase-js';

const AUTH_INVALIDATE_KEY = 'supabase:auth';

let subscribed = false;
let refreshPromise: Promise<void> | null = null;

function refreshAuthState(): Promise<void> {
	if (!refreshPromise) {
		refreshPromise = invalidate(AUTH_INVALIDATE_KEY).finally(() => {
			refreshPromise = null;
		});
	}
	return refreshPromise;
}

const SYNC_EVENTS = new Set<AuthChangeEvent>([
	'SIGNED_IN',
	'SIGNED_OUT',
	'TOKEN_REFRESHED',
	'USER_UPDATED'
]);

export async function syncAuthAfterSignIn(): Promise<void> {
	await refreshAuthState();
}

export function initAuthSync(
	supabase: SupabaseClient,
	handlers: {
		onSignedIn?: () => void | Promise<void>;
	} = {}
): void {
	if (subscribed) return;
	subscribed = true;

	supabase.auth.onAuthStateChange(async (event) => {
		if (event === 'INITIAL_SESSION') return;

		if (SYNC_EVENTS.has(event)) {
			await refreshAuthState();
		}

		if (event === 'SIGNED_IN') {
			await handlers.onSignedIn?.();
		}
	});
}
