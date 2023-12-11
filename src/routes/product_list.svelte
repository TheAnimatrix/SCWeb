<script>
	import ProductItem from '$libs/components/product/product_item.svelte';
	import { goto } from '$app/navigation';
    export let products;
	export let getLink;
	export let onClick;
</script>

<div class="main">
	{#each products as product, index (index)} <!-- whatever is in the brackets is the key -->
        <ProductItem {...product} href={getLink(index,product)} onClick={()=>onClick(index,product)}/>
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
