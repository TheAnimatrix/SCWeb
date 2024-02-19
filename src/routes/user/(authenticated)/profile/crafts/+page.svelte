<script lang="ts">
	import ProductList from '$pages/product_list.svelte';
	import type { Product } from '$lib/stores/types/product';

	let getLink = (i: number, product: Product) => {
		return `/${product.name.replaceAll(' ', '_')}/craft/item=${product.id}`;
	};

	export let data;
	let products: Product[];
	let loading = false;
	async function setup() {
		loading = true;
		let uid = (await data.supabase_lt.auth.getUser()).data.user?.id;
		if (!uid) return;
		let resp = await data.supabase_lt.from('products').select('*').eq('uid', uid);
		if (resp.error || !resp.data) {
		} else {
			products = resp.data as Product[];
		}
		loading = false;
	}

	setup();
</script>

<div class="mt-4 flex flex-col h-fit justify-center items-center text-white w-[60%]">
	{#if (products && products.length > 0)}
		<ProductList
			{products}
			{getLink}
			accent1="#1c120a"
			accent2="#2a1f1a"
			accent3="#f4b679"
			class="justify-center"
		/>
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
