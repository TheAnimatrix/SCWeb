<script>
	import BannerIndicator from '$libs/components/fundamental/banner_indicator.svelte';
	import ProductImage from '$libs/images/lornode_pp.png';
    import no_img from '$libs/svg/no_img.svg';
	import CartIcon from '$libs/svg/add_to_cart_icon.svg';
    import { getProduct, products } from '$libs/stores/products.js';
	import { TabGroup, Tab } from '@skeletonlabs/skeleton';
	import { Accordion, AccordionItem } from '@skeletonlabs/skeleton';
	import Test from '$libs/components/fundamental/test.svelte';
	let indicator_cur = 0;
	let ItemQty = 0;
	let tabSet = 0;
	export let data;
    console.log(data);
    let i = data.item;
	let indicator_max = getProduct(i).pic.length;
    let picIndex = 0;
</script>

<!-- <ProductItem {...productB} onClick={()=>console.log("clicked")}/> -->

<div class="self-center w-[70%] h-full flex flex-col mx-auto items-center max-sm:w-[95%] max-md:w-[90%] max-lg:w-[85%]">
	<div class="w-full flex flex-col items-center mb-4">
		<div class="text-[#b8b8b8] mr-auto pb-2">
			<p>Crafts/<b class="text-white">{getProduct(i).name}</b></p>
		</div>
		<div class="product_hero flex w-full min-h-[25%] max-sm:flex-col justify-start">
			<div class="flex-1 mr-2">
				<img
					class="w-full min-h-full object-cover rounded-lg"
					id="product_image"
					src={getProduct(i).pic[indicator_cur]??no_img}
					alt="lornode"
				/>
			</div>
			<div class="flex-[1.2] h-full flex flex-col ml-2">
				<div class="flex mb-2">
					<div
						class="flex-1 bg-black border-t-2 border-r-2 border-b-[12px] border-l-2 border-red-100 p-4 pl-12 flex flex-col justify-center"
					>
						<div class="justify-center text-3xl text-white font-bold">{getProduct(i).name}</div>
						<div class="justify-center text-2xl text-scpurple font-bold">By {getProduct(i).author}</div>
					</div>
				</div>
				<div class=" text-white pl-4 py-2 text-base text-start bg-scbgl1 mt-2">
					<div>
						<p> {getProduct(i).description}
						</p>
					</div>
					<div class="flex justify-between">
						<div class="py-2 pr-5">
							<span id="oldPrice" class="text-gray-500 line-through text-lg font-medium">₹{getProduct(i).oldPrice}</span
							><br />
							<span id="newPrice" class="text-white text-3xl font-bold">₹{getProduct(i).newPrice}</span><br />
							<span id="rating" class="text-orange-400 text-lg font-semibold">{getProduct(i).rating}({getProduct(i).ratingCount})</span>
						</div>
						<div
							id="sale_info"
							class="max-h-[55%] flex text-white text-3xl font-bold bg-gradient-to-r from-orange-500 via-orange-500 to-pink-500 text-end self-center p-1 pr-5"
						>
							Launch OFFER!
						</div>
					</div>
					<div class="flex justify-around items-center w-fit bg-scbgl2 text-xl my-2">
						<div class="p-2 px-4 hover:scale-150">-</div>
						<div class="p-2 px-4 border-x-4 border-scbg" id="qty_show">{ItemQty}</div>
						<div class="p-2 px-4 hover:scale-150">+</div>
						<div class="p-2 bg-scpurple hover:scale-110 hover:rounded-md" id="add_to_cart">
							<img src={CartIcon} alt="add to cart" class="h-[85%] " />
						</div>
					</div>
                    
                    <div class="flex justify-left items-stretch max-w-[70%]">
                        <div class="p-4 bg-scbgl3 text-lg">Next production run in 15 days</div>
                        <div class="p-4 bg-scbgl2 text-xl font-bold">14 in stock</div>
                    </div>
				</div>
			</div>
		</div>
		<div class="w-[50%] self-start">
            {#if indicator_max > 1}
			    <BannerIndicator bind:curActive={indicator_cur} max={indicator_max} />
            {/if}
		</div>
	</div>
	<div class="w-full flex-1 ml-auto mr-auto my-4">
		<TabGroup
			justify="justify-start items-end"
			border="border-scpurple border-b-4"
			active="transition-all ease-in duration-200 bg-[#8D39FF] text-white text-xl font-bold font-figtree"
			hover="ml-1 bg-[#2c2c2c] text-white !transition-all !ease-in !duration-200 hover:!text-xl !hoverbg-[#383838] "
			rounded=""
			flex="flex-wrap"
			spacing=""
			class="!space-y-0 text-lg"
			regionPanel="mt-0"
            regionList="px-4"
		>
			<Tab bind:group={tabSet} name="tab1" value={0}>FAQ</Tab>
			<Tab bind:group={tabSet} name="tab2" value={1}>Documentation</Tab>
			<Tab bind:group={tabSet} name="tab3" value={2}>Shipping</Tab>
			<Tab bind:group={tabSet} name="tab4" value={3}>Cost Breakup</Tab>
			<svelte:fragment slot="panel">
				{#if tabSet === 0}
					<Accordion
						regionControl="text-[#ffffff] bg-[#2c2c2c]"
						regionPanel="text-white bg-[#383838]"
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

<style lang="postcss">
</style>
