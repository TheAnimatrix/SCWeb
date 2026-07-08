<script lang="ts">
	import { browser } from '$app/environment';
	import { ProductCard, ProductCardSkeleton } from '$lib/components/sc';
	import { getRelatedProducts } from '$lib/client/catalogApi';
	import type { Product } from '$lib/types/product';
	import { relatedProductItemClass, relatedProductsLayoutClass } from '$lib/utils/relatedProducts';

	interface Props {
		product: Product;
		class?: string;
	}

	let { product, class: className }: Props = $props();

	// Client-only: avoid blocking SSR on a second catalog round-trip.
	const relatedProductsPromise = $derived(
		browser
			? getRelatedProducts(fetch, product.id).then((result) =>
					result.ok ? result.data.products : []
				)
			: null
	);

	function productHref(item: Product): string {
		return `/${item.name.replaceAll(' ', '_')}/craft/item=${item.id}`;
	}
</script>

<section class={className}>
	<div class="mb-4 flex items-center justify-between gap-3">
		<h2 class="font-mono text-sm text-foreground">Pairs well with</h2>
	</div>

	{#if !relatedProductsPromise}
		<div class={relatedProductsLayoutClass()} aria-hidden="true">
			{#each [...Array(4).keys()] as index (index)}
				<ProductCardSkeleton class={relatedProductItemClass()} />
			{/each}
		</div>
	{:else}
		{#await relatedProductsPromise}
			<div class={relatedProductsLayoutClass()} aria-hidden="true">
				{#each [...Array(4).keys()] as index (index)}
					<ProductCardSkeleton class={relatedProductItemClass()} />
				{/each}
			</div>
		{:then relatedProducts}
			{#if relatedProducts.length > 0}
				<div class={relatedProductsLayoutClass()}>
					{#each relatedProducts as relatedProduct (relatedProduct.id)}
						<ProductCard
							class={relatedProductItemClass()}
							product={relatedProduct as Product}
							href={productHref(relatedProduct as Product)} />
					{/each}
				</div>
			{:else}
				<div class="rounded-lg border border-dashed border-border bg-card px-4 py-8 text-center">
					<p class="font-mono text-xs text-muted-foreground">No related products</p>
				</div>
			{/if}
		{/await}
	{/if}
</section>
