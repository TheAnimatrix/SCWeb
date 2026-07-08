import { describe, expect, it } from 'vitest';
import { sanitizePostLoginUrl } from './postLoginUrl';

describe('sanitizePostLoginUrl', () => {
	it('accepts a normal relative path', () => {
		expect(sanitizePostLoginUrl('/user/profile/orders')).toBe('/user/profile/orders');
	});

	it('accepts a path with query string', () => {
		expect(sanitizePostLoginUrl('/3dp-portal/maker?tab=orders')).toBe(
			'/3dp-portal/maker?tab=orders'
		);
	});

	it('rejects null and non-strings', () => {
		expect(sanitizePostLoginUrl(null)).toBeNull();
		expect(sanitizePostLoginUrl(undefined)).toBeNull();
		expect(sanitizePostLoginUrl(42)).toBeNull();
	});

	it('rejects empty and whitespace-only strings', () => {
		expect(sanitizePostLoginUrl('')).toBeNull();
		expect(sanitizePostLoginUrl('   ')).toBeNull();
	});

	it('rejects protocol-relative URLs', () => {
		expect(sanitizePostLoginUrl('//evil.com')).toBeNull();
		expect(sanitizePostLoginUrl('//evil.com/path')).toBeNull();
	});

	it('rejects backslash open redirects', () => {
		expect(sanitizePostLoginUrl('/\\evil.com')).toBeNull();
		expect(sanitizePostLoginUrl('/path\\to')).toBeNull();
	});

	it('rejects absolute URLs', () => {
		expect(sanitizePostLoginUrl('https://evil.com')).toBeNull();
		expect(sanitizePostLoginUrl('http://evil.com/path')).toBeNull();
	});

	it('rejects javascript and data schemes in path form', () => {
		expect(sanitizePostLoginUrl('javascript:alert(1)')).toBeNull();
		expect(sanitizePostLoginUrl('/javascript:alert(1)')).toBeNull();
		expect(sanitizePostLoginUrl('/data:text/html,<script>alert(1)</script>')).toBeNull();
	});

	it('rejects encoded protocol-relative URLs', () => {
		expect(sanitizePostLoginUrl('/%2f%2fevil.com')).toBeNull();
	});

	it('rejects paths without a leading slash', () => {
		expect(sanitizePostLoginUrl('user/profile')).toBeNull();
		expect(sanitizePostLoginUrl(' /user/profile')).toBeNull();
	});
});
