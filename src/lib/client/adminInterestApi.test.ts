import { describe, expect, it } from 'vitest';
import type { AdminInterestEntry } from '@scweb/api/contracts';
import {
	buildInterestCsv,
	csvField,
	csvPhoneField,
	sortEntriesNewestFirst
} from '$lib/client/adminInterestApi';

function entry(overrides: Partial<AdminInterestEntry> = {}): AdminInterestEntry {
	return {
		id: '00000000-0000-4000-8000-000000000001',
		userId: '00000000-0000-4000-8000-000000000002',
		name: 'Asha Rao',
		email: 'asha@example.com',
		phone: '+919876543210',
		address: {
			name: 'Asha Rao',
			line1: '12, MG Road',
			line2: 'Flat "B"',
			city: 'Bengaluru',
			state: 'Karnataka',
			pincode: '560001',
			phone: '+919876543210'
		},
		createdAt: '2026-11-10T10:00:00.000Z',
		withdrawnAt: null,
		notifiedAt: null,
		...overrides
	};
}

describe('csvField', () => {
	it('quotes and doubles quotes', () => {
		expect(csvField('a "b", c')).toBe('"a ""b"", c"');
	});

	it('neutralises formulas', () => {
		expect(csvField('=HYPERLINK("x")')).toBe('"\'=HYPERLINK(""x"")"');
		expect(csvField('@cmd')).toBe('"\'@cmd"');
	});

	it('writes null as empty', () => {
		expect(csvField(null)).toBe('""');
	});
});

describe('csvPhoneField', () => {
	it('keeps the phone number as text', () => {
		expect(csvPhoneField('+919876543210')).toBe('"=""+919876543210"""');
	});

	it('writes an empty cell for an empty phone number', () => {
		expect(csvPhoneField('')).toBe('""');
		expect(csvPhoneField('abc')).toBe('""');
	});

	it('drops anything that is not a phone character', () => {
		expect(csvPhoneField('98"7)+x')).toBe('"=""987)+"""');
	});
});

describe('buildInterestCsv', () => {
	it('writes a header and one line per entry', () => {
		const csv = buildInterestCsv([entry()]);
		const [header, row] = csv.split('\r\n');
		expect(header).toBe(
			'"Name","Email","Phone","Address","City","State","Pincode","Joined","Emailed"'
		);
		expect(row).toBe(
			'"Asha Rao","asha@example.com","=""+919876543210""","12, MG Road, Flat ""B""","Bengaluru","Karnataka","560001","2026-11-10T10:00:00.000Z",""'
		);
	});

	it('writes empty cells for a blanked phone and address', () => {
		const blank = entry({
			phone: '',
			address: { name: '', line1: '', line2: '', city: '', state: '', pincode: '', phone: '' }
		});
		const [, row] = buildInterestCsv([blank]).split('\r\n');
		expect(row).toBe('"Asha Rao","asha@example.com","","","","","","2026-11-10T10:00:00.000Z",""');
		expect(row).not.toContain('=""');
	});
});

describe('sortEntriesNewestFirst', () => {
	it('puts the latest join first', () => {
		const older = entry({ id: 'a', createdAt: '2026-11-01T00:00:00.000Z' });
		const newer = entry({ id: 'b', createdAt: '2026-11-12T00:00:00.000Z' });
		expect(sortEntriesNewestFirst([older, newer]).map((e) => e.id)).toEqual(['b', 'a']);
	});
});
