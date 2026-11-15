import { describe, expect, it } from 'vitest';
import { friendlySupabaseAuthError } from './authApi';

describe('friendlySupabaseAuthError', () => {
	it('maps wrong credentials by code and by message', () => {
		expect(friendlySupabaseAuthError({ code: 'invalid_credentials' })).toBe(
			'Wrong e-mail or password.'
		);
		expect(friendlySupabaseAuthError({ message: 'Invalid login credentials' })).toBe(
			'Wrong e-mail or password.'
		);
	});

	it('maps unconfirmed e-mail', () => {
		expect(friendlySupabaseAuthError({ message: 'Email not confirmed' })).toMatch(
			/^Confirm your e-mail first\./
		);
	});

	it('maps rate limits', () => {
		expect(friendlySupabaseAuthError({ status: 429, message: 'x' })).toMatch(/^Too many attempts/);
	});

	it('maps same-password updates', () => {
		expect(friendlySupabaseAuthError({ code: 'same_password' })).toMatch(/must be different/);
	});

	it('never echoes unknown raw text', () => {
		expect(friendlySupabaseAuthError({ message: 'pq: relation "x" does not exist' })).toBe(
			'Something went wrong. Try again in a moment.'
		);
		expect(friendlySupabaseAuthError(null)).toBe('Something went wrong. Try again in a moment.');
	});
});
