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
