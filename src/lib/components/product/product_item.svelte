<script lang="ts">
	import no_img from '$lib/svg/no_img.svg';
	import Icon from '@iconify/svelte';
	import type { Product } from '$lib/types/product';
	import { HSLToHex, HexToHSL } from '$lib/types/helper';
	interface Props {
		product: Product;
		href: string;
		onClick: any;
	}

	let { product, href, onClick }: Props = $props();
</script>

<a
	href={product.stock.count > 0 ? href : '#'}
	class="group bg-[#151515] border border-[#252525] hover:border-[#353535] rounded-2xl overflow-hidden transition-all duration-300 flex flex-col h-full relative {product.stock.count <= 0 ? 'opacity-70' : ''}"
	onclick={product.stock.count > 0 ? onClick : null}>
	
	<!-- Out of stock overlay -->
	{#if product.stock.count <= 0}
		<div class="absolute inset-0 bg-black/60 backdrop-blur-xs z-20 flex items-center justify-center">
			<div class="bg-black/80 text-white px-4 py-2 rounded-lg font-medium">
				Out of Stock
			</div>
		</div>
	{/if}
	
	<!-- Product image with hover effect -->
	<div class="relative h-[220px] overflow-hidden">
		<img
			class="h-full w-full object-cover transition-transform duration-700 ease-in-out group-hover:scale-110"
			src={product.images?.at(0)?.url ?? no_img}
			alt={product.name} />
			
		<!-- Price badge -->
		<div class="absolute top-4 right-4 z-10 flex items-center">
			{#if product.price.old != 0}
				<div class="bg-black/60 backdrop-blur-xs text-white px-2 py-1 rounded-lg line-through text-sm mr-2">
					₹{product.price.old}
				</div>
			{/if}
			<div class="bg-accent text-black px-3 py-1 rounded-lg font-bold">
				₹{product.price.new}
			</div>
		</div>
		
		<!-- Rating badge (if available) -->
		{#if product.rating?.count && product.rating?.count > 0}
			<div class="absolute bottom-4 left-4 z-10 bg-black/60 backdrop-blur-xs rounded-lg px-2 py-1 flex items-center">
				<Icon icon="iconamoon:star-duotone" class="text-[#ff9b3d] mr-1" />
				<span class="text-white font-medium">{product.rating?.rating}</span>
				<span class="text-gray-300 text-xs ml-1">({product.rating?.count})</span>
			</div>
		{/if}
	</div>
	
	<!-- Product details -->
	<div class="p-5 flex flex-col grow">
		<!-- Title and author -->
		<div>
			<div class="text-xl font-bold text-white group-hover:text-accent transition-colors">
				{product.name}
			</div>
			<p class="text-gray-400 text-sm mt-1">by {product.author}</p>
		</div>
		
		<!-- Tags -->
		{#if product.tags && product.tags.length > 0}
			<div class="mt-4 flex flex-wrap gap-2">
				{#each product.tags as t}
					<span class="text-xs bg-[#252525] hover:bg-[#353535] text-gray-300 py-1 px-2 rounded-full transition-colors">
						{t.tag}
					</span>
				{/each}
			</div>
		{/if}
		
		<!-- Bottom actions -->
		<div class="mt-auto pt-4 flex justify-between items-center">
			<!-- Stock status -->
			<div class="{product.stock.count > 0 ? 'text-accent' : 'text-red-400'} text-sm font-medium">
				{#if product.stock.count > 0}
					<span>{product.stock.count} in stock</span>
				{:else if product.stock.status}
					<span>{product.stock.status}</span>
				{/if}
			</div>
			
			<!-- Add to cart button -->
			{#if product.stock.count > 0}
				<button class="w-10 h-10 rounded-lg bg-[#252525] hover:bg-accent hover:text-black text-white flex items-center justify-center transition-colors">
					<Icon icon="ph:shopping-cart-simple-bold" class="text-xl" />
				</button>
			{/if}
		</div>
	</div>
</a>

<style>
	/* Add any additional styles here if needed */
</style>
