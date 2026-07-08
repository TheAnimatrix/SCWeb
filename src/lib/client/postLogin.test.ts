import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readPostLoginURL, removePostLoginURL, setPostLoginURL } from './postLogin';

function createStorage(): Storage {
	const store = new Map<string, string>();
	return {
		get length() {
			return store.size;
		},
		clear() {
			store.clear();
		},
		getItem(key: string) {
			return store.has(key) ? store.get(key)! : null;
		},
		key(index: number) {
			return [...store.keys()][index] ?? null;
		},
		removeItem(key: string) {
			store.delete(key);
		},
		setItem(key: string, value: string) {
			store.set(key, value);
		}
	};
}

describe('postLogin client wrappers', () => {
	beforeEach(() => {
		vi.stubGlobal('window', {});
		vi.stubGlobal('localStorage', createStorage());
	});

	it('round-trips a safe path through set and read', () => {
		expect(setPostLoginURL('/user/profile/orders')).toBe(true);
		expect(readPostLoginURL()).toBe('/user/profile/orders');
	});

	it('rejects unsafe values on write', () => {
		expect(setPostLoginURL('//evil.com')).toBe(false);
		expect(localStorage.getItem('postLoginURL')).toBeNull();
		expect(readPostLoginURL()).toBeNull();
	});

	it('clears unsafe stored values on read', () => {
		localStorage.setItem('postLoginURL', '/%2f%2fevil.com');
		expect(readPostLoginURL()).toBeNull();
		expect(localStorage.getItem('postLoginURL')).toBeNull();
	});

	it('removePostLoginURL clears the stored value', () => {
		setPostLoginURL('/user/profile');
		removePostLoginURL();
		expect(readPostLoginURL()).toBeNull();
	});
});
