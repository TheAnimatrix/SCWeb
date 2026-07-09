import { getValidState } from '$lib/types/product';
import type { PincodeLookupFailure, PincodeLookupResult, PincodeLookupSuccess } from '$lib/types/pincode';

const PINCODE_API_URL = 'https://api.postalpincode.in/pincode';

interface PostalApiPostOffice {
	Name: string;
	District: string;
	State: string;
	Pincode: string;
}

interface PostalApiResponse {
	Status: string;
	Message: string;
	PostOffice: PostalApiPostOffice[] | null;
}
function uniqueSorted(values: string[]): string[] {
	return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort((a, b) =>
		a.localeCompare(b)
	);
}

export async function lookupPincode(pincode: string): Promise<PincodeLookupResult> {
	if (!/^\d{6}$/.test(pincode)) {
		return { ok: false, error: 'invalid_pincode' };
	}

	try {
		const response = await fetch(`${PINCODE_API_URL}/${pincode}`, {
			signal: AbortSignal.timeout(5000)
		});

		if (!response.ok) {
			return { ok: false, error: 'upstream_error' };
		}

		const payload = (await response.json()) as PostalApiResponse[];
		const result = payload[0];

		if (!result || result.Status !== 'Success' || !result.PostOffice?.length) {
			return { ok: false, error: 'not_found' };
		}

		const rawState = result.PostOffice[0]?.State ?? '';
		const [matchedState] = getValidState(rawState);

		if (!matchedState) {
			return { ok: false, error: 'not_found' };
		}

		const cities = uniqueSorted(result.PostOffice.map((office) => office.District));

		return {
			ok: true,
			pincode,
			state: matchedState,
			cities
		};
	} catch {
		return { ok: false, error: 'upstream_error' };
	}
}
