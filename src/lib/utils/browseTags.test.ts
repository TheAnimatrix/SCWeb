import { describe, expect, it, vi } from 'vitest';
import { applyTagFilter, buildTagGroups } from '$lib/utils/browseTags';

describe('applyTagFilter', () => {
	it('uses jsonb string containment for single tag variants', () => {
		const contains = vi.fn().mockReturnThis();
		const query = { contains, or: vi.fn().mockReturnThis() };
		const tagOptions = [
			{
				key: 'made_in_india',
				label: 'made_in_india',
				count: 7,
				variants: ['made_in_india']
			}
		];

		applyTagFilter(query, 'made_in_india', tagOptions);

		expect(contains).toHaveBeenCalledWith('tags', JSON.stringify([{ tag: 'made_in_india' }]));
	});

	it('requires both parent and child tags for composite filters', () => {
		const contains = vi.fn().mockReturnThis();
		const query = { contains, or: vi.fn().mockReturnThis() };
		const tagOptions = [
			{
				key: '3d_printer',
				label: '3d_printer',
				count: 6,
				variants: ['3d_printer']
			},
			{
				key: '3d_printer/probe',
				label: 'probes',
				count: 4,
				variants: ['probes'],
				parentKey: '3d_printer'
			}
		];

		applyTagFilter(query, '3d_printer/probe', tagOptions);

		expect(contains).toHaveBeenNthCalledWith(1, 'tags', JSON.stringify([{ tag: '3d_printer' }]));
		expect(contains).toHaveBeenNthCalledWith(2, 'tags', JSON.stringify([{ tag: 'probes' }]));
	});
});

describe('buildTagGroups', () => {
	it('counts made_in_india across all tagged products', () => {
		const sources = [
			{ tags: [{ tag: 'made_in_india' }], type: 'product' },
			{ tags: [{ tag: 'made_in_india' }], type: 'product' },
			{ tags: [{ tag: '3d_printer' }], type: 'spare' }
		];

		const catalog = buildTagGroups(sources);

		expect(catalog.standalone.find((tag) => tag.key === 'made_in_india')?.count).toBe(2);
	});
});
