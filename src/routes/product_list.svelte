<script lang="ts">
	import type{ Product } from '$lib/types/product';
	import ProductItem from '$lib/components/product/product_item.svelte';
	import { goto } from '$app/navigation';
    export let products : Product[] = [];
	export let getLink : any;
	export let onClick : any = ()=>{};
	export let accent1 = "#aaaaaa";
	export let accent2 = "#aaaaaa";
	export let accent3 = "#aaaaaa";
	let className = "";
	export {className as class};
</script>

<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-x-3 gap-y-3 mt-4 w-full h-full {className}">
	{#each products as product, index (index)} <!-- whatever is in the brackets is the key -->
        <ProductItem {accent1} {accent2} {accent3} {product} href="/{product.name.replaceAll(' ', '_')}/craft/item={product.id}" onClick={()=>onClick(index,product)}/>
	{/each}
	<div style="width:100%;height:80px;"></div>
</div>