import { describe, expect, it } from 'vitest';
import { buildProxyTargetUrl, isAllowedProxyPath } from './api-proxy';

const API_ORIGIN = 'http://localhost:3001';

describe('isAllowedProxyPath', () => {
	it('allows cart and checkout paths', () => {
		expect(isAllowedProxyPath('cart')).toBe(true);
		expect(isAllowedProxyPath('cart/items/abc')).toBe(true);
		expect(isAllowedProxyPath('checkout/order')).toBe(true);
	});

	it('rejects paths outside the allowlist', () => {
		expect(isAllowedProxyPath('health')).toBe(false);
		expect(isAllowedProxyPath('@attacker.example')).toBe(false);
		expect(isAllowedProxyPath('..%2f..')).toBe(false);
		expect(isAllowedProxyPath(undefined)).toBe(false);
	});
});

describe('buildProxyTargetUrl', () => {
	it('keeps requests on API_ORIGIN for @-prefixed paths', () => {
		const target = buildProxyTargetUrl(API_ORIGIN, '@attacker.example', '');

		expect(target.origin).toBe('http://localhost:3001');
		expect(target.hostname).toBe('localhost');
		expect(target.pathname).toBe('/@attacker.example');
	});

	it('does not treat encoded traversal as a host escape', () => {
		const target = buildProxyTargetUrl(API_ORIGIN, '..%2f..', '');

		expect(target.origin).toBe('http://localhost:3001');
		expect(target.hostname).toBe('localhost');
		expect(target.pathname).toBe('/..%2f..');
	});

	it('preserves search params', () => {
		const target = buildProxyTargetUrl(API_ORIGIN, 'cart', '?foo=bar');

		expect(target.href).toBe('http://localhost:3001/cart?foo=bar');
	});
});
