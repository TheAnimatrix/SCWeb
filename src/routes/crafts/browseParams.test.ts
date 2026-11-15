import { describe, expect, it } from 'vitest';
import { sanitizeBrowseParams } from './browseParams';

function sanitize(query: string): string {
	return sanitizeBrowseParams(new URLSearchParams(query)).toString();
}

describe('sanitizeBrowseParams', () => {
	it('drops values the API would reject', () => {
		expect(sanitize('minPrice=abc&maxPrice=-5&page=zero&sort=cheapest&filter=nope')).toBe('');
	});

	it('keeps valid filters and the search text', () => {
		expect(sanitize('q=+hotend+&filter=spares&inStock=true&sort=price_asc&page=2')).toBe(
			'filter=spares&q=hotend&inStock=true&sort=price_asc&page=2'
		);
	});

	it('swaps a reversed price range', () => {
		expect(sanitize('minPrice=900&maxPrice=100')).toBe('minPrice=100&maxPrice=900');
	});
});
