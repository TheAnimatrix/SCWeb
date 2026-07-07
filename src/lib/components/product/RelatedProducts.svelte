<script lang="ts">
	import { ProductCard, ProductCardSkeleton } from '$lib/components/sc';
	import type { Product } from '$lib/types/product';
	import type { SupabaseClient } from '@supabase/supabase-js';

	interface Props {
		product: Product;
		supabase: SupabaseClient;
		class?: string;
	}

	let { product, supabase, class: className }: Props = $props();

	function productHref(item: Product): string {
		return `/${item.name.replaceAll(' ', '_')}/craft/item=${item.id}`;
	}
</script>

<section class={className}>
	<div class="mb-4 flex items-center justify-between gap-3">
		<h2 class="font-mono text-sm text-foreground">pairs_well_with</h2>
	</div>

	{#if product.type === 'product'}
		{#await supabase.from('products').select('*').eq('rel', product.id)}
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
				{#each Array(3) as _, index (index)}
					<ProductCardSkeleton />
				{/each}
			</div>
		{:then result}
			{#if result.data && !result.error && result.data.length > 0}
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{#each result.data as relatedProduct (relatedProduct.id)}
						<ProductCard product={relatedProduct} href={productHref(relatedProduct)} />
					{/each}
				</div>
			{:else}
				<div class="rounded-lg border border-dashed border-border bg-card px-4 py-8 text-center">
					<p class="font-mono text-xs text-muted-foreground">no_related_products</p>
				</div>
			{/if}
		{/await}
	{:else}
		{#await supabase.from('products').select('*').eq('id', product.rel)}
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
				{#each Array(3) as _, index (index)}
					<ProductCardSkeleton />
				{/each}
			</div>
		{:then result}
			{#if result.data && !result.error && result.data.length > 0}
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{#each result.data as relatedProduct (relatedProduct.id)}
						<ProductCard product={relatedProduct} href={productHref(relatedProduct)} />
					{/each}
				</div>
			{:else}
				<div class="rounded-lg border border-dashed border-border bg-card px-4 py-8 text-center">
					<p class="font-mono text-xs text-muted-foreground">no_related_products</p>
				</div>
			{/if}
		{/await}
	{/if}
</section>
