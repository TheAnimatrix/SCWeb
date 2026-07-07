<script lang="ts">
	import Icon from '@iconify/svelte';
	import { getTierIcon, getTierStyle } from '$lib/types/tiers';
	import { cn } from '$lib/utils';

	interface Props {
		tier: string;
		showLabel?: boolean;
		iconOnly?: boolean;
		class?: string;
	}

	let { tier, showLabel = true, iconOnly = false, class: className }: Props = $props();

	const icon = $derived(getTierIcon(tier));
	const tierStyle = $derived(getTierStyle(tier));
	const displayLabel = $derived(showLabel && !iconOnly);
</script>

<span
	class={cn(
		'inline-flex shrink-0 items-center justify-center border font-mono text-foreground',
		tierStyle.badge,
		iconOnly
			? 'rounded-full'
			: 'gap-1.5 rounded-md px-2 py-0.5 text-xs',
		className
	)}
	title={tier}
>
	{#if icon}
		<span
			class={cn('inline-flex shrink-0', iconOnly ? 'size-5' : 'size-3.5')}
			style:filter={tierStyle.iconFilter ?? undefined}
		>
			<Icon icon={icon} class="size-full" aria-hidden="true" />
		</span>
	{/if}
	{#if displayLabel}
		<span>{tier}</span>
	{/if}
</span>
