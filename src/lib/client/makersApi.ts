import type { ListAvailableMakersResponse } from '@scweb/api/contracts';
import { mapApiError, type CartApiResult } from '$lib/client/cartApi';

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
): Promise<CartApiResult<T>> {
	let response: Response;
	try {
		response = await fetchFn(`/api${path}`, init);
	} catch {
		return { ok: false, error: { kind: 'network', message: 'Network error. Please try again.' } };
	}

	const body = await readJson(response);
	if (!response.ok) {
		return { ok: false, error: mapApiError(response.status, body) };
	}

	return { ok: true, data: body as T };
}

export async function listAvailableMakers(
	fetchFn: typeof fetch
): Promise<CartApiResult<ListAvailableMakersResponse>> {
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
	body: {
		guarantee?: string | null;
		documentation?: { data: string; isMDUrl: boolean }[];
		faq?: { question: string; answer: string }[];
	}
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
