<script>
	import BannerIndicator from '$libs/components/fundamental/banner_indicator.svelte';
	import VariantSelector from '$libs/components/fundamental/variant_selector.svelte';
	import no_img from '$libs/svg/no_img.svg';
	import CartIcon from '$libs/svg/add_to_cart_icon.svg';
	import { getProduct, products } from '$libs/stores/products.js';
	import { TabGroup, Tab } from '@skeletonlabs/skeleton';
	import { Accordion, AccordionItem } from '@skeletonlabs/skeleton';
	let indicator_cur = 0;
	let ItemQty = 0;
	let tabSet = 0;
	export let data;
	console.log(data);
	let i = data.item;
	let indicator_max = getProduct(i).pic.length;
	let picIndex = 0;
	let cart_qty = 0;
	let cart_qty_max = getProduct(i).stock;

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

	function cart_submit() {
		if (cart_qty > 0) {
			alert(`${cart_qty} * ${getProduct(i).name} added to cart`);
			cart_qty = 0;
		}
	}
</script>

<!-- <ProductItem {...productB} onClick={()=>console.log("clicked")}/> -->

<div
	class="self-center w-[50%] h-full flex flex-col mx-auto items-center max-sm:w-[95%] max-md:w-[90%] max-lg:w-[85%] max-2xl:w-[75%]"
>
	<div class="w-full flex flex-col items-center">
		<div class="text-[#b8b8b8] mr-auto pb-2">
			<p>Crafts/<b class="text-white">{getProduct(i).name}</b></p>
		</div>
		<div class="product_hero flex w-full min-h-[25%] max-sm:flex-col justify-start">
			<div class="flex-1 mr-1">
				<img
					class="w-full min-h-full object-cover rounded-lg"
					id="product_image"
					src={getProduct(i).pic[indicator_cur] ?? no_img}
					alt="lornode"
				/>
			</div>
			<div class="flex-[1.2] h-full flex flex-col ml-2 max-sm:ml-0">
				<div class="flex mb-2">
					<div
						class="rounded-lg flex-1 bg-scpurpled1 p-4 flex flex-col justify-center max-sm:mt-2"
					>
						<div class="justify-center text-3xl text-white font-bold">{getProduct(i).name}</div>
						<div class="justify-center text-2xl text-scpurple font-bold">
							By {getProduct(i).author}
						</div>
					</div>
				</div>
				<div class="rounded-lg text-white pl-4 py-2 text-base text-start bg-scpurpled1 mt-1 pb-4">
					<div class="mt-2">
						<VariantSelector />
					</div>
					<div class="flex justify-between">
						<div class="flex flex-col self-end">
							<div class="py-2 pr-5">
								{#if getProduct(i).oldPrice > 0}
									<span id="oldPrice" class="text-gray-500 line-through text-lg font-medium"
										>₹{getProduct(i).oldPrice}</span
									>
								{/if}<br />
								<span id="newPrice" class="text-white text-3xl font-bold"
									>₹{getProduct(i).newPrice}</span
								><br />
								<span id="rating" class="text-orange-400 text-lg font-semibold"
									>{getProduct(i).rating}({getProduct(i).ratingCount})</span
								>
							</div>
							<div class="flex justify-around items-center rounded-xl w-fit h-fit bg-scpurpled2 text-xl my-2">
								<button class="p-0 px-4 hover:scale-150" on:click={dec_cart}>-</button>
								<div class="p-1 px-4 border-x-4 border-scpurpled3" id="qty_show">{cart_qty}</div>
								<button class="p-0 px-4 hover:scale-150" on:click={inc_cart}>+</button>
								<button
									class="p-2 bg-black hover:scale-110 hover:rounded-md rounded-r-xl flex items-center"
									class:bg-scpurple={getProduct(i).stock > 0}
									id="add_to_cart"
									on:click={cart_submit}
								>
									<img src={CartIcon} alt="add to cart" class="w-auto h-full" />
									{#if getProduct(i).stock <= 0}
										<span class="px-2">Out of stock</span>
									{/if}
								</button>
							</div>
						</div>
						<div class="flex flex-col my-2 self-end items-end">
							{#if getProduct(i).stock > 0}
								<div class="p-2 pl-4 pr-4 bg-scpurpled2 text-xl font-bold ">
									{getProduct(i).stock} In Stock
								</div>
							{/if}
							<div
								id="sale_info"
								class="max-h-[55%] flex text-white text-center text-2xl font-bold bg-gradient-to-r from-orange-500 via-orange-500 to-pink-500 p-2 pr-4 pl-4"
							>
								{getProduct(i).info}
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
	<div class="flex justify-start w-full">
		<div class="flex-1 text-white justify-start mr-4">
			<div>
				{#if indicator_max > 1}
					<BannerIndicator bind:curActive={indicator_cur} max={indicator_max} wActive="w-[12%]" wNormal="w-[6%]" hoverNormal="hover:w-[10%]"/>
				{/if}
			</div>
			<div class="flex-1 w-full h-fit bg-gradient-to-br from-scpurpled1 to-scpurpled2 rounded-r-xl rounded-b-xl mt-4">
				<svg xmlns="http://www.w3.org/2000/svg" width="30" height="27D" viewBox="0 0 53 47" fill="none">
					<path d="M50.5 46.0427L0 43.1375L53 0.0427246L50.5 46.0427Z" fill="#321E51"/>
					<path d="M53 0.0427246L0 44.0427V0.0427246H53Z" fill="#12081b"/>
					</svg>
			<div class="p-4 pt-2">
				{getProduct(i).description}
			</div>
			</div>
		</div>
		<div class="flex-1 my-4">
			<!-- 
		
				class applies to the entire block
				regionList applies only to the tab list
				spacing applies to the block
			 -->
			<TabGroup
				justify="justify-start items-end"
				border="pb-4"
				active="mx-2 transition-all ease-in duration-200 bg-[#8D39FF] text-white text-xl font-bold font-figtree"
				hover="mx-2 ml-1 bg-scpurpled1 text-white !transition-all !ease-in !duration-200 hover:!bg-scpurpled3"
				rounded="rounded-xl"
				flex="flex-wrap"
				spacing=""
				class="!space-y-0 text-lg"
				regionPanel="mt-0 mx-1 rounded-xl bg-scpurpled1"
				regionList=""
			>
				<Tab bind:group={tabSet} name="tab1" value={0}>FAQ</Tab>
				<Tab bind:group={tabSet} name="tab2" value={1}>Documentation</Tab>
				<Tab bind:group={tabSet} name="tab3" value={2}>Shipping</Tab>
				<Tab bind:group={tabSet} name="tab4" value={3}>Costing</Tab>
				<svelte:fragment slot="panel">
					{#if tabSet === 0}
						<Accordion
							regionControl="text-[#ffffff]"
							regionPanel="text-white bg-scpurpled2"
							regionCaret="hidden"
						>
							<AccordionItem open>
								<svelte:fragment slot="summary"
									><div class="flex">Q: Lorem Ipsum is the Question?</div></svelte:fragment
								>
								<svelte:fragment slot="content">A: This is the answer.</svelte:fragment>
							</AccordionItem>
							<AccordionItem open>
								<svelte:fragment slot="summary"
									><div class="flex">Q: Lorem Ipsum is the Question?</div></svelte:fragment
								>
								<svelte:fragment slot="content">A: This is the answer.</svelte:fragment>
							</AccordionItem>
							<!-- ... -->
						</Accordion>
					{:else if tabSet === 1}
						(tab panel 2 contents)
					{:else if tabSet === 2}
						(tab panel 3 contents)
					{/if}
				</svelte:fragment>
			</TabGroup>
		</div>
	</div>
</div>

<style lang="postcss">
</style>
