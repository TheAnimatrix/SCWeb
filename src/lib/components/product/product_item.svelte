<script lang="ts">
	import no_img from '$lib/svg/no_img.svg';
	import Icon from '@iconify/svelte';
	import type { Product } from '$lib/types/product';
	import { HSLToHex, HexToHSL } from '$lib/types/helper';
	export let product: Product;
	export let accent1 = '#aaaaaa';
	export let accent2 = '#aaaaaa';
	export let accent3 = '#aaaaaa';
	let accent4: any= HexToHSL(accent2);
	let accent6 = `${accent4.h},${accent4.s}%,${accent4.l}%`;
	accent4.l += 10;
	accent4 = HSLToHex(accent4);
	let accent5: any = HexToHSL(accent3);
	accent5.l -= 30;
	accent5.s -= 30;
	accent5 = HSLToHex(accent5);
	export let href: string;
	export let onClick: any;
	const overlayStyle = '';
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->

<a
	href={product.stock.count > 0 ? href : '#'}
	style="background-color: {accent1}; --accent1: {accent1}; --accent2: {accent2}; --accent3: {accent3}; --accent4: {accent4}; --accent5:{accent5}; --accent6:{accent6};"
	class="relative product-top flex flex-col max-md:flex-[1_0_61%] max-lg:flex-[1_0_41%] max-xl:flex-[1_0_31%] flex-[1_0_21%] min-w-0 max-w-[400px] mt-[20px] rounded-lg transition-all duration-100 ease-out h-fit {product
		.stock.count > 0
		? ''
		: overlayStyle}"
	on:click={product.stock.count > 0 ? onClick : null}
>
	{#if product.stock.count <= 0}
		<div class="absolute inset-0 bg-gray-950 opacity-40 h-full w-full rounded-lg"></div>
	{/if}
	<img
		class="product-img h-[220px] object-cover rounded-t-lg"
		src={product.images?.at(0)?.url ?? no_img}
		alt="product"
	/>
	<div class="p-4 pb-1 min-h-0 flex flex-col">
		<div style="flex justify-between items-end">
			<div class="text-white font-bold text-2xl">{product.name}</div>
		</div>
		<div class="mt-[-8px]" style="color:{accent3};">by {product.author}</div>
		<div class="pt-2">
			{#each product.tags ?? [] as t}
				<span
					class="text-xs text-white mr-2 mt-2 font-semibold rounded-xl bg-black py-1 px-2 w-fit break-normal inline-block tag"
				>
					{t.tag}
				</span>
			{/each}
		</div>
		<div class="flex overflow-y-hidden overflow-x-hidden justify-between items-end mt-4">
			<div class="flex flex-col justify-end">
				{#if product.price.old != 0}
					<span class="text-gray-500 line-through text-lg font-medium -mb-2"
						>₹{product.price.old}</span
					>
				{/if}
				<div class="flex items-end">
					<span class="text-white text-2xl font-bold">₹{product.price.new}</span>
					{#if product.rating?.count && product.rating?.count > 0}
						<div class="text-[#ff9b3d] pl-1">
							<span
								class="text-orange-400 text-lg font-semibold inline-flex items-center text-center h-fit"
								>{product.rating?.rating}<Icon
									class="inline"
									icon="iconamoon:star-duotone"
								/>&nbsp;({product.rating?.count})</span
							>
						</div>
					{/if}
				</div>
			</div>
			{#if product.stock.count > 0}
				<Icon
					icon="solar:cart-plus-line-duotone"
					class="text-4xl rounded-xl hover:bg-white hover:bg-opacity-10 p-0.5 ease-linear transition-all duration-200"
					style="color: var(--accent3)"
				/>
			{/if}
		</div>
	</div>
	<div class="w-full mt-2 h-[10px] justify-end flex-1">
		<div class="p-1 pl-4 pr-4 rounded-b-lg text-white" style="background-color: var(--accent5)">
			{#if product.stock.count > 0}
				<span><strong>{product.stock.count}</strong> in stock</span>
			{:else}
				<span>{product.stock.status}</span>
			{/if}
		</div>
	</div>
</a>

<style lang="postcss">
	.product-top:hover {
		transform: translateY(-5px);
		transition: 0.2s ease-out;
		box-shadow: 10px 10px 50px 10px hsla(var(--accent6),0.15);
		cursor: pointer;
	}

	.tag:hover {
		background-color: var(--accent4);
		transition-duration: 0.2s;
		transition-property: background-color;
	}
	.tag {
		background-color: var(--accent2);
		transition-duration: 0.2s;
		transition-property: background-color;
	}
</style>
