export const USERNAME_TAKEN_MESSAGE = 'That username is taken.';

export type AuthApiError =
	| { kind: 'username_taken'; message: string }
	| { kind: 'email_taken'; message: string }
	| { kind: 'signup_failed'; message: string }
	| { kind: 'invalid_token'; message: string }
	| { kind: 'update_failed'; message: string }
	| { kind: 'auth_mail_unconfigured'; message: string }
	| { kind: 'rate_limited'; message: string }
	| { kind: 'network'; message: string }
	| { kind: 'unknown'; message: string };

export type AuthApiResult<T> = { ok: true; data: T } | { ok: false; error: AuthApiError };

type ApiErrorBody = {
	error?: string;
	message?: string;
};

function mapAuthApiError(status: number, body: ApiErrorBody): AuthApiError {
	const error = body.error ?? 'unknown';
	const message = body.message ?? 'Something went wrong';

	switch (error) {
		case 'username_taken':
			return { kind: error, message: USERNAME_TAKEN_MESSAGE };
		case 'email_taken':
			return {
				kind: error,
				message: 'An account with this e-mail already exists. Sign in instead.'
			};
		case 'signup_failed':
			return { kind: error, message: "We couldn't create your account. Try again in a moment." };
		case 'auth_mail_unconfigured':
			return {
				kind: error,
				message: "We can't send e-mail right now. Try again later."
			};
		case 'invalid_token':
		case 'update_failed':
			return { kind: error, message };
		case 'rate_limited':
			return {
				kind: 'rate_limited',
				message: 'Too many attempts. Wait a few minutes and try again.'
			};
		default:
			return { kind: 'unknown', message };
	}
}

async function authRequest<T>(
	fetchFn: typeof fetch,
	path: string,
	init?: RequestInit
): Promise<AuthApiResult<T>> {
	let response: Response;

	try {
		response = await fetchFn(`/api/${path}`, {
			...init,
			headers: {
				'Content-Type': 'application/json',
				...(init?.headers ?? {})
			}
		});
	} catch {
		return {
			ok: false,
			error: { kind: 'network', message: 'Network error. Check your connection and try again.' }
		};
	}

	let body: ApiErrorBody = {};
	try {
		body = (await response.json()) as ApiErrorBody;
	} catch {
		body = {};
	}

	if (!response.ok) {
		return { ok: false, error: mapAuthApiError(response.status, body) };
	}

	return { ok: true, data: body as T };
}

export async function signup(
	fetchFn: typeof fetch,
	input: { email: string; password: string; username: string }
): Promise<AuthApiResult<{ needsConfirmation: boolean }>> {
	return authRequest(fetchFn, 'auth/signup', {
		method: 'POST',
		body: JSON.stringify(input)
	});
}

export async function requestPasswordReset(
	fetchFn: typeof fetch,
	email: string
): Promise<AuthApiResult<{ message: string }>> {
	return authRequest(fetchFn, 'auth/password-reset', {
		method: 'POST',
		body: JSON.stringify({ email })
	});
}

export async function confirmPasswordReset(
	fetchFn: typeof fetch,
	input: { tokenHash: string; password: string }
): Promise<AuthApiResult<{ message: string }>> {
	return authRequest(fetchFn, 'auth/password-reset/confirm', {
		method: 'POST',
		body: JSON.stringify(input)
	});
}

export async function checkUsernameAvailable(
	fetchFn: typeof fetch,
	username: string
): Promise<AuthApiResult<{ available: boolean }>> {
	const params = new URLSearchParams({ username });
	return authRequest(fetchFn, `auth/username-available?${params.toString()}`);
}

export type SupabaseAuthErrorLike = {
	code?: string | null;
	message?: string | null;
	status?: number | null;
};

/**
 * Turns a Supabase auth error (from `signInWithPassword`, `signInWithOAuth`, `updateUser`, …)
 * into a plain sentence for the user. Unknown errors get a generic message rather than the raw text.
 */
export function friendlySupabaseAuthError(error: SupabaseAuthErrorLike | null | undefined): string {
	const code = error?.code ?? '';
	const message = (error?.message ?? '').toLowerCase();

	if (code === 'invalid_credentials' || message.includes('invalid login credentials')) {
		return 'Wrong e-mail or password.';
	}
	if (code === 'email_not_confirmed' || message.includes('email not confirmed')) {
		return 'Confirm your e-mail first. Open the link we sent when you created your account, then sign in.';
	}
	if (
		code === 'over_request_rate_limit' ||
		code === 'over_email_send_rate_limit' ||
		error?.status === 429 ||
		message.includes('rate limit')
	) {
		return 'Too many attempts. Wait a few minutes and try again.';
	}
	if (code === 'same_password' || message.includes('should be different from the old password')) {
		return 'Your new password must be different from your current one.';
	}
	if (code === 'weak_password' || message.includes('password should')) {
		return 'Choose a stronger password: 8 or more characters, with an uppercase letter, a lowercase letter and a number.';
	}
	if (
		code === 'reauthentication_needed' ||
		code === 'session_not_found' ||
		code === 'session_expired'
	) {
		return 'Your session has expired. Sign in again and retry.';
	}
	if (code === 'user_banned') {
		return 'This account has been suspended. Write to support@selfcrafted.in for help.';
	}
	if (message.includes('failed to fetch') || message.includes('network')) {
		return 'Network error. Check your connection and try again.';
	}
	return 'Something went wrong. Try again in a moment.';
}
