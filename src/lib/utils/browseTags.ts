import type { TagOption } from '$lib/types/browse';
import { isTypeDuplicateTag, normalizeTag } from '$lib/utils/productTypeTag';

type ProductTagSource = {
	tags: { tag: string }[] | null | undefined;
	type?: string | null;
};

interface TagAccumulator {
	productCount: number;
	variants: Map<string, number>;
}

export function normalizeTagKey(value: string): string {
	let key = normalizeTag(value);

	if (key.length > 4 && key.endsWith('s') && !key.endsWith('ss')) {
		key = key.slice(0, -1);
	}

	return key;
}

export function parseProductTags(tags: unknown): { tag: string }[] {
	if (!Array.isArray(tags)) return [];

	return tags
		.filter(
			(item): item is { tag: string } =>
				typeof item === 'object' && item !== null && typeof item.tag === 'string'
		)
		.map((item) => ({ tag: item.tag.trim() }))
		.filter((item) => item.tag.length > 0);
}

export const MIN_BROWSE_TAG_COUNT = 2;

export function formatTagChipLabel(raw: string): string {
	return raw
		.trim()
		.normalize('NFKD')
		.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
		.toLowerCase()
		.replace(/[\s-]+/g, '_')
		.replace(/[^a-z0-9_&/]+/g, '')
		.replace(/_+/g, '_')
		.replace(/^_|_$/g, '');
}

function pickDisplayLabel(variants: Map<string, number>): string {
	let best = '';
	let bestCount = -1;

	for (const [raw, count] of variants) {
		if (count > bestCount) {
			best = raw;
			bestCount = count;
		}
	}

	return formatTagChipLabel(best);
}

export function aggregateTagOptions(sources: ProductTagSource[]): TagOption[] {
	const buckets = new Map<string, TagAccumulator>();

	for (const source of sources) {
		const parsed = parseProductTags(source.tags).filter(
			(entry) => !isTypeDuplicateTag(entry.tag, source.type)
		);
		const keysForProduct = new Set<string>();

		for (const { tag } of parsed) {
			const key = normalizeTagKey(tag);
			if (!key) continue;

			keysForProduct.add(key);

			const acc = buckets.get(key) ?? { productCount: 0, variants: new Map() };
			acc.variants.set(tag, (acc.variants.get(tag) ?? 0) + 1);
			buckets.set(key, acc);
		}

		for (const key of keysForProduct) {
			buckets.get(key)!.productCount += 1;
		}
	}

	return Array.from(buckets.entries())
		.map(([key, acc]) => ({
			key,
			label: pickDisplayLabel(acc.variants),
			count: acc.productCount,
			variants: Array.from(acc.variants.keys())
		}))
		.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export function filterBrowsableTagOptions(options: TagOption[]): TagOption[] {
	return options.filter((option) => option.count >= MIN_BROWSE_TAG_COUNT);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyTagFilter(query: any, tagKey: string | null, tagOptions: TagOption[]) {
	if (!tagKey) return query;

	const option = tagOptions.find((entry) => entry.key === tagKey);
	if (!option || option.variants.length === 0) return query;

	if (option.variants.length === 1) {
		return query.contains('tags', [{ tag: option.variants[0] }]);
	}

	return query.or(
		option.variants.map((variant) => `tags.cs.${JSON.stringify([{ tag: variant }])}`).join(',')
	);
}
