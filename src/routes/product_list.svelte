<script lang="ts">
	import type { Product } from '$lib/types/product';
	import { ProductCard, ProductCardList, ProductCardListItem } from '$lib/components/sc';

	interface Props {
		products?: Product[];
		getLink: (index: number, product: Product) => string;
		onClick?: (index: number, product: Product) => void;
		class?: string;
	}

	let { products = [], getLink, onClick = () => {}, class: className = '' }: Props = $props();
</script>

<ProductCardList class={className}>
	{#each products as product, index (product.id)}
		<ProductCardListItem>
			<ProductCard
				{product}
				href={getLink(index, product)}
				onclick={() => onClick(index, product)}
				dimOutOfStock />
		</ProductCardListItem>
	{/each}
</ProductCardList>
