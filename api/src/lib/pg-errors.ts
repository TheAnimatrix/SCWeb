/**
 * Postgres error codes, read safely.
 *
 * drizzle-orm wraps driver errors in a DrizzleQueryError and puts the original error on `.cause`,
 * so `error.code` on the thrown value is undefined. Always go through these helpers.
 */

const SQLSTATE = /^[0-9A-Z]{5}$/;

/** The SQLSTATE of a thrown database error, looking through wrapped causes. */
export function pgErrorCode(error: unknown): string | null {
	let current: unknown = error;
	for (let depth = 0; depth < 5 && typeof current === 'object' && current !== null; depth++) {
		const code = (current as { code?: unknown }).code;
		if (typeof code === 'string' && SQLSTATE.test(code)) return code;
		current = (current as { cause?: unknown }).cause;
	}
	return null;
}

/** True for a unique-constraint violation (SQLSTATE 23505). */
export function isUniqueViolation(error: unknown): boolean {
	return pgErrorCode(error) === '23505';
}
