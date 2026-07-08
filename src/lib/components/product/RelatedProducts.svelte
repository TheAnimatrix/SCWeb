<script lang="ts">
	import { ProductCard, ProductCardSkeleton } from '$lib/components/sc';
	import type { Product } from '$lib/types/product';
	import {
		fetchRelatedProducts,
		relatedProductItemClass,
		relatedProductsLayoutClass
	} from '$lib/utils/relatedProducts';
	import type { SupabaseClient } from '@supabase/supabase-js';

	interface Props {
		product: Product;
		supabase: SupabaseClient;
		class?: string;
	}

	let { product, supabase, class: className }: Props = $props();

	const relatedProductsPromise = $derived(fetchRelatedProducts(supabase, product));

	function productHref(item: Product): string {
		return `/${item.name.replaceAll(' ', '_')}/craft/item=${item.id}`;
	}
</script>

<section class={className}>
	<div class="mb-4 flex items-center justify-between gap-3">
		<h2 class="font-mono text-sm text-foreground">Pairs well with</h2>
	</div>

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
						product={relatedProduct}
						href={productHref(relatedProduct)} />
				{/each}
			</div>
		{:else}
			<div class="rounded-lg border border-dashed border-border bg-card px-4 py-8 text-center">
				<p class="font-mono text-xs text-muted-foreground">No related products</p>
			</div>
		{/if}
	{/await}
</section>
