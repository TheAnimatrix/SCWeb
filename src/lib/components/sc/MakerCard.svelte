<script lang="ts">
	import { cn } from '$lib/utils';
	import GradientGlowCard from './GradientGlowCard.svelte';
	import MetaChip from './MetaChip.svelte';

	interface Props {
		name: string;
		location: string;
		craftCount: number;
		memberSince: string;
		shopHref: string;
		avatarUrl?: string | null;
		class?: string;
	}

	let {
		name,
		location,
		craftCount,
		memberSince,
		shopHref,
		avatarUrl = null,
		class: className
	}: Props = $props();

	let avatarFailed = $state(false);

	const initial = $derived(name.charAt(0).toUpperCase());
	const showAvatar = $derived(Boolean(avatarUrl && !avatarFailed));
	const showLocation = $derived(Boolean(location && location !== '—'));
	const craftLabel = $derived(`${craftCount} craft${craftCount === 1 ? '' : 's'}`);
</script>

<GradientGlowCard href={shopHref} class={cn(className)}>
	<div
		class="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-scpurple/25 bg-background/80 font-mono text-xs font-semibold uppercase text-foreground shadow-[0_0_0_1px_hsl(var(--background))]"
		aria-hidden="true"
	>
		{#if showAvatar}
			<img
				src={avatarUrl}
				alt=""
				class="size-full object-cover"
				referrerpolicy="no-referrer"
				onerror={() => {
					avatarFailed = true;
				}}
			/>
		{:else}
			{initial}
		{/if}
	</div>

	<div class="min-w-0 flex-1">
		<div class="flex min-w-0 items-baseline gap-1.5">
			<span class="truncate text-sm font-medium text-foreground">{name}</span>
			{#if showLocation}
				<span class="shrink-0 font-mono text-[11px] text-muted-foreground">{location}</span>
			{/if}
		</div>
		<div class="mt-1 flex flex-wrap items-center gap-1.5">
			<MetaChip tone="muted" class="py-0 text-[10px]">{craftLabel}</MetaChip>
			<MetaChip tone="muted" class="py-0 text-[10px]">since {memberSince}</MetaChip>
		</div>
	</div>

	<span
		class="hidden shrink-0 font-mono text-xs text-muted-foreground transition-colors group-hover:text-foreground sm:inline"
	>
		view_shop →
	</span>
</GradientGlowCard>
