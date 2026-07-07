<script lang="ts">
	import Icon from '@iconify/svelte';
	import { getTierIcon } from '$lib/types/tiers';
	import { cn } from '$lib/utils';

	interface Props {
		tier: string;
		showLabel?: boolean;
		iconOnly?: boolean;
		class?: string;
	}

	let { tier, showLabel = true, iconOnly = false, class: className }: Props = $props();

	const icon = $derived(getTierIcon(tier));
	const displayLabel = $derived(showLabel && !iconOnly);
</script>

<span
	class={cn(
		'inline-flex shrink-0 items-center justify-center border border-border bg-background font-mono text-foreground',
		iconOnly
			? 'rounded-full'
			: 'gap-1.5 rounded-md px-2 py-0.5 text-xs',
		className
	)}
	title={tier}
>
	{#if icon}
		<Icon
			icon={icon}
			class={cn('shrink-0', iconOnly ? 'size-5' : 'size-3.5')}
			aria-hidden="true"
		/>
	{/if}
	{#if displayLabel}
		<span>{tier}</span>
	{/if}
</span>
