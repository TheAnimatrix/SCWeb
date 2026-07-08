import { describe, expect, it } from 'vitest';
import { buildProxyTargetUrl, getProxyTimeoutMs, isAllowedProxyPath, isPublicReadProxyPath } from './api-proxy';

const API_ORIGIN = 'http://localhost:3001';

describe('isAllowedProxyPath', () => {
	it('allows cart, checkout, print-files, print-payments, print-requests, and chats paths', () => {
		expect(isAllowedProxyPath('cart')).toBe(true);
		expect(isAllowedProxyPath('cart/items/abc')).toBe(true);
		expect(isAllowedProxyPath('checkout/order')).toBe(true);
		expect(isAllowedProxyPath('print-files/upload')).toBe(true);
		expect(isAllowedProxyPath('print-files/abc/download-url')).toBe(true);
		expect(isAllowedProxyPath('print-payments/abc/order')).toBe(true);
		expect(isAllowedProxyPath('print-payments/abc/confirm')).toBe(true);
		expect(isAllowedProxyPath('print-requests/abc/actions')).toBe(true);
		expect(isAllowedProxyPath('chats/messages')).toBe(true);
		expect(isAllowedProxyPath('catalog/home')).toBe(true);
		expect(isAllowedProxyPath('constants/FILTYPES')).toBe(true);
		expect(isAllowedProxyPath('products/abc/reviews')).toBe(true);
	});

	it('rejects paths outside the allowlist', () => {
		expect(isAllowedProxyPath('health')).toBe(false);
		expect(isAllowedProxyPath('@attacker.example')).toBe(false);
		expect(isAllowedProxyPath('..%2f..')).toBe(false);
		expect(isAllowedProxyPath(undefined)).toBe(false);
	});

	it('rejects dot-segment traversal even when the allowlist prefix matches', () => {
		expect(isAllowedProxyPath('cart/../health')).toBe(false);
		expect(isAllowedProxyPath('cart/%2e%2e/health')).toBe(false);
		expect(isAllowedProxyPath('checkout/..')).toBe(false);
	});

	it('allows normal paths without dot segments', () => {
		expect(isAllowedProxyPath('cart/items/abc')).toBe(true);
	});
});

describe('isPublicReadProxyPath', () => {
	it('allows public catalog GET paths without auth', () => {
		expect(isPublicReadProxyPath('catalog/home', 'GET')).toBe(true);
		expect(isPublicReadProxyPath('products/abc/reviews', 'GET')).toBe(true);
		expect(isPublicReadProxyPath('constants/FILTYPES', 'GET')).toBe(true);
	});

	it('requires auth for cart and mutations', () => {
		expect(isPublicReadProxyPath('cart', 'GET')).toBe(false);
		expect(isPublicReadProxyPath('catalog/home', 'POST')).toBe(false);
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
