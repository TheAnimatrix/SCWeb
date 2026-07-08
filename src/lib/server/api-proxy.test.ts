import { describe, expect, it } from 'vitest';
import { buildProxyTargetUrl, getProxyTimeoutMs, isAllowedProxyPath } from './api-proxy';

const API_ORIGIN = 'http://localhost:3001';

describe('isAllowedProxyPath', () => {
	it('allows cart, checkout, print-files, and print-payments paths', () => {
		expect(isAllowedProxyPath('cart')).toBe(true);
		expect(isAllowedProxyPath('cart/items/abc')).toBe(true);
		expect(isAllowedProxyPath('checkout/order')).toBe(true);
		expect(isAllowedProxyPath('print-files/upload')).toBe(true);
		expect(isAllowedProxyPath('print-files/abc/download-url')).toBe(true);
		expect(isAllowedProxyPath('print-payments/abc/order')).toBe(true);
		expect(isAllowedProxyPath('print-payments/abc/confirm')).toBe(true);
	});

	it('rejects paths outside the allowlist', () => {
		expect(isAllowedProxyPath('health')).toBe(false);
		expect(isAllowedProxyPath('@attacker.example')).toBe(false);
		expect(isAllowedProxyPath('..%2f..')).toBe(false);
		expect(isAllowedProxyPath(undefined)).toBe(false);
	});
});

describe('getProxyTimeoutMs', () => {
	it('uses a longer timeout for print-files uploads', () => {
		expect(getProxyTimeoutMs('print-files/upload')).toBe(60_000);
		expect(getProxyTimeoutMs('print-files/abc/download-url')).toBe(10_000);
		expect(getProxyTimeoutMs('cart')).toBe(10_000);
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
