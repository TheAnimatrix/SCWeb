<script lang="ts">
	import { cn } from '$lib/utils';
	import type { Snippet } from 'svelte';

	interface Props {
		selected?: boolean;
		onclick?: () => void;
		class?: string;
		children?: Snippet;
	}

	let { selected = false, onclick, class: className, children }: Props = $props();
</script>

<button
	type="button"
	class={cn(
		'animate_base rounded-md border px-2 py-2 text-center text-xs font-medium transition-colors',
		selected
			? 'border-black bg-black text-white'
			: 'border-border bg-card text-foreground hover:border-foreground/30 hover:bg-muted/30',
		className
	)}
	{onclick}>
	{@render children?.()}
</button>
