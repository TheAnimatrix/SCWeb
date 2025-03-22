<script lang="ts">
	import ProductList from '$pages/product_list.svelte';
	import type { Product } from '$lib/types/product.js';

	let getLink = (i: number, product: Product) => {
		return `/${product.name.replaceAll(' ', '_')}/craft/item=${product.id}`;
	};

	let { data } = $props();
	let products: Product[] = $state();
	let loading = false;
	if (data.products) products = data.products;
</script>

<div class="mt-4 flex flex-col h-fit justify-center items-center text-white">
	{#if products && products.length > 0}
		<ProductList
			{products}
			{getLink}
			accent1="#1c120a"
			accent2="#2a1f1a"
			accent3="#f4b679"
			class="justify-center" />
	{:else}
		<div class="flex justify-center text-2xl">
			{#if !loading}
				<div class="text-center">
					<div>No crafts published yet</div>
					<div>see <a href="/crafting" class="text-scorange">crafting</a> for more details</div>
				</div>
			{:else}
				Loading...
			{/if}
		</div>
	{/if}
</div>
