<script lang="ts">
	import type { Product } from '$lib/types/product';
	import { productUserRef } from '$lib/types/product';
	import { cn } from '$lib/utils';
	import { isOnDemand, isOutOfStock } from '$lib/utils/stock';
	import PlaceholderImage from './PlaceholderImage.svelte';
	import MetaChip from './MetaChip.svelte';

	interface Props {
		product: Product;
		href: string;
		onclick?: (event: MouseEvent) => void;
		dimOutOfStock?: boolean;
		class?: string;
	}

	let { product, href, onclick, dimOutOfStock = false, class: className }: Props = $props();

	const unavailable = $derived(isOutOfStock(product.stock));
	const onDemand = $derived(isOnDemand(product.stock));

	const productUser = $derived(productUserRef(product.users));
	const makerName = $derived(product.author ?? productUser?.username ?? 'unknown');
	const cityCode = $derived(productUser?.city ?? '');
	const rating = $derived(product.rating?.rating);
	const formattedPrice = $derived(product.price.new.toLocaleString('en-IN'));
	const formattedOldPrice = $derived(
		product.price.old > 0 ? product.price.old.toLocaleString('en-IN') : null
	);
	const imageUrl = $derived(product.images?.at(0)?.url ?? null);
</script>

<a
	{href}
	{onclick}
	class={cn(
		'group relative flex h-full w-full max-h-[20rem] flex-col overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-foreground/20',
		dimOutOfStock && unavailable && 'opacity-60 saturate-50',
		className
	)}>
	<div class="relative aspect-[4/3] min-h-0 w-full shrink overflow-hidden">
		<PlaceholderImage
			src={imageUrl}
			alt={product.name}
			class="transition-transform duration-500 group-hover:scale-105" />
		{#if onDemand}
			<div class="absolute bottom-2 right-2 z-10">
				<MetaChip
					class="border-amber-500/40 bg-amber-500/80 text-[10px] font-medium uppercase tracking-wide text-amber-950 backdrop-blur-sm">
					On demand
				</MetaChip>
			</div>
		{:else if unavailable}
			<div class="absolute bottom-2 right-2 z-10">
				<MetaChip
					class="border-destructive/40 bg-destructive/80 text-[10px] font-medium uppercase tracking-wide text-destructive-foreground backdrop-blur-sm">
					Out of stock
				</MetaChip>
			</div>
		{/if}
	</div>

	<div class="flex shrink-0 flex-col gap-0.5 p-3">
		<div class="flex items-start justify-between gap-2">
			<div class="min-w-0">
				<h3 class="line-clamp-2 text-xs font-medium leading-snug text-foreground">
					{product.name}
				</h3>
			</div>
			<div class="flex shrink-0 flex-col items-end gap-0.5">
				{#if formattedOldPrice}
					<span class="font-mono text-[10px] text-muted-foreground line-through">
						₹{formattedOldPrice}
					</span>
				{/if}
				<span class="font-mono text-sm font-semibold text-foreground">₹{formattedPrice}</span>
			</div>
		</div>

		<p class="font-mono text-xs text-muted-foreground">
			@{makerName}
			{#if cityCode}
				<span aria-hidden="true"> · </span>{cityCode}
			{/if}
			{#if rating != null}
				<span aria-hidden="true"> · </span>★{rating}
			{/if}
		</p>
	</div>
</a>
