import type { InterestChangeResponse, MyInterestResponse } from '@scweb/api/contracts';
import { stripCheckoutAddress } from '$lib/client/cartApi';
import type { Address } from '$lib/types/product';

/** Error kinds from `interestErrorSchema` in api/src/contracts/interest.ts, plus transport ones. */
export type InterestApiError =
	| { kind: 'unauthorized'; message: string }
	| { kind: 'product_not_found'; message: string }
	| { kind: 'interest_closed'; message: string }
	| { kind: 'own_listing'; message: string }
	| { kind: 'invalid_payload'; message: string }
	| { kind: 'rate_limited'; message: string }
	| { kind: 'network'; message: string }
	| { kind: 'unknown'; message: string };

export type InterestApiResult<T> = { ok: true; data: T } | { ok: false; error: InterestApiError };

export const INTEREST_JOIN_FAILED = "Couldn't add you to the list. Try again.";
export const INTEREST_LEAVE_FAILED = "Couldn't take you off the list. Try again.";
const OWN_LISTING = "This is your own listing, so you can't add yourself.";
const INTEREST_CLOSED = 'This interest check has ended.';
const SESSION_ENDED = 'Your session has ended. Sign in again to continue.';
const RATE_LIMITED = 'Too many attempts. Wait a minute and try again.';
const NOT_FOUND = 'That product is no longer available.';

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

/**
 * `fallback` is the sentence for anything without its own wording ("Couldn't add you…" when
 * joining, "Couldn't take you off…" when leaving).
 */
export function mapInterestError(
	status: number,
	body: unknown,
	fallback: string = INTEREST_JOIN_FAILED
): InterestApiError {
	const code = isRecord(body) && typeof body.error === 'string' ? body.error : undefined;
	const message = isRecord(body) && typeof body.message === 'string' ? body.message : undefined;

	switch (code) {
		case 'unauthorized':
			return { kind: 'unauthorized', message: SESSION_ENDED };
		case 'product_not_found':
			return { kind: 'product_not_found', message: NOT_FOUND };
		case 'interest_closed':
			return { kind: 'interest_closed', message: INTEREST_CLOSED };
		case 'own_listing':
			return { kind: 'own_listing', message: OWN_LISTING };
		case 'invalid_payload':
			// The API names the field that failed; fall back to the generic line when it doesn't.
			return { kind: 'invalid_payload', message: message ?? fallback };
		case 'rate_limited':
			return { kind: 'rate_limited', message: RATE_LIMITED };
		default:
			if (status === 401) return { kind: 'unauthorized', message: SESSION_ENDED };
			if (status === 429) return { kind: 'rate_limited', message: RATE_LIMITED };
			return { kind: 'unknown', message: fallback };
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

async function request<T>(
	fetchFn: typeof fetch,
	path: string,
	fallback: string,
	init?: RequestInit
): Promise<InterestApiResult<T>> {
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
		return {
			ok: false,
			error: {
				kind: 'network',
				message: "Couldn't reach Selfcrafted. Check your connection and try again."
			}
		};
	}

	const body = await readJson(response);
	if (!response.ok) {
		return { ok: false, error: mapInterestError(response.status, body, fallback) };
	}
	return { ok: true, data: body as T };
}

function interestPath(productId: string) {
	return `/products/${encodeURIComponent(productId)}/interest`;
}

/** GET /products/:productId/interest/me — whether the signed-in buyer is on the list. */
export function getMyInterest(
	fetchFn: typeof fetch,
	productId: string
): Promise<InterestApiResult<MyInterestResponse>> {
	return request<MyInterestResponse>(
		fetchFn,
		`${interestPath(productId)}/me`,
		INTEREST_JOIN_FAILED
	);
}

/** POST /products/:productId/interest — join the list, or update the address when already on it. */
export function showInterest(
	fetchFn: typeof fetch,
	productId: string,
	address: Address
): Promise<InterestApiResult<InterestChangeResponse>> {
	return request<InterestChangeResponse>(fetchFn, interestPath(productId), INTEREST_JOIN_FAILED, {
		method: 'POST',
		body: JSON.stringify({ address: stripCheckoutAddress(address) })
	});
}

/** DELETE /products/:productId/interest — leave the list. */
export function withdrawInterest(
	fetchFn: typeof fetch,
	productId: string
): Promise<InterestApiResult<InterestChangeResponse>> {
	return request<InterestChangeResponse>(fetchFn, interestPath(productId), INTEREST_LEAVE_FAILED, {
		method: 'DELETE'
	});
}
