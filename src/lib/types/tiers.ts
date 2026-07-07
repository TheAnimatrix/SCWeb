export type CrafterTier = 'Bee' | 'Peacock' | 'Rhino' | 'Tiger' | 'Osprey';

export const TIER_ICONS: Record<CrafterTier, string> = {
	Bee: 'fluent-emoji-high-contrast:honeybee',
	Peacock: 'fluent-emoji-high-contrast:peacock',
	Rhino: 'fluent-emoji-high-contrast:rhinoceros',
	Tiger: 'fluent-emoji-high-contrast:tiger-face',
	Osprey: 'fluent-emoji-high-contrast:eagle'
};

export function getTierIcon(tier: string | null | undefined): string | null {
	if (!tier) return null;
	return TIER_ICONS[tier as CrafterTier] ?? null;
}

export function isCrafterTier(tier: string): tier is CrafterTier {
	return tier in TIER_ICONS;
}
