import type {
	CloseInterestBody,
	InterestNotifyResponse,
	LaunchInterestBody,
	ListAvailableMakersResponse,
	MakerInterestSummary
} from '@scweb/api/contracts';
import { mapApiError, type CartApiError } from '$lib/client/cartApi';

/** Same errors as the cart client, plus the API's `error` code so pages can branch on it. */
export type MakersApiError = CartApiError & { code?: string };
export type MakersApiResult<T> = { ok: true; data: T } | { ok: false; error: MakersApiError };

/** Shown when the target or shipping time is changed after people joined (409 `interest_locked`). */
export const INTEREST_LOCKED_MESSAGE =
	'People have already shown interest, so the target and shipping time are fixed. Write to support@selfcrafted.in to change them.';

const INTEREST_NOT_OPEN_MESSAGE = 'This interest check is no longer open.';

/** 409 `interest_not_allowed`: only a listing that has never been on sale can become one. */
export const INTEREST_NOT_ALLOWED_MESSAGE =
	"This listing has already been on sale, so it can't become an interest check. Create a new listing for it.";

function errorCode(body: unknown): string | undefined {
	if (typeof body !== 'object' || body === null) return undefined;
	const code = (body as Record<string, unknown>).error;
	return typeof code === 'string' ? code : undefined;
}

export function mapMakersApiError(status: number, body: unknown): MakersApiError {
	const code = errorCode(body);
	if (code === 'interest_locked') {
		return { kind: 'unknown', code, message: INTEREST_LOCKED_MESSAGE };
	}
	if (code === 'interest_not_allowed') {
		return { kind: 'unknown', code, message: INTEREST_NOT_ALLOWED_MESSAGE };
	}
	if (code === 'interest_not_open') {
		return { kind: 'unknown', code, message: INTEREST_NOT_OPEN_MESSAGE };
	}
	return { ...mapApiError(status, body), ...(code ? { code } : {}) };
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
): Promise<MakersApiResult<T>> {
	let response: Response;
	try {
		response = await fetchFn(`/api${path}`, init);
	} catch {
		return { ok: false, error: { kind: 'network', message: 'Network error. Please try again.' } };
	}

	const body = await readJson(response);
	if (!response.ok) {
		return { ok: false, error: mapMakersApiError(response.status, body) };
	}

	return { ok: true, data: body as T };
}

export async function listAvailableMakers(
	fetchFn: typeof fetch
): Promise<MakersApiResult<ListAvailableMakersResponse>> {
	return apiRequest<ListAvailableMakersResponse>(fetchFn, '/makers/available');
}

export async function getMyMaker(fetchFn: typeof fetch) {
	return apiRequest<{ maker: Record<string, unknown> | null }>(fetchFn, '/makers/me');
}

export async function applyAsMaker(
	fetchFn: typeof fetch,
	body: {
		display_name: string;
		bio?: string;
		city?: string;
		links?: string;
		capabilities: string[];
	}
) {
	return apiRequest<{ application: Record<string, unknown> }>(fetchFn, '/makers/apply', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});
}

export async function getPublicStorefront(fetchFn: typeof fetch, handle: string) {
	const encoded = encodeURIComponent(handle.replace(/^@/, ''));
	return apiRequest<{ storefront: Record<string, unknown> }>(
		fetchFn,
		`/makers/storefront/${encoded}`
	);
}

export async function updateMyStorefront(fetchFn: typeof fetch, body: Record<string, unknown>) {
	return apiRequest<{ maker: Record<string, unknown> }>(fetchFn, '/makers/me/storefront', {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});
}

export async function listMyListings(fetchFn: typeof fetch) {
	return apiRequest<{ listings: Record<string, unknown>[] }>(fetchFn, '/makers/me/listings');
}

export async function upsertMyListing(fetchFn: typeof fetch, body: Record<string, unknown>) {
	return apiRequest<{ listing: Record<string, unknown> }>(fetchFn, '/makers/me/listings', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});
}

export async function updateListingStock(
	fetchFn: typeof fetch,
	productId: string,
	stockCount: number
) {
	return apiRequest<{ listing: Record<string, unknown> }>(
		fetchFn,
		`/makers/me/listings/${productId}/stock`,
		{
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ stock_count: stockCount })
		}
	);
}

export async function updateListingDetails(
	fetchFn: typeof fetch,
	productId: string,
	body: Record<string, unknown>
) {
	return apiRequest<{ listing: Record<string, unknown> }>(
		fetchFn,
		`/makers/me/listings/${productId}/details`,
		{
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		}
	);
}

export async function uploadMakerAsset(
	fetchFn: typeof fetch,
	file: File,
	purpose: 'banner' | 'avatar' | 'listing' = 'listing'
) {
	const form = new FormData();
	form.set('file', file);
	form.set('purpose', purpose);

	let response: Response;
	try {
		response = await fetchFn('/api/makers/me/assets/upload', {
			method: 'POST',
			body: form
		});
	} catch {
		return {
			ok: false as const,
			error: { kind: 'network' as const, message: 'Network error. Please try again.' }
		};
	}

	const body = await readJson(response);
	if (!response.ok) {
		return { ok: false as const, error: mapApiError(response.status, body) };
	}

	return { ok: true as const, data: body as { url: string; path: string; purpose: string } };
}

export async function setMyListingState(
	fetchFn: typeof fetch,
	productId: string,
	state: 'paused' | 'live' | 'archived'
) {
	return apiRequest<{ listing: Record<string, unknown> }>(
		fetchFn,
		`/makers/me/listings/${productId}/state`,
		{
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ state })
		}
	);
}

export async function listPendingApplications(fetchFn: typeof fetch) {
	return apiRequest<{ applications: Record<string, unknown>[] }>(
		fetchFn,
		'/admin/makers/applications'
	);
}

export async function reviewApplication(
	fetchFn: typeof fetch,
	id: string,
	decision: 'approved' | 'rejected',
	notes?: string
) {
	return apiRequest<{ ok: boolean }>(fetchFn, `/admin/makers/applications/${id}/review`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ decision, notes })
	});
}

export async function listPendingListings(fetchFn: typeof fetch) {
	return apiRequest<{ listings: Record<string, unknown>[] }>(fetchFn, '/admin/listings/pending');
}

export async function reviewListing(
	fetchFn: typeof fetch,
	productId: string,
	decision: 'live' | 'rejected' | 'paused' | 'archived',
	notes?: string
) {
	return apiRequest<{ listing: Record<string, unknown> }>(
		fetchFn,
		`/admin/listings/${productId}/review`,
		{
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ decision, notes })
		}
	);
}

function listingInterestPath(productId: string, suffix = ''): string {
	return `/makers/me/listings/${encodeURIComponent(productId)}/interest${suffix}`;
}

/** Counts only: makers never see who is on the list. */
export async function getMyListingInterest(fetchFn: typeof fetch, productId: string) {
	return apiRequest<MakerInterestSummary>(fetchFn, listingInterestPath(productId));
}

/** Turns the interest check into an ordinary listing and e-mails everyone on the list. */
export async function launchMyListingInterest(
	fetchFn: typeof fetch,
	productId: string,
	body: LaunchInterestBody
) {
	return apiRequest<InterestNotifyResponse>(fetchFn, listingInterestPath(productId, '/launch'), {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});
}

/** The maker is not going ahead; everyone on the list is e-mailed. */
export async function closeMyListingInterest(
	fetchFn: typeof fetch,
	productId: string,
	body: CloseInterestBody
) {
	return apiRequest<InterestNotifyResponse>(fetchFn, listingInterestPath(productId, '/close'), {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});
}
