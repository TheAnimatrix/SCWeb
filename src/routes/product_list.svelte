<script lang="ts">
	import type { Product } from '$lib/types/product';
	import { ProductCard } from '$lib/components/sc';

	interface Props {
		products?: Product[];
		getLink: (index: number, product: Product) => string;
		onClick?: (index: number, product: Product) => void;
		class?: string;
	}

	let {
		products = [],
		getLink,
		onClick = () => {},
		class: className = ''
	}: Props = $props();
</script>

<div class="grid w-full grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 {className}">
	{#each products as product, index (product.id)}
		<ProductCard
			{product}
			href={getLink(index, product)}
			onclick={() => onClick(index, product)}
		/>
	{/each}
</div>
