import { describe, expect, it } from 'vitest';
import {
	oauthCallbackUrl,
	postLoginFromSearchParams,
	resolveAuthCallbackNext,
	sanitizePostLoginUrl,
	signInPath
} from './postLoginUrl';

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

	it('rejects values over 2048 characters', () => {
		expect(sanitizePostLoginUrl(`/${'a'.repeat(2048)}`)).toBeNull();
		expect(sanitizePostLoginUrl(`/${'a'.repeat(2047)}`)).toBe(`/${'a'.repeat(2047)}`);
	});

	it('rejects control characters', () => {
		expect(sanitizePostLoginUrl('/user/profile\x00')).toBeNull();
		expect(sanitizePostLoginUrl('/user/profile%0Aorders')).toBeNull();
	});

	it('rejects double-encoded javascript scheme', () => {
		expect(sanitizePostLoginUrl('/javascript%253aalert(1)')).toBeNull();
	});

	it('rejects encoded backslash open redirects', () => {
		expect(sanitizePostLoginUrl('/%5c%5cevil.com')).toBeNull();
	});
});

describe('postLoginFromSearchParams', () => {
	it('prefers postLogin', () => {
		const params = new URLSearchParams('postLogin=/cart&redirectTo=/portal');
		expect(postLoginFromSearchParams(params)).toBe('/cart');
	});

	it('accepts the legacy redirectTo alias', () => {
		expect(postLoginFromSearchParams(new URLSearchParams('redirectTo=%2Fportal'))).toBe('/portal');
	});

	it('falls back to redirectTo when postLogin is unsafe', () => {
		const params = new URLSearchParams('postLogin=//evil.com&redirectTo=/portal');
		expect(postLoginFromSearchParams(params)).toBe('/portal');
	});

	it('returns null when neither is safe', () => {
		expect(
			postLoginFromSearchParams(new URLSearchParams('redirectTo=https://evil.com'))
		).toBeNull();
		expect(postLoginFromSearchParams(new URLSearchParams(''))).toBeNull();
	});
});

describe('signInPath', () => {
	it('encodes a safe path', () => {
		expect(signInPath('/user/profile/orders?x=1')).toBe(
			'/user/sign?postLogin=%2Fuser%2Fprofile%2Forders%3Fx%3D1'
		);
	});

	it('drops unsafe or empty targets', () => {
		expect(signInPath('//evil.com')).toBe('/user/sign');
		expect(signInPath(null)).toBe('/user/sign');
	});
});

describe('oauthCallbackUrl', () => {
	it('builds the callback from the origin', () => {
		expect(oauthCallbackUrl('https://selfcrafted.in', null)).toBe(
			'https://selfcrafted.in/auth/callback'
		);
		expect(oauthCallbackUrl('https://selfcrafted.in/', null)).toBe(
			'https://selfcrafted.in/auth/callback'
		);
	});

	it('carries a safe next path', () => {
		expect(oauthCallbackUrl('https://selfcrafted.in', '/cart')).toBe(
			'https://selfcrafted.in/auth/callback?next=%2Fcart'
		);
	});

	it('drops an unsafe next path', () => {
		expect(oauthCallbackUrl('https://selfcrafted.in', 'https://evil.com')).toBe(
			'https://selfcrafted.in/auth/callback'
		);
		expect(oauthCallbackUrl('https://selfcrafted.in', '/%2f%2fevil.com')).toBe(
			'https://selfcrafted.in/auth/callback'
		);
	});
});

describe('resolveAuthCallbackNext', () => {
	it('returns a safe path', () => {
		expect(resolveAuthCallbackNext('/user/profile/orders')).toBe('/user/profile/orders');
	});

	it('falls back to / for unsafe, missing or looping targets', () => {
		expect(resolveAuthCallbackNext(null)).toBe('/');
		expect(resolveAuthCallbackNext('//evil.com')).toBe('/');
		expect(resolveAuthCallbackNext('/\\evil.com')).toBe('/');
		expect(resolveAuthCallbackNext('https://evil.com')).toBe('/');
		expect(resolveAuthCallbackNext('/auth/callback?code=x')).toBe('/');
		expect(resolveAuthCallbackNext('/user/sign')).toBe('/');
	});
});

describe('auth pages are never a return target', () => {
	it('ignores a postLogin that points back at sign-in', () => {
		expect(postLoginFromSearchParams(new URLSearchParams('postLogin=/user/sign'))).toBeNull();
		expect(
			postLoginFromSearchParams(
				new URLSearchParams({ postLogin: '/user/sign?postLogin=/user/sign' })
			)
		).toBeNull();
		expect(postLoginFromSearchParams(new URLSearchParams('redirectTo=/auth/callback'))).toBeNull();
	});

	it('does not wrap sign-in inside a sign-in link', () => {
		expect(signInPath('/user/sign?postLogin=/cart')).toBe('/user/sign');
		expect(signInPath('/user/sign/')).toBe('/user/sign');
	});

	it('still accepts other /user pages', () => {
		expect(signInPath('/user/profile/orders')).toBe(
			'/user/sign?postLogin=%2Fuser%2Fprofile%2Forders'
		);
		expect(postLoginFromSearchParams(new URLSearchParams('postLogin=/user/signup-help'))).toBe(
			'/user/signup-help'
		);
	});
});
