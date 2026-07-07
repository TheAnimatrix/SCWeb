const TAG_TINTS = [
	'border-border bg-muted/40 text-muted-foreground',
	'border-accent-dark/25 bg-accent-dark/10 text-accent-dark',
	'border-border bg-secondary text-secondary-foreground',
	'border-border bg-background text-foreground'
] as const;

function hashLabel(label: string): number {
	let hash = 0;
	const normalized = label.trim().toLowerCase();
	for (let i = 0; i < normalized.length; i++) {
		hash = (hash * 31 + normalized.charCodeAt(i)) >>> 0;
	}
	return hash;
}

export function tagTintClass(label: string): string {
	return TAG_TINTS[hashLabel(label) % TAG_TINTS.length];
}
