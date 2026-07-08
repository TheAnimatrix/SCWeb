import { describe, expect, it } from 'vitest';
import { isCartOwnedBy } from '$lib/server/cart';

const clientId = 'guest-client-abc';
const userId = 'user-uuid-123';

describe('isCartOwnedBy', () => {
	it('passes when uid-owned cart matches authenticated userId', () => {
		const cart = { client_id: clientId, uid: userId };
		expect(isCartOwnedBy(cart, clientId, userId)).toBe(true);
	});

	it('fails when uid-owned cart matches only clientId (no userId)', () => {
		const cart = { client_id: clientId, uid: userId };
		expect(isCartOwnedBy(cart, clientId, null)).toBe(false);
	});

	it('passes when guest cart (uid null) matches clientId', () => {
		const cart = { client_id: clientId, uid: null };
		expect(isCartOwnedBy(cart, clientId, null)).toBe(true);
	});

	it('fails when guest cart has wrong clientId', () => {
		const cart = { client_id: clientId, uid: null };
		expect(isCartOwnedBy(cart, 'other-client', null)).toBe(false);
	});
});
