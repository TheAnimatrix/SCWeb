import { describe, expect, it } from 'vitest';
import { isUniqueViolation, pgErrorCode } from './pg-errors.js';

describe('pgErrorCode', () => {
	it('reads the code from a plain driver error', () => {
		expect(pgErrorCode(Object.assign(new Error('duplicate key'), { code: '23505' }))).toBe('23505');
	});

	it('reads the code from a wrapped cause, as drizzle throws it', () => {
		const driverError = Object.assign(new Error('duplicate key'), { code: '23505' });
		const wrapped = new Error('Failed query: insert into ...', { cause: driverError });
		expect(pgErrorCode(wrapped)).toBe('23505');
		expect(isUniqueViolation(wrapped)).toBe(true);
	});

	it('ignores codes that are not SQLSTATEs', () => {
		expect(pgErrorCode(Object.assign(new Error('socket'), { code: 'ECONNRESET' }))).toBeNull();
	});

	it('returns null for non-errors', () => {
		expect(pgErrorCode(null)).toBeNull();
		expect(pgErrorCode('23505')).toBeNull();
		expect(isUniqueViolation(new Error('other'))).toBe(false);
	});
});
