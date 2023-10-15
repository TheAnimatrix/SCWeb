<script>
	import ProductItem from './product_item.svelte';
	import { goto } from '$app/navigation';



    export let products;
    export let onClick;
</script>

<div class="main">
	{#each products as product, index (index)} <!-- whatever is in the brackets is the key -->
        <ProductItem {...product} onClick={() => onClick(index,product)} />
	{/each}
</div>

<style>
	.main {
		display: flex;
		flex-wrap: wrap;
		gap: 20px;
		width: 100%;
		margin-bottom: 80px;
	}
</style>
