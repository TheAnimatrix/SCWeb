import { formatTagDisplayLabel } from '$lib/utils/formatUsername';

export interface DisplayTag {
	label: string;
	emphasized: boolean;
}

export function getProductTypeLabel(type?: string | null): string {
	switch (type?.toLowerCase()) {
		case 'product':
			return 'Product';
		case 'spare':
			return 'Spare';
		case 'flea-market':
		case 'flea':
			return 'Flea market';
		default:
			return type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Product';
	}
}

function normalizeTag(value: string): string {
	return value
		.trim()
		.toLowerCase()
		.replace(/[\s_-]+/g, '');
}

export { normalizeTag };

export function isTypeDuplicateTag(tagLabel: string, type?: string | null): boolean {
	if (!type) return false;

	const tagNorm = normalizeTag(tagLabel);
	const typeCandidates = [type, getProductTypeLabel(type)].map(normalizeTag);

	return typeCandidates.some(
		(candidate) =>
			candidate === tagNorm || tagNorm.includes(candidate) || candidate.includes(tagNorm)
	);
}

export function buildProductTags(
	type: string | null | undefined,
	tags: { tag: string }[] | undefined
): DisplayTag[] {
	const typeTag: DisplayTag = { label: getProductTypeLabel(type), emphasized: true };
	const rest = (tags ?? [])
		.filter((tag) => !isTypeDuplicateTag(tag.tag, type))
		.map((tag) => ({ label: tag.tag, emphasized: false }));

	return [typeTag, ...rest];
}

/**
 * Display text for a product tag. Same as `formatTagDisplayLabel`, except the
 * made-in-India tag reads "Made in India": the flag emoji renders as "IN" on Windows.
 */
export function tagDisplayLabel(tag: string): string {
	const key = tag
		.trim()
		.toLowerCase()
		.replace(/[\s-]+/g, '_');
	if (key === 'made_in_india') return 'Made in India';
	return formatTagDisplayLabel(tag);
}
