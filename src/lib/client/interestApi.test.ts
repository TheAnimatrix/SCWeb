import { describe, expect, it, vi } from 'vitest';
import {
	getMyInterest,
	INTEREST_JOIN_FAILED,
	INTEREST_LEAVE_FAILED,
	mapInterestError,
	showInterest,
	withdrawInterest
} from '$lib/client/interestApi';

function jsonResponse(status: number, body: unknown) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'content-type': 'application/json' }
	});
}

const address = {
	id: 'a1',
	created_at: '2026-01-01',
	name: 'Asha Rao',
	line1: '12 Lake Road',
	line2: '',
	city: 'Bengaluru',
	pincode: '560001',
	state: 'Karnataka',
	phone: '+919876543210',
	email: ''
};

describe('mapInterestError', () => {
	it('maps own_listing and interest_closed to the copy', () => {
		expect(mapInterestError(409, { error: 'own_listing' })).toEqual({
			kind: 'own_listing',
			message: "This is your own listing, so you can't add yourself."
		});
		expect(mapInterestError(409, { error: 'interest_closed' })).toEqual({
			kind: 'interest_closed',
			message: 'This interest check has ended.'
		});
	});

	it('maps unauthorized by code and by bare 401', () => {
		expect(mapInterestError(401, { error: 'unauthorized' }).kind).toBe('unauthorized');
		expect(mapInterestError(401, null).kind).toBe('unauthorized');
	});

	it('maps product_not_found', () => {
		expect(mapInterestError(404, { error: 'product_not_found' }).kind).toBe('product_not_found');
	});

	it('keeps the field message on invalid_payload', () => {
		expect(
			mapInterestError(400, { error: 'invalid_payload', message: 'Enter a 6-digit pincode.' })
		).toEqual({ kind: 'invalid_payload', message: 'Enter a 6-digit pincode.' });
		expect(mapInterestError(400, { error: 'invalid_payload' }).message).toBe(INTEREST_JOIN_FAILED);
	});

	it('falls back to the given sentence for anything else', () => {
		expect(mapInterestError(500, { error: 'boom' })).toEqual({
			kind: 'unknown',
			message: INTEREST_JOIN_FAILED
		});
		expect(mapInterestError(500, null, INTEREST_LEAVE_FAILED).message).toBe(INTEREST_LEAVE_FAILED);
	});

	it('maps 429 to rate_limited', () => {
		expect(mapInterestError(429, null).kind).toBe('rate_limited');
	});
});

describe('interest requests', () => {
	it('getMyInterest calls GET /api/products/:id/interest/me', async () => {
		const fetchFn = vi.fn(async () => jsonResponse(200, { interested: true, since: 'x' }));
		const result = await getMyInterest(fetchFn as unknown as typeof fetch, 'p1');
		expect(fetchFn).toHaveBeenCalledWith('/api/products/p1/interest/me', expect.anything());
		expect(result).toEqual({ ok: true, data: { interested: true, since: 'x' } });
	});

	it('showInterest posts only the checkout address fields', async () => {
		const fetchFn = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () =>
			jsonResponse(200, { interested: true, interestedCount: 4 })
		);
		const result = await showInterest(fetchFn as unknown as typeof fetch, 'p1', address);
		const [url, init] = fetchFn.mock.calls[0];
		expect(url).toBe('/api/products/p1/interest');
		expect(init?.method).toBe('POST');
		expect(JSON.parse(String(init?.body))).toEqual({
			address: {
				name: 'Asha Rao',
				line1: '12 Lake Road',
				line2: '',
				city: 'Bengaluru',
				pincode: '560001',
				state: 'Karnataka',
				phone: '+919876543210'
			}
		});
		expect(result).toEqual({ ok: true, data: { interested: true, interestedCount: 4 } });
	});

	it('withdrawInterest sends DELETE and maps failures to the removal sentence', async () => {
		const fetchFn = vi.fn(async () => jsonResponse(500, {}));
		const result = await withdrawInterest(fetchFn as unknown as typeof fetch, 'p1');
		expect(fetchFn).toHaveBeenCalledWith(
			'/api/products/p1/interest',
			expect.objectContaining({ method: 'DELETE' })
		);
		expect(result).toEqual({
			ok: false,
			error: { kind: 'unknown', message: INTEREST_LEAVE_FAILED }
		});
	});

	it('reports a network failure', async () => {
		const fetchFn = vi.fn(async () => {
			throw new TypeError('offline');
		});
		const result = await showInterest(fetchFn as unknown as typeof fetch, 'p1', address);
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error.kind).toBe('network');
	});
});
