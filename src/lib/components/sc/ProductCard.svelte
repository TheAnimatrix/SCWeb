<script lang="ts">
	import Icon from '@iconify/svelte';
	import { F } from '$lib/icons/fluent';
	import type { Product } from '$lib/types/product';
	import { productUserRef } from '$lib/types/product';
	import { getTierIcon, getTierStyle, getTierTextClass } from '$lib/types/tiers';
	import { cn } from '$lib/utils';
	import { isBrowseHierarchyTag } from '$lib/utils/browseTags';
	import { formatUsernameDisplay } from '$lib/utils/formatUsername';
	import { formatInr } from '$lib/utils/format';
	import { buildProductTags, tagDisplayLabel } from '$lib/utils/productTypeTag';
	import { isOnDemand, isOpenInterest, isOutOfStock } from '$lib/utils/stock';
	import PlaceholderImage from './PlaceholderImage.svelte';
	import MetaChip from './MetaChip.svelte';
	import TagBadge from './TagBadge.svelte';

	interface Props {
		product: Product;
		href: string;
		onclick?: (event: MouseEvent) => void;
		dimOutOfStock?: boolean;
		/** Single-line title with ellipsis — used on the homepage grid. */
		singleLineTitle?: boolean;
		class?: string;
	}

	let {
		product,
		href,
		onclick,
		dimOutOfStock = false,
		singleLineTitle = false,
		class: className
	}: Props = $props();

	// An open interest check has no stock yet; it is not "out of stock".
	const interestCheck = $derived(isOpenInterest(product) ? product.interest! : null);
	const unavailable = $derived(!interestCheck && isOutOfStock(product.stock));
	const onDemand = $derived(!interestCheck && isOnDemand(product.stock));

	const productUser = $derived(productUserRef(product.users));
	const makerName = $derived(product.author ?? productUser?.username ?? 'unknown');
	const makerDisplayName = $derived(formatUsernameDisplay(makerName));
	const makerTier = $derived(productUser?.tier ?? 'Bee');
	const tierIcon = $derived(getTierIcon(makerTier));
	const tierStyle = $derived(getTierStyle(makerTier));
	const tierTextClass = $derived(getTierTextClass(makerTier));
	const ratingValue = $derived(product.rating?.rating);
	const ratingCount = $derived(product.rating?.count ?? 0);
	const showRating = $derived(ratingValue != null && ratingValue > 0 && ratingCount > 0);
	const formattedPrice = $derived(formatInr(product.price.new));
	const formattedOldPrice = $derived(
		product.price.old > product.price.new ? formatInr(product.price.old) : null
	);
	const showStock = $derived(product.stock.count > 0);
	const imageUrl = $derived(product.images?.at(0)?.url ?? null);
	const displayTags = $derived(
		buildProductTags(product.type, product.tags)
			.filter((tag) => !tag.emphasized && !isBrowseHierarchyTag(tag.label))
			.slice(0, 4)
	);
</script>

<a
	{href}
	{onclick}
	class={cn(
		'group relative flex h-full w-full flex-col overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-foreground/20',
		dimOutOfStock && unavailable && 'opacity-60 saturate-50',
		className
	)}>
	<div class="relative aspect-[4/3] w-full shrink-0 overflow-hidden">
		<PlaceholderImage
			src={imageUrl}
			alt={product.name}
			class="transition-transform duration-500 group-hover:scale-105" />
		{#if interestCheck}
			<div class="absolute bottom-2 right-2 z-10">
				<MetaChip
					class="border-border bg-background/80 text-xs font-medium text-foreground backdrop-blur-sm">
					Interest check
				</MetaChip>
			</div>
		{:else if onDemand}
			<div class="absolute bottom-2 right-2 z-10">
				<MetaChip
					class="border-amber-500/40 bg-amber-500/80 text-xs font-medium text-amber-950 backdrop-blur-sm">
					On demand
				</MetaChip>
			</div>
		{:else if unavailable}
			<div class="absolute bottom-2 right-2 z-10">
				<MetaChip
					class="border-destructive/40 bg-destructive/80 text-xs font-medium text-destructive-foreground backdrop-blur-sm">
					Out of stock
				</MetaChip>
			</div>
		{/if}
	</div>

	<div class="flex flex-1 flex-col gap-1.5 p-3">
		<div class="flex items-center gap-2">
			<h3
				class={cn(
					'min-w-0 flex-1 font-medium text-foreground',
					singleLineTitle ? 'truncate text-sm leading-tight' : 'line-clamp-2 text-base leading-snug'
				)}>
				{product.name}
			</h3>
			{#if showRating}
				<span
					class="inline-flex shrink-0 items-center gap-0.5 text-xs tabular-nums leading-none text-muted-foreground"
					aria-label="{ratingValue} out of 5 stars, {ratingCount} review{ratingCount === 1
						? ''
						: 's'}">
					<Icon
						icon={F.star}
						class="size-3 shrink-0 fill-amber-400 text-amber-400"
						aria-hidden="true" />
					{ratingValue}
				</span>
			{/if}
		</div>

		<div class="flex min-w-0 items-center gap-1.5">
			{#if tierIcon}
				<span
					class="inline-flex size-3.5 shrink-0"
					style:filter={tierStyle.iconFilter ?? undefined}
					aria-hidden="true">
					<Icon icon={tierIcon} class="size-full" />
				</span>
			{/if}
			<span class={cn('truncate text-xs font-medium', tierTextClass)}>{makerDisplayName}</span>
		</div>

		{#if displayTags.length > 0}
			<div class="mt-1 flex flex-wrap gap-1">
				{#each displayTags as tag (tag.label)}
					<TagBadge
						label={tagDisplayLabel(tag.label)}
						subtle
						class="max-w-full px-1.5 py-px text-xs leading-tight" />
				{/each}
			</div>
		{/if}

		<div class="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-1">
			{#if interestCheck}
				<p class="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
					<Icon icon={F.people} class="size-3.5 shrink-0" aria-hidden="true" />
					{interestCheck.interestedCount} of {interestCheck.targetCount} interested
				</p>
			{:else if showStock}
				<p class="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
					<Icon icon={F.box} class="size-3.5 shrink-0" aria-hidden="true" />
					{product.stock.count} in stock
				</p>
			{/if}
			<div class="ml-auto flex shrink-0 items-baseline gap-2">
				{#if formattedOldPrice}
					<span class="text-sm tabular-nums text-muted-foreground line-through">
						<span class="sr-only">Was </span>{formattedOldPrice}
					</span>
				{/if}
				<span class="text-base font-semibold tabular-nums tracking-tight text-foreground"
					>{formattedPrice}</span>
			</div>
		</div>
	</div>
</a>
