import type { TagGroup, TagOption } from '$lib/types/browse';
import { isTypeDuplicateTag } from '$lib/utils/productTypeTag';

type ProductTagSource = {
	tags: { tag: string }[] | null | undefined;
	type?: string | null;
};

interface TagAccumulator {
	productCount: number;
	variants: Map<string, number>;
}

/** Parent browse categories mapped to their subcategories. */
export const BROWSE_TAG_TREE: Record<string, string[]> = {
	'3d_printer': ['probes', 'toolhead', 'hotend']
};

/** Tags that appear as top-level chips outside the hierarchy. */
export const STANDALONE_BROWSE_TAGS = ['made_in_india', 'lora'] as const;

export const MIN_BROWSE_TAG_COUNT = 2;

export function normalizeTagKey(value: string): string {
	let key = value
		.trim()
		.normalize('NFKD')
		.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
		.replace(/[\s-]+/g, '_')
		.replace(/_+/g, '_')
		.toLowerCase();

	if (key.length > 4 && key.endsWith('s') && !key.endsWith('ss')) {
		key = key.slice(0, -1);
	}

	return key;
}

export function compositeTagKey(parentKey: string, childKey: string): string {
	return `${parentKey}/${childKey}`;
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

function countProductsWithTags(
	sources: ProductTagSource[],
	requiredKeys: string[]
): { count: number; variants: Map<string, Map<string, number>> } {
	const variantMaps = requiredKeys.map(() => new Map<string, number>());
	let count = 0;

	for (const source of sources) {
		const parsed = parseProductTags(source.tags).filter(
			(entry) => !isTypeDuplicateTag(entry.tag, source.type)
		);
		const keysOnProduct = new Set(parsed.map((entry) => normalizeTagKey(entry.tag)));

		if (!requiredKeys.every((key) => keysOnProduct.has(key))) continue;

		count += 1;

		for (const { tag } of parsed) {
			const key = normalizeTagKey(tag);
			const index = requiredKeys.indexOf(key);
			if (index === -1) continue;

			const map = variantMaps[index]!;
			map.set(tag, (map.get(tag) ?? 0) + 1);
		}
	}

	return { count, variants: variantMaps };
}

function buildTagOption(
	key: string,
	count: number,
	variants: Map<string, number>,
	parentKey?: string | null
): TagOption {
	return {
		key,
		label: pickDisplayLabel(variants),
		count,
		variants: Array.from(variants.keys()),
		parentKey
	};
}

export function buildTagGroups(sources: ProductTagSource[]): {
	groups: TagGroup[];
	standalone: TagOption[];
	allOptions: TagOption[];
} {
	const allOptions: TagOption[] = [];
	const groups: TagGroup[] = [];
	const treeChildKeys = new Set(
		Object.values(BROWSE_TAG_TREE).flatMap((children) => children.map(normalizeTagKey))
	);
	const treeParentKeys = new Set(Object.keys(BROWSE_TAG_TREE).map(normalizeTagKey));

	for (const [parentRaw, childRaws] of Object.entries(BROWSE_TAG_TREE)) {
		const parentKey = normalizeTagKey(parentRaw);
		const parentStats = countProductsWithTags(sources, [parentKey]);
		const children: TagOption[] = [];

		for (const childRaw of childRaws) {
			const childKey = normalizeTagKey(childRaw);
			const childStats = countProductsWithTags(sources, [parentKey, childKey]);

			if (childStats.count === 0) continue;

			const option = buildTagOption(
				compositeTagKey(parentKey, childKey),
				childStats.count,
				childStats.variants[1]!,
				parentKey
			);
			children.push(option);
			allOptions.push(option);
		}

		if (parentStats.count === 0 && children.length === 0) continue;

		const group: TagGroup = {
			key: parentKey,
			label: pickDisplayLabel(parentStats.variants[0]!),
			count: parentStats.count,
			variants: Array.from(parentStats.variants[0]!.keys()),
			children: children.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
		};

		groups.push(group);
		allOptions.push(buildTagOption(parentKey, parentStats.count, parentStats.variants[0]!));
	}

	const standalone: TagOption[] = [];

	for (const tagRaw of STANDALONE_BROWSE_TAGS) {
		const key = normalizeTagKey(tagRaw);
		if (treeParentKeys.has(key) || treeChildKeys.has(key)) continue;

		const stats = countProductsWithTags(sources, [key]);
		if (stats.count === 0) continue;

		const option = buildTagOption(key, stats.count, stats.variants[0]!);
		standalone.push(option);
		allOptions.push(option);
	}

	return {
		groups: groups.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)),
		standalone: standalone.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)),
		allOptions
	};
}

export function filterBrowsableTagGroups(groups: TagGroup[]): TagGroup[] {
	return groups
		.map((group) => ({
			...group,
			children: group.children.filter((child) => child.count >= 1)
		}))
		.filter((group) => group.count >= MIN_BROWSE_TAG_COUNT || group.children.length > 0);
}

export function filterBrowsableStandaloneTags(options: TagOption[]): TagOption[] {
	return options.filter((option) => option.count >= MIN_BROWSE_TAG_COUNT);
}

function tagContainsFilter(variant: string): string {
	return JSON.stringify([{ tag: variant }]);
}

function applyContainsVariants(query: ProductQuery, variants: string[]): ProductQuery {
	if (variants.length === 0) return query;

	if (variants.length === 1) {
		// Pass a JSON string — arrays are treated as Postgres arrays, not jsonb objects.
		return query.contains('tags', tagContainsFilter(variants[0]!));
	}

	return query.or(variants.map((variant) => `tags.cs.${tagContainsFilter(variant)}`).join(','));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ProductQuery = any;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyTagFilter(query: any, tagKey: string | null, tagOptions: TagOption[]) {
	if (!tagKey) return query;

	if (tagKey.includes('/')) {
		const [parentKey, childKey] = tagKey.split('/');
		const parent = tagOptions.find((entry) => entry.key === parentKey && !entry.parentKey);
		const child = tagOptions.find(
			(entry) =>
				entry.key === tagKey ||
				(entry.parentKey === parentKey && entry.key.endsWith(`/${childKey}`))
		);

		if (!parent || !child) return query;

		let next = applyContainsVariants(query, parent.variants);
		next = applyContainsVariants(next, child.variants);
		return next;
	}

	const option = tagOptions.find((entry) => entry.key === tagKey);
	if (!option || option.variants.length === 0) return query;

	return applyContainsVariants(query, option.variants);
}

export function findTagOption(tagKey: string, tagOptions: TagOption[]): TagOption | undefined {
	return tagOptions.find((entry) => entry.key === tagKey);
}

export function formatActiveTagLabel(tagKey: string, tagOptions: TagOption[]): string {
	if (tagKey.includes('/')) {
		const [parentKey, childKey] = tagKey.split('/');
		const parent = findTagOption(parentKey, tagOptions);
		const child = findTagOption(tagKey, tagOptions);
		const parentLabel = parent?.label ?? parentKey;
		const childLabel = child?.label ?? childKey;
		return `${parentLabel} > ${childLabel}`;
	}

	return findTagOption(tagKey, tagOptions)?.label ?? tagKey;
}
