<script lang="ts">
	import { browser } from '$app/environment';
	import { ProductCard, ProductCardSkeleton } from '$lib/components/sc';
	import { getRelatedProducts } from '$lib/client/catalogApi';
	import { productPath } from '$lib/seo/product';
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
					result.ok ? (result.data.products as Product[]) : []
				)
			: null
	);

	/**
	 * The API fills with the same maker's items, then the same type, then the newest
	 * anywhere. Only claim "More from this maker" when every item really is theirs;
	 * never claim the items go together.
	 */
	function sectionTitle(items: Product[]): string {
		const sameMaker = !!product.uid && items.every((item) => item.uid === product.uid);
		return sameMaker ? 'More from this maker' : 'You might also like';
	}
</script>

{#if !relatedProductsPromise}
	<div class={className} aria-hidden="true">
		<div class={relatedProductsLayoutClass()}>
			{#each [...Array(4).keys()] as index (index)}
				<ProductCardSkeleton class={relatedProductItemClass()} />
			{/each}
		</div>
	</div>
{:else}
	{#await relatedProductsPromise}
		<div class={className} aria-hidden="true">
			<div class={relatedProductsLayoutClass()}>
				{#each [...Array(4).keys()] as index (index)}
					<ProductCardSkeleton class={relatedProductItemClass()} />
				{/each}
			</div>
		</div>
	{:then relatedProducts}
		{#if relatedProducts.length > 0}
			<section class={className} aria-labelledby="related-products-title">
				<h2 id="related-products-title" class="mb-4 text-base font-medium text-foreground">
					{sectionTitle(relatedProducts)}
				</h2>
				<div class={relatedProductsLayoutClass()}>
					{#each relatedProducts as relatedProduct (relatedProduct.id)}
						<ProductCard
							class={relatedProductItemClass()}
							product={relatedProduct}
							href={productPath(relatedProduct)}
							dimOutOfStock />
					{/each}
				</div>
			</section>
		{/if}
	{/await}
{/if}
