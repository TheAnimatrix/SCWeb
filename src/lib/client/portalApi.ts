import type { PrintRequestActionBody, PrintRequestActionResponse } from '@scweb/api/contracts';
import type { SendChatMessageResponse } from '@scweb/api/contracts';

export type PortalApiError =
	| { kind: 'not_found'; message: string }
	| { kind: 'forbidden'; message: string }
	| { kind: 'invalid_transition'; message: string }
	| { kind: 'empty_message'; message: string }
	| { kind: 'invalid_recipient'; message: string }
	| { kind: 'invalid_payload'; message: string }
	| { kind: 'unauthorized'; message: string }
	| { kind: 'rate_limited'; message: string }
	| { kind: 'network'; message: string }
	| { kind: 'unknown'; message: string };

export type PortalApiResult<T> = { ok: true; data: T } | { ok: false; error: PortalApiError };

type ApiErrorBody = {
	error?: string;
	message?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function parseErrorBody(body: unknown): ApiErrorBody {
	if (!isRecord(body)) return {};
	return {
		error: typeof body.error === 'string' ? body.error : undefined,
		message: typeof body.message === 'string' ? body.message : undefined
	};
}

export function mapPortalApiError(status: number, body: unknown): PortalApiError {
	const parsed = parseErrorBody(body);
	const fallbackMessage = parsed.message ?? 'Something went wrong. Please try again.';

	switch (parsed.error) {
		case 'not_found':
			return { kind: 'not_found', message: 'Print request not found.' };
		case 'forbidden':
			return { kind: 'forbidden', message: 'You do not have access to this resource.' };
		case 'invalid_transition':
			return {
				kind: 'invalid_transition',
				message: 'This action is not allowed in the current stage.'
			};
		case 'empty_message':
			return { kind: 'empty_message', message: 'Message cannot be empty.' };
		case 'invalid_recipient':
			return { kind: 'invalid_recipient', message: 'Invalid message recipient.' };
		case 'invalid_payload':
			return { kind: 'invalid_payload', message: fallbackMessage };
		case 'unauthorized':
			return { kind: 'unauthorized', message: fallbackMessage };
		case 'rate_limited':
			return { kind: 'rate_limited', message: 'Too many requests. Please wait and try again.' };
		default:
			if (status === 429) {
				return { kind: 'rate_limited', message: 'Too many requests. Please wait and try again.' };
			}
			if (status >= 500) {
				return { kind: 'unknown', message: 'Server error. Please try again.' };
			}
			return { kind: 'unknown', message: fallbackMessage };
	}
}

async function readJson(response: Response): Promise<unknown> {
	const text = await response.text();
	if (!text) return null;
	try {
		return JSON.parse(text) as unknown;
	} catch {
		return null;
	}
}

async function apiRequest<T>(
	fetchFn: typeof fetch,
	path: string,
	init?: RequestInit
): Promise<PortalApiResult<T>> {
	let response: Response;
	try {
		response = await fetchFn(`/api${path}`, {
			...init,
			headers: {
				...(init?.body ? { 'content-type': 'application/json' } : {}),
				...init?.headers
			}
		});
	} catch {
		return { ok: false, error: { kind: 'network', message: 'Network error. Please try again.' } };
	}

	const body = await readJson(response);
	if (!response.ok) {
		return { ok: false, error: mapPortalApiError(response.status, body) };
	}

	return { ok: true, data: body as T };
}

export async function performPrintRequestAction(
	fetchFn: typeof fetch,
	printRequestId: string,
	body: PrintRequestActionBody
): Promise<PortalApiResult<PrintRequestActionResponse>> {
	return apiRequest<PrintRequestActionResponse>(
		fetchFn,
		`/print-requests/${printRequestId}/actions`,
		{
			method: 'POST',
			body: JSON.stringify(body)
		}
	);
}

export async function sendChatMessage(
	fetchFn: typeof fetch,
	body: {
		relationship_id: string;
		recipient_id: string;
		message: string;
		message_type: 'text';
		status?: 'sent';
	}
): Promise<PortalApiResult<SendChatMessageResponse>> {
	return apiRequest<SendChatMessageResponse>(fetchFn, '/chats/messages', {
		method: 'POST',
		body: JSON.stringify(body)
	});
}
