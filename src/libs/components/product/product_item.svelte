<script lang="ts">
	import no_img from '$libs/svg/no_img.svg';
	import Icon from '@iconify/svelte';
	import { Badge } from '$libs/components/ui/badge';
	import type {Product} from '$libs/stores/types/product';
	export let product: Product;
	product.accent2 = product.accent2 ?? product.accent1;
	product.accent3 = product.accent3 ?? product.accent1;
	export let href : string;
	export let onClick : any;
	const overlayStyle="";
</script>
<!-- svelte-ignore a11y-click-events-have-key-events -->

<a
	href={product.stock>0?href:"#"}
	class="relative product-top flex flex-col max-md:flex-[1_0_61%] max-lg:flex-[1_0_41%] max-xl:flex-[1_0_31%] flex-[1_0_21%] min-w-0 max-w-[600px] mt-[20px] rounded-lg bg-scpurpled1 transition-all duration-100 ease-out h-fit {product.stock>0 ? "" : overlayStyle}"
	on:click={product.stock>0?onClick:null}>
	{#if product.stock<=0}
		<div class="absolute inset-0 bg-gray-950 opacity-50 h-full w-full rounded-lg"></div>
	{/if}
	<img class="product-img h-[220px] object-cover rounded-t-lg" src={product.pic[0]??no_img} alt="product" />
	<div class="p-4 pb-1 min-h-0 flex flex-col">
		<div style="flex justify-between items-end">
			<div class="text-white font-bold text-2xl">{product.name}</div>
		</div>
		<div class="text-scpurplel0 mt-[-8px]">by {product.author}</div>
		<div
			class="description font-normal text-[110%] text-white text-ellipsis whitespace-pre-line pt-2"
			style="word-wrap:break-word;"
		>
			{#each product.tags as t}
				<Badge class="text-white mr-2 mt-2 bg-scpurpled3 hover:bg-scpurpled2">{t}</Badge>
			{/each}
		</div>
		<div class="flex overflow-y-hidden overflow-x-hidden justify-between items-end mt-4">
			<div class="flex flex-col justify-end">
				{#if product.oldPrice != 0}
					<span class="text-gray-500 line-through text-lg font-medium -mb-2">₹{product.oldPrice}</span>
				{/if}
				<div class="flex items-end">
					<span class="text-white text-2xl font-bold">₹{product.newPrice}</span>
					{#if product.ratingCount > 0}
						<div class="text-[#ff9b3d] pl-1">
							{product.rating}({product.ratingCount})
						</div>
					{/if}
				</div>
			</div>
			{#if product.stock>0}
				<Icon icon="solar:cart-plus-line-duotone" class="text-scpurplel1 text-4xl rounded-xl hover:bg-scpurplel2 hover:text-scpurple p-0.5 ease-linear transition-all duration-200"/>
			{/if}
		</div>
	</div>
	<div class="w-full mt-2 h-[10px] justify-end flex-1">
		<div class="{product.infoColor} p-1 pl-4 pr-4 rounded-b-lg">
			{#if product.stock>0}
				<span><strong>{product.stock}</strong> in stock</span>
			{:else}
				<span>{product.info}</span>
			{/if}
		</div>
	</div>
</a>

<style>

	.product-top:hover{
  		transform: translateY(-5px);
  		transition: 0.2s ease-out;
  		box-shadow: 10px 10px 50px 10px rgba(0,0,0,.35);
		cursor: pointer;
	}


	.description::-webkit-scrollbar {
		width: 6px;
	}

	/* Track */
	.description::-webkit-scrollbar-track {
		background: #333333;
		border-radius: 12px;
	}

	/* Handle */
	.description::-webkit-scrollbar-thumb {
		background-color: rgb(94, 94, 94);
		border-radius: 12px;
		transition: 0.4s linear all;
	}

	/* Handle on hover */
	.description::-webkit-scrollbar-thumb:hover {
		background-color: #cacaca;
		transition: 0.4s linear all;
	}

</style>
