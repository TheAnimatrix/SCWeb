<script lang="ts">
	import HTMLWrapper from './../../../../lib/components/fundamental/HTMLWrapper.svelte';
	import Loader from '$lib/components/fundamental/Loader.svelte';
	import { writable, type Writable } from 'svelte/store';
	import { getContext } from 'svelte';
	import {
		getItemFromCart,
		getActiveCart,
		type CartItem,
		type CartG,
		changeCart
	} from '$lib/client/cart';
	import type { Product } from '$lib/types/product.js';
	import Badge from '$lib/components/ui/badge/badge.svelte';
	import BannerIndicator from '$lib/components/fundamental/banner_indicator.svelte';
	import VariantSelector from '$lib/components/fundamental/variant_selector.svelte';
	import * as Accordion from '$lib/components/ui/accordion';
	import no_img from '$lib/svg/no_img.svg';
	import * as Tabs from '$lib/components/ui/tabs';
	import Icon from '@iconify/svelte';
	import SocialEmbed from '$lib/components/fundamental/SocialEmbed.svelte';
	import ProductItem from '$lib/components/product/product_item.svelte';
	import ProductList from '$pages/product_list.svelte';
	let indicator_cur = 0;
	let ItemQty = 0;
	let tabSet = 0;
	export let data;
	let productItem: Product = data.product;
	let indicator_max = productItem.images.length;
	let cart_qty_max = productItem.stock.count;
	let picIndex = 0;
	let cart_qty = 0;
	let addToCartSuccess: boolean | null = null;
	let addToCartMsg: string;

	function inc_cart() {
		if (cart_qty < cart_qty_max) {
			cart_qty++;
		}
	}

	function dec_cart() {
		if (cart_qty > 0) {
			cart_qty--;
		}
	}

	let timeoutId: NodeJS.Timeout;
	const cart_store = getContext<Writable<CartG>>('userCartStatus');
	async function cart_submit() {
		if (cart_qty > 0) {
			addToCartMsg = '' + cart_qty;
			let p: CartItem = { product_id: productItem.id, price: productItem.price.new, qty: cart_qty };
			const result = await changeCart(
				data.supabase_lt,
				cart_store,
				p,
				cart_qty_max,
				data.clientId,
				false
			);
			if (!result.error) {
				addToCartSuccess = true;
			} else {
				addToCartSuccess = false;
				addToCartMsg = result.data;
			}
			if (timeoutId) clearTimeout(timeoutId);
			timeoutId = setTimeout(() => {
				addToCartSuccess = null;
			}, 5000);
			cart_qty = 0;
		}
	}
	// styles
	const triggerTabStyle =
		'data-[state=active]:bg-scpurple data-[state=active]:text-white px-4 py-2 text-md text-gray-100 rounded-xl hover:bg-scpurpled3';
</script>

<div
	class="self-center h-full flex flex-col mx-auto items-center w-[95%] md:w-[90%] lg:w-[85%] 2xl:w-[75%] 3xl:w-[60%] 4xl:w-[50%]">
	<div class="w-full flex flex-col items-center">
		<div class="text-[#b8b8b8] mr-auto pb-2">
			<p>Crafts/<b class="text-white">{productItem.name}</b></p>
		</div>
		<div class="product_hero flex w-full min-h-[350px] flex-col md:flex-row justify-start">
			<div class="flex-1 mr-1">
				<img
					class="w-full h-full max-h-[400px] object-cover rounded-lg"
					id="product_image"
					src={productItem.images[indicator_cur].url ?? no_img}
					alt="lornode" />
			</div>
			<div class="image_mobile md:hidden -mt-1 mb-3">
				<BannerIndicator
					bind:curActive={indicator_cur}
					max={indicator_max}
					wActive="w-[12%]"
					wNormal="w-[6%]"
					hoverNormal="hover:w-[10%]" />
			</div>
			<div class="flex-[1.2] h-full flex flex-col ml-0 md:ml-2">
				<div class="flex">
					<div class="rounded-lg flex-1 bg-scpurpled1 p-4 flex flex-col justify-center">
						<div class="justify-center text-3xl text-white font-bold">{productItem.name}</div>
						<div class="justify-center text-2xl text-scpurple font-bold">
							By {productItem.author}
						</div>
						<div>
							{#each productItem.tags as t}
								<Badge class="text-white mr-2 mt-2 bg-scpurpled3 hover:bg-scpurpled4"
									>{t.tag}</Badge>
							{/each}
						</div>
					</div>
				</div>
				<div class="max-h-[60px]" class:noshow={!addToCartSuccess ?? true}>
					<div
						class="success rounded-lg text-white pl-4 py-2 text-base text-start bg-green-950 mt-2 flex items-center gap-2 border-green-500 border-[2px] animate_base">
						{#key addToCartSuccess}
							<Icon icon="line-md:confirm-square-twotone" class="text-green-400 text-3xl" />
						{/key}
						<span class="text-green-400"
							>"{productItem.name}" x {addToCartMsg} - Added to cart</span>
					</div>
				</div>
				<div class="max-h-[90px]" class:noshow={addToCartSuccess ?? true}>
					<div
						class="show success rounded-lg text-white pl-4 py-2 text-base text-start bg-red-950 mt-2 flex items-center gap-2 border-red-500 border-[2px] animate_base">
						{#key addToCartSuccess}
							<Icon icon="line-md:cancel-twotone" class="text-red-400 text-3xl" />
						{/key}
						<span class="text-red-400">Error - {addToCartMsg}</span>
					</div>
				</div>
				<div class="rounded-lg text-white pl-4 py-2 text-base text-start bg-scpurpled1 mt-2 pb-4">
					<!-- 
					bring back once variant support is there in database	
					<div class="mt-2">
						<VariantSelector />
					</div> -->
					<div class="flex justify-between">
						<div class="flex flex-col self-end">
							<div class="py-2 pr-5">
								{#if productItem.price.old > 0}
									<span id="oldPrice" class="text-gray-500 line-through text-lg font-medium"
										>₹{productItem.price.old}</span>
								{/if}<br />
								<span id="newPrice" class="text-white text-3xl font-bold"
									>₹{productItem.price.new}</span
								><br />
								<span
									id="rating"
									class="text-orange-400 text-lg font-semibold inline-flex items-center text-center h-fit"
									>{productItem.rating?.rating}<Icon
										class="inline"
										icon="iconamoon:star-duotone" />&nbsp;({productItem.rating?.count})</span>
							</div>
						</div>
						<div class="flex flex-col ml-8 my-2 self-start items-end">
							{#if productItem.stock.status}
								<div
									id="sale_info"
									class="w-[100%] flex text-white text-center text-sm md:text-md font-bold bg-gradient-to-r from-orange-500 via-orange-500 to-pink-500 p-2">
									{productItem.stock.status}
								</div>
							{/if}
							{#if productItem.stock.count > 0}
								<div class="p-2 pl-4 pr-4 bg-scpurpled3 text-md md:text-xl font-bold">
									{productItem.stock.count} In Stock
								</div>
							{/if}
						</div>
					</div>
					<div
						class="flex justify-around items-center rounded-xl w-fit h-fit bg-scpurpled3 text-xl my-2">
						<button class="p-0 px-4 hover:scale-150" on:click={dec_cart}>-</button>
						<div class="p-1 px-4 border-x-2 border-scpurplel0" id="qty_show">{cart_qty}</div>
						<button class="p-0 px-4 hover:scale-150" on:click={inc_cart}>+</button>
						<button
							class="p-2 bg-black hover:scale-110 hover:rounded-md rounded-r-xl flex items-center"
							class:bg-scpurple={productItem.stock.count > 0}
							id="add_to_cart"
							on:click={cart_submit}>
							<Icon icon="iconamoon:shopping-bag-duotone" class="w-auto h-full text-3xl" />
							{#if productItem.stock.count <= 0}
								<span class="px-2">Out of stock</span>
							{/if}
						</button>
					</div>
				</div>
			</div>
		</div>
	</div>
	<div class="flex justify-start w-full flex-col md:flex-row">
		<div class="flex-[1.4] text-white justify-start md:mr-4 mr-1">
			<div class="hidden md:block">
				{#if indicator_max > 1}
					<BannerIndicator
						bind:curActive={indicator_cur}
						max={indicator_max}
						wActive="w-[12%]"
						wNormal="w-[6%]"
						hoverNormal="hover:w-[10%]" />
				{/if}
			</div>
			<div
				class="flex-1 w-full h-fit bg-gradient-to-br from-scpurpled1 to-scpurpled3 rounded-r-xl rounded-b-xl mt-4 pageCut">
				<div class="h-[30px] w-[30px] pageTurn drop-shadow-[0_0_10px_rgba(0,0,0,0.5)]"></div>
				<div class="p-4 pt-2 opacity-85">
					{#if productItem.documentation?.at(0)?.isMDUrl}
						{#await fetch(productItem.documentation?.at(0)?.data)}
							<div class="w-full justify-center flex"><Loader /></div>
						{:then data}
							{#if data.ok}
								{#await data.text()}
									<Loader />
								{:then text}
									<HTMLWrapper html={text} />
								{/await}
							{:else}
								Oops! There was an error in retrieving the description. Please try again later.
							{/if}
						{/await}
					{:else if productItem.documentation?.at(0)?.data}
						<HTMLWrapper html={productItem.documentation?.at(0)?.data ?? ''} />
					{:else}
						No description available yet!
					{/if}
					<br />
					<SocialEmbed />
				</div>
			</div>
		</div>
		<div class="flex-1 max-w-[550px] my-4 w-full flex flex-col">
			<Tabs.Root value="faq" class="w-full" id="crazy">
				<Tabs.List
					class="bg-scpurpled1 w-full justify-between p-2 h-fit rounded-xl  overflow-x-auto">
					<Tabs.Trigger class={triggerTabStyle} value="faq">FAQ</Tabs.Trigger>
					<Tabs.Trigger class={triggerTabStyle} value="documentation">Documentation</Tabs.Trigger>
					<Tabs.Trigger class={triggerTabStyle} value="shipping">Shipping</Tabs.Trigger>
					<Tabs.Trigger class={triggerTabStyle} value="costing">Costing</Tabs.Trigger>
				</Tabs.List>
				<!--  -->
				<Tabs.Content value="faq" class="text-white bg-scpurpled3 pb-4 rounded-xl text-start">
					<div>
						{#if productItem.faq && productItem.faq.length > 0}
							<Accordion.Root class="w-full litem" multiple>
								{#each productItem.faq as faq, i}
									<Accordion.Item
										value="item-{i}"
										class="border-0 px-4 {i % 2 != 0 ? 'bg-scpurpled1' : 'bg-scpurpled2'} {i == 0
											? 'rounded-t-xl'
											: ''}">
										<Accordion.Trigger
											><span class="text-start">{faq.question}</span></Accordion.Trigger>
										<Accordion.Content
											><span class="text-start">{faq.answer}</span></Accordion.Content>
									</Accordion.Item>
								{/each}
							</Accordion.Root>
						{:else}
							<div class="px-4 pt-4 text-md">No FAQ Available</div>
						{/if}
					</div>
				</Tabs.Content>
				<Tabs.Content value="documentation" class="text-white bg-scpurpled3 p-4 rounded-xl"
					>{productItem.documentation?.at(1)?.data ?? 'No documentation available'}</Tabs.Content>
				<Tabs.Content value="costing" class="text-white bg-scpurpled3 p-4 rounded-xl">
					{#if productItem.documentation?.at(2)?.data}
						{#if productItem.documentation?.at(2)?.isMDUrl}
							{#await fetch(productItem.documentation.at(2).data)}
								<div class="w-full justify-center flex"><Loader /></div>
							{:then data}
								{#if data.ok}
									{#await data.text()}
										<Loader />
									{:then text}
										<HTMLWrapper html={text} />
									{/await}
								{:else}
									No costing details available
								{/if}
							{:catch e}
								No costing details available
							{/await}
						{:else}
							<HTMLWrapper html={productItem.documentation?.at(2)?.data} />
						{/if}
					{:else}
						No costing details available
					{/if}
				</Tabs.Content>
				<Tabs.Content value="shipping" class="text-white bg-scpurpled3 p-4 rounded-xl">
					{#if productItem.documentation?.at(3)?.data}
						{#if productItem.documentation?.at(3)?.isMDUrl}
							{#await fetch(productItem.documentation.at(3).data)}
								<div class="w-full justify-center flex"><Loader /></div>
							{:then data}
								{#if data.ok}
									{#await data.text()}
										<Loader />
									{:then text}
										<HTMLWrapper html={text} />
									{/await}
								{:else}
									No shipping details available
								{/if}
							{:catch e}
								No shipping details available
							{/await}
						{:else}
							<HTMLWrapper html={productItem.documentation?.at(3)?.data} />
						{/if}
					{:else}
						No shipping details available
					{/if}
				</Tabs.Content>
			</Tabs.Root>

			{#if productItem.type == 'product'}
				{#await data.supabase_lt.from('products').select('*').eq('rel', productItem.id) then result}
					{#if result.data && !result.error && result.data.length > 0}
						<div class="text-white flex flex-col gap-2">
							<div class="mt-4 p-3 rounded-xl bg-scpurpled1 flex">
								<span class="text-white text-lg font-bold">Related</span>
							</div>
							<div class="flex w-full bg-scpurpled2 rounded-xl overflow-x-scroll px-2 pt-2 pb-1 gap-2">
								{#each result.data as relProd}
								<a target="_self" href={`/${relProd.name.replaceAll(' ', '_')}/craft/item=${relProd.id}`} class="flex flex-col items-center p-2 bg-scpurpled1 rounded-xl min-w-56 w-56">
									<img src={relProd.images[0].url ?? no_img} alt={relProd.name} class="w-full h-36 object-cover mb-2 rounded-xl">
									<span class="text-white text-lg font-bold text-start w-full">{relProd.name}</span>
									<div class="flex items-center gap-1 mt-2 w-full">
										<span class="text-white text-sm mt-1">{relProd.stock.count} in stock</span>
										<div class="flex-1"></div>
										{#if relProd.price.old > 0}
											<span class="text-gray-300 line-through text-sm">₹{relProd.price.old}</span>
										{/if}
										<span class="text-white text-lg font-bold">₹{relProd.price.new}</span>
									</div>
								</a>
								{/each}
							</div>
						</div>
					{/if}
				{/await}
			{:else}
			{#await data.supabase_lt.from('products').select('*').eq('id', productItem.rel) then result}
				{#if result.data && !result.error && result.data.length > 0}
					<div class="text-white flex flex-col gap-2">
						<div class="mt-4 p-3 rounded-xl bg-scpurpled1 flex">
							<span class="text-white text-lg font-bold">Related</span>
						</div>
						<div class="flex w-full bg-scpurpled2 rounded-xl overflow-x-scroll px-2 pt-2 pb-1 gap-2">
							{#each result.data as relProd}
							<a target="_self" href={`/${relProd.name.replaceAll(' ', '_')}/craft/item=${relProd.id}`} class="flex flex-col items-center p-2 bg-scpurpled1 rounded-xl min-w-56 w-56">
								<img src={relProd.images[0].url ?? no_img} alt={relProd.name} class="w-full h-36 object-cover mb-2 rounded-xl">
								<span class="text-white text-lg font-bold text-start w-full">{relProd.name}</span>
								<div class="flex items-center gap-1 mt-2 w-full">
									<span class="text-white text-sm mt-1">{relProd.stock.count} in stock</span>
									<div class="flex-1"></div>
									{#if relProd.price.old > 0}
										<span class="text-gray-300 line-through text-sm">₹{relProd.price.old}</span>
									{/if}
									<span class="text-white text-lg font-bold">₹{relProd.price.new}</span>
								</div>
							</a>
							{/each}
						</div>
					</div>
				{/if}
			{/await}
			{/if}
		</div>
	</div>
</div>

<style lang="postcss">
	* {
		@apply transition-all duration-200 ease-linear;
	}

	.pageTurn {
		background: linear-gradient(
			135deg,
			transparent 0%,
			transparent 50%,
			theme('colors.scpurpled2') 50%,
			theme('colors.scpurpled4') 100%
		);
	}

	.pageCut {
		clip-path: polygon(30px 0, 100% 0, 100% 100%, 0 100%, 0 30px);
	}

	.noshow {
		@apply !invisible !max-h-0 !border-0;
	}



	/* For WebKit browsers (Chrome, Safari) */
	::-webkit-scrollbar {
		width: 12px; /* Width of the scrollbar */
		height: 8px; /* Height of the scrollbar */
	}

	::-webkit-scrollbar-track {
		background: transparent; /* Track color */
		border-radius: 10px; /* Rounded corners */
	}

	::-webkit-scrollbar-thumb {
		background: rgb(204, 204, 204); /* Thumb color */
		border-radius: 10px; /* Rounded corners */
	}

	::-webkit-scrollbar-thumb:hover {
		background: #ffffff; /* Thumb color on hover */
	}

	

</style>
