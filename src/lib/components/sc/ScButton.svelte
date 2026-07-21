<script lang="ts">
	import { Button, type ButtonVariant } from '$lib/components/ui/button';
	import { cn } from '$lib/utils';
	import type { Snippet } from 'svelte';

	type Variant = 'primary' | 'secondary' | 'ghost' | 'discord';

	const uiVariantMap: Record<Variant, ButtonVariant> = {
		primary: 'default',
		secondary: 'outline',
		ghost: 'ghost',
		discord: 'default'
	};

	interface Props {
		variant?: Variant;
		href?: string;
		target?: string;
		rel?: string;
		type?: 'button' | 'submit' | 'reset';
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
		type = 'button',
		onclick,
		class: className,
		arrow = false,
		disabled = false,
		children
	}: Props = $props();

	const variantClasses: Record<Variant, string> = {
		primary: 'rounded-md border-transparent shadow-none',
		secondary:
			'border-border bg-card text-foreground hover:bg-muted hover:text-foreground shadow-none',
		ghost:
			'text-foreground hover:text-foreground hover:underline bg-transparent hover:bg-transparent shadow-none p-0 h-auto font-normal',
		discord:
			'bg-[#5865F2] text-white hover:bg-[#4752C4] hover:text-white rounded-md border-transparent shadow-none'
	};
</script>

<Button
	{href}
	{target}
	{rel}
	{type}
	{onclick}
	{disabled}
	variant={uiVariantMap[variant]}
	class={cn(variantClasses[variant], className)}>
	{@render children?.()}
	{#if arrow}
		<span aria-hidden="true"> →</span>
	{/if}
</Button>
