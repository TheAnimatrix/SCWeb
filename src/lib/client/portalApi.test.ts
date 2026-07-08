import { describe, expect, it } from 'vitest';
import { mapPortalApiError } from '$lib/client/portalApi';

describe('mapPortalApiError', () => {
	it('maps invalid_transition', () => {
		expect(mapPortalApiError(409, { error: 'invalid_transition' })).toEqual({
			kind: 'invalid_transition',
			message: 'This action is not allowed in the current stage.'
		});
	});

	it('maps forbidden', () => {
		expect(mapPortalApiError(403, { error: 'forbidden' })).toEqual({
			kind: 'forbidden',
			message: 'You do not have access to this resource.'
		});
	});

	it('maps empty_message', () => {
		expect(mapPortalApiError(400, { error: 'empty_message' })).toEqual({
			kind: 'empty_message',
			message: 'Message cannot be empty.'
		});
	});

	it('maps not_found', () => {
		expect(mapPortalApiError(404, { error: 'not_found' })).toEqual({
			kind: 'not_found',
			message: 'Print request not found.'
		});
	});

	it('maps rate_limited by status', () => {
		expect(mapPortalApiError(429, {})).toEqual({
			kind: 'rate_limited',
			message: 'Too many requests. Please wait and try again.'
		});
	});
});
