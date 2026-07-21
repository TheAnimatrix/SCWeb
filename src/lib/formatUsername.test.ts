import { describe, expect, it } from 'vitest';
import { formatTagDisplayLabel, formatUsernameDisplay } from '$lib/utils/formatUsername';

describe('formatUsernameDisplay', () => {
	it('preserves lowercase snake_case usernames', () => {
		expect(formatUsernameDisplay('sc_adi')).toBe('sc_adi');
		expect(formatUsernameDisplay('maker_one')).toBe('maker_one');
	});

	it('turns display names with underscores into spaced text', () => {
		expect(formatUsernameDisplay('Adithya_Angara')).toBe('Adithya Angara');
	});

	it('trims surrounding whitespace', () => {
		expect(formatUsernameDisplay('  sc_adi  ')).toBe('sc_adi');
	});
});

describe('formatTagDisplayLabel', () => {
	it('still formats tag labels with underscores', () => {
		expect(formatTagDisplayLabel('desk_accessory')).toBe('desk accessory');
	});
});
