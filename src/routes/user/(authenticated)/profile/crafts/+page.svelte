<script lang="ts">
	import ProductList from '$pages/product_list.svelte';
	import type { Product } from '$lib/types/product.js';
	import { ScButton } from '$lib/components/sc';

	let { data } = $props();

	const products: Product[] = data.products ?? [];

	function getLink(_i: number, product: Product) {
		return `/${product.name.replaceAll(' ', '_')}/craft/item=${product.id}`;
	}
</script>

{#if products.length > 0}
	<ProductList {products} {getLink} />
{:else}
	<div class="rounded-md border border-border bg-card px-4 py-8 text-center">
		<p class="text-sm text-muted-foreground">No crafts published yet.</p>
		<ScButton href="/crafting" variant="secondary" class="mt-3">Start selling</ScButton>
	</div>
{/if}
