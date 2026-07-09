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
		case 'email_taken':
		case 'signup_failed':
		case 'invalid_token':
		case 'update_failed':
		case 'auth_mail_unconfigured':
			return { kind: error, message };
		case 'rate_limited':
			return { kind: 'rate_limited', message: 'Too many requests. Please try again later.' };
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
		return { ok: false, error: { kind: 'network', message: 'Network error. Please try again.' } };
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
