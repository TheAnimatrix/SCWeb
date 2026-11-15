import { describe, expect, it } from 'vitest';
import {
	normalizeAddressForSave,
	normalizeIndianPhone,
	validateAddress,
	validateAddressFields,
	type Address
} from '$lib/types/product';

const valid: Address = {
	name: 'Raj',
	line1: 'Flat 4B',
	line2: '',
	city: 'Chennai',
	pincode: '600001',
	state: 'Tamil Nadu',
	phone: '9876543210',
	email: ''
};

describe('normalizeIndianPhone', () => {
	it.each([
		['9876543210', '+919876543210'],
		['98765 43210', '+919876543210'],
		['098765 43210', '+919876543210'],
		['+91 98765-43210', '+919876543210'],
		['+919876543210', '+919876543210'],
		['919876543210', '+919876543210'],
		['(98765) 43210', '+919876543210']
	])('accepts %s', (input, expected) => {
		expect(normalizeIndianPhone(input)).toBe(expected);
	});

	it.each([['5876543210'], ['98765'], ['98765432101'], ['abc'], [''], [undefined]])(
		'rejects %s',
		(input) => {
			expect(normalizeIndianPhone(input)).toBeNull();
		}
	);
});

describe('validateAddressFields', () => {
	it('accepts short real names and short first lines', () => {
		expect(validateAddressFields(valid)).toEqual({});
		expect(validateAddressFields({ ...valid, name: 'Om' })).toEqual({});
	});

	it('accepts long names up to 80 characters', () => {
		expect(validateAddressFields({ ...valid, name: 'A'.repeat(80) })).toEqual({});
		expect(validateAddressFields({ ...valid, name: 'A'.repeat(81) }).name).toBeDefined();
	});

	it('rejects a one-letter name and a two-letter first line', () => {
		const errors = validateAddressFields({ ...valid, name: 'R', line1: '4B' });
		expect(errors.name).toBe('Enter your full name.');
		expect(errors.line1).toBeDefined();
	});

	it('accepts phones with spaces, dashes, 0 and +91 prefixes', () => {
		for (const phone of ['98765 43210', '098765 43210', '+91 98765-43210']) {
			expect(validateAddressFields({ ...valid, phone }).phone).toBeUndefined();
		}
	});

	it('reports every invalid field at once', () => {
		const errors = validateAddressFields(
			{ name: '', line1: '', city: '', pincode: '12', state: 'Nowhere', phone: '123' },
			true
		);
		expect(Object.keys(errors).sort()).toEqual(
			['city', 'email', 'line1', 'name', 'phone', 'pincode', 'state'].sort()
		);
		expect(errors.phone).toBe('Enter a 10-digit mobile number.');
	});

	it('only checks e-mail when asked', () => {
		expect(validateAddressFields(valid, false).email).toBeUndefined();
		expect(validateAddressFields(valid, true).email).toBeDefined();
		expect(validateAddressFields({ ...valid, email: 'a@b.in' }, true).email).toBeUndefined();
	});
});

describe('validateAddress', () => {
	it('returns null for a valid address and the first problem otherwise', () => {
		expect(validateAddress(valid)).toBeNull();
		expect(validateAddress({ ...valid, name: '', phone: '1' })).toBe('Enter your full name.');
	});
});

describe('normalizeAddressForSave', () => {
	it('trims fields and stores the phone as +91 and 10 digits', () => {
		expect(
			normalizeAddressForSave({ ...valid, name: '  Raj ', phone: '098765 43210' })
		).toMatchObject({ name: 'Raj', phone: '+919876543210' });
	});

	it('leaves an invalid phone as typed so the error can be shown', () => {
		expect(normalizeAddressForSave({ ...valid, phone: ' 123 ' }).phone).toBe('123');
	});
});
