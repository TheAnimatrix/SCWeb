<script lang="ts">
	import type { Product } from '$lib/types/product';
	import { cn } from '$lib/utils';
	import PlaceholderImage from './PlaceholderImage.svelte';
	import MetaChip from './MetaChip.svelte';
	import TagBadge from './TagBadge.svelte';
	import { getProductTypeLabel } from '$lib/utils/productTypeTag';

	interface Props {
		product: Product;
		href: string;
		onclick?: (event: MouseEvent) => void;
		class?: string;
	}

	let { product, href, onclick, class: className }: Props = $props();

	const isOutOfStock = $derived(product.stock.count <= 0);

	const typeLabel = $derived(getProductTypeLabel(product.type));
	const showTypeBadge = $derived(product.type?.toLowerCase() !== 'product');

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
	<div class="relative aspect-[4/3] overflow-hidden">
		<PlaceholderImage
			src={imageUrl}
			alt={product.name}
			class="transition-transform duration-500 group-hover:scale-105"
		/>
		{#if showTypeBadge}
			<div class="absolute left-2 top-2 z-10">
				<TagBadge label={typeLabel} emphasized />
			</div>
		{/if}
		{#if isOutOfStock}
			<div class="absolute bottom-2 right-2 z-10">
				<MetaChip
					class="border-destructive/40 bg-destructive/80 text-[10px] font-medium uppercase tracking-wide text-destructive-foreground backdrop-blur-sm"
				>
					Out of stock
				</MetaChip>
			</div>
		{/if}
	</div>

	<div class="flex flex-col gap-0.5 p-3">
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
