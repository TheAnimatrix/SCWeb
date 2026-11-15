<script lang="ts">
	import { cn } from '$lib/utils';
	import GradientGlowCard from './GradientGlowCard.svelte';
	import MetaChip from './MetaChip.svelte';

	interface Props {
		name: string;
		location?: string | null;
		craftCount: number;
		/** Already formatted, e.g. "Mar 2025". Hidden when not known. */
		sellingSince?: string | null;
		shopHref: string;
		/** "View shop" for a live storefront; something like "See listings" for a search link. */
		shopLabel?: string;
		avatarUrl?: string | null;
		class?: string;
	}

	let {
		name,
		location = null,
		craftCount,
		sellingSince = null,
		shopHref,
		shopLabel = 'View shop',
		avatarUrl = null,
		class: className
	}: Props = $props();

	let avatarFailed = $state(false);

	const initial = $derived(name.charAt(0).toUpperCase());
	const showAvatar = $derived(Boolean(avatarUrl && !avatarFailed));
	const craftLabel = $derived(`${craftCount} listing${craftCount === 1 ? '' : 's'}`);
</script>

<GradientGlowCard href={shopHref} class={cn(className)}>
	<div
		class="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-scpurple/25 bg-background/80 text-xs font-semibold uppercase text-foreground shadow-[0_0_0_1px_hsl(var(--background))]"
		aria-hidden="true">
		{#if showAvatar}
			<img
				src={avatarUrl}
				alt=""
				class="size-full object-cover"
				referrerpolicy="no-referrer"
				onerror={() => {
					avatarFailed = true;
				}} />
		{:else}
			{initial}
		{/if}
	</div>

	<div class="min-w-0 flex-1">
		<div class="flex min-w-0 flex-wrap items-baseline gap-x-1.5">
			<span class="truncate text-sm font-medium text-foreground">{name}</span>
			{#if location}
				<span class="shrink-0 text-xs text-muted-foreground">{location}</span>
			{/if}
		</div>
		<div class="mt-1 flex flex-wrap items-center gap-1.5">
			<MetaChip tone="muted" class="py-0 text-xs">{craftLabel}</MetaChip>
			{#if sellingSince}
				<MetaChip tone="muted" class="py-0 text-xs">Selling since {sellingSince}</MetaChip>
			{/if}
		</div>
	</div>

	<span
		class="shrink-0 text-sm text-muted-foreground transition-colors group-hover:text-foreground">
		{shopLabel} <span aria-hidden="true">→</span>
	</span>
</GradientGlowCard>
