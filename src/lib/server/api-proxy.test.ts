import { describe, expect, it } from 'vitest';
import {
	buildProxyTargetUrl,
	getProxyTimeoutMs,
	isAllowedProxyMethod,
	isAllowedProxyPath,
	isUploadProxyPath
} from './api-proxy';

const API_ORIGIN = 'http://localhost:3001';

describe('isAllowedProxyPath', () => {
	it('allows any non-empty path without traversal segments', () => {
		expect(isAllowedProxyPath('makers/available')).toBe(true);
		expect(isAllowedProxyPath('health')).toBe(true);
		expect(isAllowedProxyPath('cart/items/abc')).toBe(true);
		expect(isAllowedProxyPath('@attacker.example')).toBe(true);
	});

	it('rejects empty paths and traversal', () => {
		expect(isAllowedProxyPath(undefined)).toBe(false);
		expect(isAllowedProxyPath('..%2f..')).toBe(false);
		expect(isAllowedProxyPath('cart/../health')).toBe(false);
		expect(isAllowedProxyPath('cart/%2e%2e/health')).toBe(false);
		expect(isAllowedProxyPath('checkout/..')).toBe(false);
	});
});

describe('isAllowedProxyMethod', () => {
	it('allows standard API verbs', () => {
		expect(isAllowedProxyMethod('GET')).toBe(true);
		expect(isAllowedProxyMethod('POST')).toBe(true);
		expect(isAllowedProxyMethod('PUT')).toBe(true);
		expect(isAllowedProxyMethod('PATCH')).toBe(true);
		expect(isAllowedProxyMethod('DELETE')).toBe(true);
	});
});

describe('getProxyTimeoutMs', () => {
	it('uses a longer timeout for print-files uploads', () => {
		expect(isUploadProxyPath('print-files/upload')).toBe(true);
		expect(getProxyTimeoutMs('print-files/upload')).toBe(60_000);
		expect(getProxyTimeoutMs('print-files/abc/download-url')).toBe(10_000);
		expect(getProxyTimeoutMs('cart')).toBe(10_000);
	});
});

describe('buildProxyTargetUrl', () => {
	it('keeps requests on API_ORIGIN', () => {
		const target = buildProxyTargetUrl(API_ORIGIN, '@attacker.example', '');

		expect(target.origin).toBe('http://localhost:3001');
		expect(target.hostname).toBe('localhost');
		expect(target.pathname).toBe('/@attacker.example');
	});

	it('preserves search params', () => {
		const target = buildProxyTargetUrl(API_ORIGIN, 'cart', '?foo=bar');

		expect(target.href).toBe('http://localhost:3001/cart?foo=bar');
	});
});
