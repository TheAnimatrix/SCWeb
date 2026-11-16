import { describe, expect, it, vi } from 'vitest';
import {
	INTEREST_LOCKED_MESSAGE,
	closeMyListingInterest,
	getMyListingInterest,
	launchMyListingInterest,
	mapMakersApiError,
	upsertMyListing
} from '$lib/client/makersApi';

function jsonResponse(status: number, body: unknown) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'content-type': 'application/json' }
	});
}

describe('mapMakersApiError', () => {
	it('maps interest_locked to the locked sentence and keeps the code', () => {
		expect(mapMakersApiError(409, { error: 'interest_locked', message: 'x' })).toEqual({
			kind: 'unknown',
			code: 'interest_locked',
			message: INTEREST_LOCKED_MESSAGE
		});
	});

	it('keeps the code for other errors', () => {
		const error = mapMakersApiError(409, { error: 'not_an_interest_listing', message: 'Nope.' });
		expect(error.code).toBe('not_an_interest_listing');
		expect(error.message).toBe('Nope.');
	});
});

describe('maker interest calls', () => {
	it('gets the counts-only summary', async () => {
		const summary = {
			status: 'open',
			targetCount: 10,
			shipsWithinDays: 30,
			interestedCount: 2,
			notifiedCount: 0,
			byState: [],
			byCity: []
		};
		const fetchFn = vi.fn(async () => jsonResponse(200, summary));
		const result = await getMyListingInterest(fetchFn as typeof fetch, 'p1');
		expect(fetchFn).toHaveBeenCalledWith('/api/makers/me/listings/p1/interest', undefined);
		expect(result).toEqual({ ok: true, data: summary });
	});

	it('posts launch with stock and message', async () => {
		const fetchFn = vi.fn<typeof fetch>(async () =>
			jsonResponse(200, { status: 'launched', notified: 3, pending: 0 })
		);
		const result = await launchMyListingInterest(fetchFn as typeof fetch, 'p1', {
			stock_count: 5,
			message: 'Thanks'
		});
		const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toBe('/api/makers/me/listings/p1/interest/launch');
		expect(init.method).toBe('POST');
		expect(JSON.parse(init.body as string)).toEqual({ stock_count: 5, message: 'Thanks' });
		expect(result.ok && result.data.notified).toBe(3);
	});

	it('posts close', async () => {
		const fetchFn = vi.fn<typeof fetch>(async () =>
			jsonResponse(200, { status: 'closed', notified: 0, pending: 0 })
		);
		await closeMyListingInterest(fetchFn as typeof fetch, 'p1', {});
		const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toBe('/api/makers/me/listings/p1/interest/close');
		expect(init.method).toBe('POST');
	});

	it('surfaces interest_locked from a listing save', async () => {
		const fetchFn = vi.fn(async () => jsonResponse(409, { error: 'interest_locked' }));
		const result = await upsertMyListing(fetchFn as typeof fetch, {
			interest: { enabled: true, target_count: 5 }
		});
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.code).toBe('interest_locked');
			expect(result.error.message).toBe(INTEREST_LOCKED_MESSAGE);
		}
	});
});
