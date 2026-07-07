<script lang="ts">
	import { Minus, Plus, Heart, Star } from '@lucide/svelte';
	import HTMLWrapper from '$lib/components/fundamental/HTMLWrapper.svelte';
	import { TagBadge, MetaChip, ScButton, TrustSignals } from '$lib/components/sc';
	import { cn } from '$lib/utils';
	import { buildProductTags } from '$lib/utils/productTypeTag';
	import type { Product } from '$lib/types/product';

	interface VariantOption {
		id: string;
		label: string;
		href: string;
	}

	interface Props {
		product: Product;
		cartQty?: number;
		addToCartSuccess?: boolean | null;
		addToCartMsg?: string;
		variants?: VariantOption[];
		onIncrement?: () => void;
		onDecrement?: () => void;
		onAddToCart?: () => void;
		class?: string;
	}

	let {
		product,
		cartQty = $bindable(0),
		addToCartSuccess = null,
		addToCartMsg = '',
		variants = [],
		onIncrement,
		onDecrement,
		onAddToCart,
		class: className
	}: Props = $props();

	let favorited = $state(false);

	const isOutOfStock = $derived(product.stock.count <= 0);
	const isLowStock = $derived(!isOutOfStock && product.stock.count <= 5);
	const displayTags = $derived(buildProductTags(product.type, product.tags));
	const hasRating = $derived(
		product.rating?.rating != null && product.rating.rating > 0
	);
	const makerName = $derived(product.author ?? product.users?.username);
	const shopHref = $derived(
		makerName ? `/crafts?q=${encodeURIComponent(makerName)}` : null
	);

	const trustItems = $derived(['Ships from verified maker', 'Replacement support on eligible orders']);

	const shortDescription = $derived.by(() => {
		const doc = product.documentation?.at(0)?.data;
		if (!doc || doc.length > 220) {
			return doc ? `${doc.slice(0, 217)}...` : 'Handcrafted hardware from an independent maker on SelfCrafted.';
		}
		return doc;
	});

	function handleVariantChange(event: Event) {
		const target = event.currentTarget as HTMLSelectElement;
		const selected = variants.find((variant) => variant.id === target.value);
		if (selected) {
			window.location.href = selected.href;
		}
	}
</script>

<div class={cn('space-y-5 rounded-lg border border-border bg-card p-5 md:p-6', className)}>
	<div class="space-y-3">
		<h1 class="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
			{product.name}
		</h1>

		{#if makerName}
			<p class="text-sm text-muted-foreground">
				by
				{#if shopHref}
					<a
						href={shopHref}
						class="text-foreground/70 transition-colors hover:text-foreground hover:underline"
					>
						{makerName}
					</a>
				{:else}
					<span class="text-foreground/70">{makerName}</span>
				{/if}
			</p>
		{/if}

		<div class="flex flex-wrap items-center gap-2">
			{#each displayTags as tag (tag.label)}
				<TagBadge label={tag.label} emphasized={tag.emphasized} />
			{/each}
		</div>

		<div class="flex flex-wrap items-center gap-2">
			{#if hasRating}
				<MetaChip>
					<Star class="size-3" aria-hidden="true" />
					{product.rating!.rating}
					<span class="text-muted-foreground">({product.rating!.count ?? 0})</span>
				</MetaChip>
			{/if}

			{#if isOutOfStock}
				<MetaChip tone="destructive">Out of stock</MetaChip>
			{:else if isLowStock}
				<MetaChip>Only {product.stock.count} left</MetaChip>
			{:else}
				<MetaChip tone="muted">{product.stock.count} in stock</MetaChip>
			{/if}

			{#if product.stock.status}
				<MetaChip tone="muted">{product.stock.status}</MetaChip>
			{/if}

			{#if product.guarantee}
				<MetaChip>{product.guarantee}</MetaChip>
			{/if}
		</div>
	</div>

	<div class="prose prose-sm max-w-none text-sm leading-relaxed text-muted-foreground prose-a:text-[#71C8E2] prose-a:no-underline hover:prose-a:underline">
		<HTMLWrapper html={shortDescription} />
	</div>

	{#if variants.length > 1}
		<div class="space-y-2">
			<label for="variant-select" class="text-sm font-medium text-foreground">Variant</label>
			<select
				id="variant-select"
				value={product.id}
				onchange={handleVariantChange}
				class="h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground focus:border-foreground/30 focus:outline-none"
			>
				{#each variants as variant (variant.id)}
					<option value={variant.id}>{variant.label}</option>
				{/each}
			</select>
		</div>
	{/if}

	<div class="space-y-1">
		{#if product.price.old > 0}
			<p class="text-sm text-muted-foreground line-through">
				₹{product.price.old.toLocaleString('en-IN')}
			</p>
		{/if}
		<p class="text-3xl font-semibold tracking-tight text-foreground">
			₹{product.price.new.toLocaleString('en-IN')}
		</p>
	</div>

	<div class="flex flex-wrap items-stretch gap-2">
		<div class="flex items-center rounded-md border border-border bg-card">
			<button
				type="button"
				class="flex h-10 w-10 items-center justify-center text-foreground transition-colors hover:bg-muted disabled:opacity-40"
				disabled={isOutOfStock || cartQty <= 0}
				onclick={onDecrement}
				aria-label="Decrease quantity"
			>
				<Minus class="h-4 w-4" />
			</button>
			<span class="min-w-10 border-x border-border px-3 text-center text-sm">
				{cartQty}
			</span>
			<button
				type="button"
				class="flex h-10 w-10 items-center justify-center text-foreground transition-colors hover:bg-muted disabled:opacity-40"
				disabled={isOutOfStock || cartQty >= product.stock.count}
				onclick={onIncrement}
				aria-label="Increase quantity"
			>
				<Plus class="h-4 w-4" />
			</button>
		</div>

		<ScButton
			class="min-h-10 flex-1 font-mono text-sm disabled:pointer-events-none disabled:opacity-50"
			onclick={isOutOfStock ? undefined : onAddToCart}
			arrow
		>
			{isOutOfStock ? 'out_of_stock' : 'add_to_cart'}
		</ScButton>

		<button
			type="button"
			class={cn(
				'flex h-10 w-10 items-center justify-center rounded-md border border-border bg-card transition-colors hover:bg-muted',
				favorited && 'border-foreground text-foreground'
			)}
			aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
			aria-pressed={favorited}
			onclick={() => (favorited = !favorited)}
		>
			<Heart class={cn('h-4 w-4', favorited && 'fill-current')} />
		</button>
	</div>

	<div
		class="overflow-hidden transition-all duration-300"
		style:height={addToCartSuccess === null ? '0' : 'auto'}
	>
		{#if addToCartSuccess === true}
			<div class="rounded-md border border-border bg-muted/40 px-3 py-2 font-mono text-xs text-foreground">
				"{product.name}" x {addToCartMsg} — added to cart
			</div>
		{:else if addToCartSuccess === false}
			<div class="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 font-mono text-xs text-destructive">
				Error — {addToCartMsg}
			</div>
		{/if}
	</div>

	<TrustSignals items={trustItems} />
</div>
