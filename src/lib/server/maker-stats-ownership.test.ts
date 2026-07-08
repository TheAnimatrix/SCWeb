import { describe, expect, it } from 'vitest';
import { isMakerStatsOwner } from './maker-stats-ownership.js';

const MAKER_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const OTHER_USER_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

describe('maker stats ownership', () => {
	it('returns 403 for non-owner (predicate false)', () => {
		expect(isMakerStatsOwner(OTHER_USER_ID, MAKER_ID)).toBe(false);
	});

	it('allows maker to update own stats', () => {
		expect(isMakerStatsOwner(MAKER_ID, MAKER_ID)).toBe(true);
	});
});
