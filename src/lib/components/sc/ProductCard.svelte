<script lang="ts">
	import type { Product } from '$lib/types/product';
	import { cn } from '$lib/utils';
	import { getProductTypeLabel } from '$lib/utils/productTypeTag';
	import PlaceholderImage from './PlaceholderImage.svelte';
	import TagBadge from './TagBadge.svelte';

	interface Props {
		product: Product;
		href: string;
		onclick?: (event: MouseEvent) => void;
		class?: string;
	}

	let { product, href, onclick, class: className }: Props = $props();

	const isOutOfStock = $derived(product.stock.count <= 0);

	const typeLabel = $derived(getProductTypeLabel(product.type));

	const makerName = $derived(product.author ?? product.users?.username ?? 'unknown');
	const cityCode = $derived(product.users?.city ?? '');
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
		'group relative flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-foreground/20',
		className
	)}
>
	{#if isOutOfStock}
		<div class="absolute inset-0 z-20 flex items-center justify-center bg-background/70 backdrop-blur-[1px]">
			<span class="rounded-md border border-border bg-muted px-3 py-1 font-mono text-xs uppercase">
				Out of stock
			</span>
		</div>
	{/if}

	<div class="relative aspect-[4/3] overflow-hidden">
		<PlaceholderImage
			src={imageUrl}
			alt={product.name}
			class="transition-transform duration-500 group-hover:scale-105"
		/>
		<div class="absolute left-3 top-3 z-10">
			<TagBadge label={typeLabel} emphasized />
		</div>
	</div>

	<div class="flex flex-col gap-1 p-4">
		<div class="flex items-start justify-between gap-3">
			<h3 class="line-clamp-2 text-sm font-medium leading-snug text-foreground">
				{product.name}
			</h3>
			<div class="flex shrink-0 flex-col items-end gap-0.5">
				{#if formattedOldPrice}
					<span class="font-mono text-xs text-muted-foreground line-through">
						₹{formattedOldPrice}
					</span>
				{/if}
				<span class="font-mono text-base font-semibold text-foreground">₹{formattedPrice}</span>
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
