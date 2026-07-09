export type CrafterTier = 'Bee' | 'Peacock' | 'Rhino' | 'Tiger' | 'Osprey';

export const TIER_ICONS: Record<CrafterTier, string> = {
	Bee: 'fluent-emoji-high-contrast:honeybee',
	Peacock: 'fluent-emoji-high-contrast:peacock',
	Rhino: 'fluent-emoji-high-contrast:rhinoceros',
	Tiger: 'fluent-emoji-high-contrast:tiger-face',
	Osprey: 'fluent-emoji-high-contrast:eagle'
};

export type TierStyle = {
	badge: string;
	iconFilter: string | null;
	card: string;
	cardExpanded: string;
	buttonHover: string;
};

export const TIER_STYLES: Record<CrafterTier, TierStyle> = {
	Bee: {
		badge: 'border-amber-400/70 bg-amber-50 dark:border-amber-500/50 dark:bg-amber-950/40',
		iconFilter:
			'grayscale(1) sepia(1) saturate(6) hue-rotate(5deg) brightness(1.05) contrast(1.05)',
		card: 'border-amber-400/35',
		cardExpanded: 'border-amber-400/60 shadow-amber-500/10',
		buttonHover: 'hover:bg-amber-500/8'
	},
	Peacock: {
		badge: 'border-teal-400/70 bg-teal-50 dark:border-teal-500/50 dark:bg-teal-950/40',
		iconFilter:
			'grayscale(1) sepia(1) saturate(5) hue-rotate(128deg) brightness(0.95) contrast(1.05)',
		card: 'border-teal-400/35',
		cardExpanded: 'border-teal-400/60 shadow-teal-500/10',
		buttonHover: 'hover:bg-teal-500/8'
	},
	Rhino: {
		badge: 'border-stone-400/70 bg-stone-100 dark:border-stone-500/50 dark:bg-stone-900/50',
		iconFilter:
			'grayscale(1) sepia(0.15) saturate(0.4) hue-rotate(180deg) brightness(0.85) contrast(0.95)',
		card: 'border-stone-400/35',
		cardExpanded: 'border-stone-400/60 shadow-stone-500/10',
		buttonHover: 'hover:bg-stone-500/8'
	},
	Tiger: {
		badge: 'border-orange-400/70 bg-orange-50 dark:border-orange-500/50 dark:bg-orange-950/40',
		iconFilter:
			'grayscale(1) sepia(1) saturate(6) hue-rotate(350deg) brightness(1.08) contrast(1.05)',
		card: 'border-orange-400/35',
		cardExpanded: 'border-orange-400/60 shadow-orange-500/10',
		buttonHover: 'hover:bg-orange-500/8'
	},
	Osprey: {
		badge: 'border-violet-400/70 bg-violet-50 dark:border-violet-500/50 dark:bg-violet-950/40',
		iconFilter:
			'grayscale(1) sepia(1) saturate(5) hue-rotate(258deg) brightness(0.98) contrast(1.05)',
		card: 'border-violet-400/35',
		cardExpanded: 'border-violet-400/60 shadow-violet-500/10',
		buttonHover: 'hover:bg-violet-500/8'
	}
};

const DEFAULT_TIER_STYLE: TierStyle = {
	badge: 'border-border bg-background',
	iconFilter: null,
	card: 'border-border',
	cardExpanded: 'border-foreground/25',
	buttonHover: 'hover:bg-muted/30'
};

export function getTierIcon(tier: string | null | undefined): string | null {
	if (!tier) return null;
	return TIER_ICONS[tier as CrafterTier] ?? null;
}

export function getTierStyle(tier: string | null | undefined): TierStyle {
	if (!tier || !isCrafterTier(tier)) return DEFAULT_TIER_STYLE;
	return TIER_STYLES[tier];
}

export const TIER_TEXT: Record<CrafterTier, string> = {
	Bee: 'text-amber-600 dark:text-amber-400',
	Peacock: 'text-teal-600 dark:text-teal-400',
	Rhino: 'text-stone-600 dark:text-stone-300',
	Tiger: 'text-orange-600 dark:text-orange-400',
	Osprey: 'text-violet-700 dark:text-violet-300'
};

export function getTierTextClass(tier: string | null | undefined): string {
	if (!tier || !isCrafterTier(tier)) return 'text-muted-foreground';
	return TIER_TEXT[tier];
}

export function isCrafterTier(tier: string): tier is CrafterTier {
	return tier in TIER_ICONS;
}
