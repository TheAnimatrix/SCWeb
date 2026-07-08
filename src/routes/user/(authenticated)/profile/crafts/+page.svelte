<script lang="ts">
	import { navigating, page } from '$app/state';
	import ProductList from '$pages/product_list.svelte';
	import type { Product } from '$lib/types/product.js';
	import { ProductCardSkeleton, ScButton } from '$lib/components/sc';

	let { data } = $props();

	const products: Product[] = data.products ?? [];
	const isLoading = $derived(
		page.url.pathname.startsWith('/user/profile/crafts') && !!navigating.to
	);

	function getLink(_i: number, product: Product) {
		return `/${product.name.replaceAll(' ', '_')}/craft/item=${product.id}`;
	}
</script>

{#if isLoading}
	<div class="grid grid-cols-2 gap-3 lg:gap-4 lg:grid-cols-4" aria-hidden="true">
		{#each [...Array(4).keys()] as i (i)}
			<ProductCardSkeleton />
		{/each}
	</div>
{:else if products.length > 0}
	<ProductList {products} {getLink} />
{:else}
	<div class="rounded-md border border-border bg-card px-4 py-8 text-center">
		<p class="text-sm text-muted-foreground">No crafts published yet.</p>
		<ScButton href="/crafting" variant="secondary" class="mt-3">Start selling</ScButton>
	</div>
{/if}
