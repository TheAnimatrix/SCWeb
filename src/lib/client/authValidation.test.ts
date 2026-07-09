import { describe, expect, it } from 'vitest';
import {
	validatePasswordResetConfirm,
	validatePasswordResetRequest
} from '$lib/client/authValidation';

describe('authValidation', () => {
	it('rejects invalid reset email', () => {
		expect(validatePasswordResetRequest('not-an-email')).toBeTruthy();
	});

	it('accepts valid reset email', () => {
		expect(validatePasswordResetRequest('user@example.com')).toBeNull();
	});

	it('rejects mismatched passwords', () => {
		expect(
			validatePasswordResetConfirm({
				tokenHash: 'abc',
				password: 'Password1',
				confirmPassword: 'Password2'
			})
		).toBe('Passwords do not match');
	});

	it('accepts valid reset confirm payload', () => {
		expect(
			validatePasswordResetConfirm({
				tokenHash: 'abc',
				password: 'Password1',
				confirmPassword: 'Password1'
			})
		).toBeNull();
	});
});
