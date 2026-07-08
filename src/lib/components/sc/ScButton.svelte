<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { cn } from '$lib/utils';
	import type { Snippet } from 'svelte';

	type Variant = 'primary' | 'secondary' | 'ghost' | 'discord';

	interface Props {
		variant?: Variant;
		href?: string;
		target?: string;
		rel?: string;
		onclick?: (event: MouseEvent) => void;
		class?: string;
		arrow?: boolean;
		disabled?: boolean;
		children?: Snippet;
	}

	let {
		variant = 'primary',
		href,
		target,
		rel,
		onclick,
		class: className,
		arrow = false,
		disabled = false,
		children
	}: Props = $props();

	const variantClasses: Record<Variant, string> = {
		primary:
			'bg-primary text-primary-foreground hover:bg-primary/90 rounded-md border-transparent shadow-none',
		secondary: 'border border-border bg-card text-foreground hover:bg-muted shadow-none',
		ghost:
			'text-foreground hover:underline bg-transparent hover:bg-transparent shadow-none p-0 h-auto font-normal',
		discord: 'bg-[#5865F2] text-white hover:bg-[#4752C4] rounded-md border-transparent shadow-none'
	};
</script>

<Button
	{href}
	{target}
	{rel}
	{onclick}
	{disabled}
	variant="ghost"
	class={cn(variantClasses[variant], className)}>
	{@render children?.()}
	{#if arrow}
		<span aria-hidden="true"> →</span>
	{/if}
</Button>
