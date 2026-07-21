import type { PincodeLookupResult } from '$lib/types/pincode';

export async function fetchPincodeLookup(
	fetchFn: typeof fetch,
	pincode: string
): Promise<PincodeLookupResult> {
	const response = await fetchFn(`/pincode/${pincode}`);

	if (response.status === 400) {
		return { ok: false, error: 'invalid_pincode' };
	}

	if (response.status === 404) {
		return { ok: false, error: 'not_found' };
	}

	if (!response.ok) {
		return { ok: false, error: 'upstream_error' };
	}

	return (await response.json()) as PincodeLookupResult;
}
