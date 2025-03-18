<script lang="ts">
	import type{ Product } from '$lib/types/product';
	import ProductItem from '$lib/components/product/product_item.svelte';
	import { goto } from '$app/navigation';
    export let products : Product[] = [];
	export let getLink : any;
	export let onClick : any = ()=>{};
	let className = "";
	export {className as class};
</script>

<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full {className}">
	{#each products as product, index (index)}
        <ProductItem
			{product} 
			href={getLink(index, product)}
			onClick={()=>onClick(index,product)}
		/>
	{/each}
	<!-- Spacer to prevent footer overlap -->
	<div class="h-20 col-span-full"></div>
</div>