<script lang="ts">
	import { cn } from '$lib/utils';
	import type { Snippet } from 'svelte';

	type Tone = 'default' | 'muted' | 'destructive';

	interface Props {
		tone?: Tone;
		class?: string;
		children?: Snippet;
	}

	let { tone = 'default', class: className, children }: Props = $props();

	const toneClasses: Record<Tone, string> = {
		default: 'border-border bg-background text-foreground',
		muted: 'border-border bg-muted/40 text-muted-foreground',
		destructive: 'border-destructive/30 bg-destructive/5 text-destructive'
	};
</script>

<span
	class={cn(
		'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-xs',
		toneClasses[tone],
		className
	)}
>
	{@render children?.()}
</span>
