<script lang="ts">
	import type{ Product } from '$lib/stores/types/product';
	import ProductItem from '$lib/components/product/product_item.svelte';
	import { goto } from '$app/navigation';
    export let products : Product[];
	export let getLink : any;
	export let onClick : any = ()=>{};
</script>

<div class="main">
	{#each products as product, index (index)} <!-- whatever is in the brackets is the key -->
        <ProductItem {product} href={getLink(index,product)} onClick={()=>onClick(index,product)}/>
	{/each}
	<div style="width:100%;height:80px;"></div>
</div>

<style>
	.main {
		display: flex;
		flex-wrap: wrap;
		gap: 20px;
		width: 100%;
		height:100%;
	}
</style>
