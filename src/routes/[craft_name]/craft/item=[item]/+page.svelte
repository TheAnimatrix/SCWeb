<script lang="ts">
	import HTMLWrapper from './../../../../lib/components/fundamental/HTMLWrapper.svelte';
	import Loader from '$lib/components/fundamental/Loader.svelte';
	import { writable, type Writable } from 'svelte/store';
	import { getContext, onMount } from 'svelte';
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

	// Status tag glow effect variables
	let statusTagElement: HTMLElement;
	let mouseX = 0;
	let mouseY = 0;
	let glowX = 50;
	let glowY = 50;
	let isHovering = false;

	// Track mouse position for glow effect
	function handleMouseMove(event: MouseEvent) {
		if (!statusTagElement) return;
		
		const rect = statusTagElement.getBoundingClientRect();
		mouseX = event.clientX;
		mouseY = event.clientY;
		
		// Calculate relative position within the element (0-100%)
		const relativeX = ((mouseX - rect.left) / rect.width) * 100;
		const relativeY = ((mouseY - rect.top) / rect.height) * 100;
		
		// Constrain values to create a smoother effect even when cursor is slightly outside
		glowX = Math.max(0, Math.min(100, relativeX));
		glowY = Math.max(0, Math.min(100, relativeY));
	}
	
	function handleMouseEnter() {
		isHovering = true;
	}
	
	function handleMouseLeave() {
		isHovering = false;
		// Reset to center when not hovering
		glowX = 50;
		glowY = 50;
	}

	onMount(() => {
		if (productItem.stock.status) {
			statusTagElement = document.getElementById('sale_info') as HTMLElement;
			if (statusTagElement) {
				statusTagElement.addEventListener('mousemove', handleMouseMove);
				statusTagElement.addEventListener('mouseenter', handleMouseEnter);
				statusTagElement.addEventListener('mouseleave', handleMouseLeave);
			}
		}

		return () => {
			if (statusTagElement) {
				statusTagElement.removeEventListener('mousemove', handleMouseMove);
				statusTagElement.removeEventListener('mouseenter', handleMouseEnter);
				statusTagElement.removeEventListener('mouseleave', handleMouseLeave);
			}
		};
	});

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
		'data-[state=active]:bg-accent data-[state=active]:text-black px-4 py-2 text-md text-gray-100 rounded-xl hover:bg-[#151515]';
</script>

<div class="min-h-screen bg-[#0c0c0c] text-white">
	<div
		class="self-center h-full flex flex-col mx-auto items-center w-[95%] md:w-[90%] lg:w-[85%] 2xl:w-[75%] 3xl:w-[60%] 4xl:w-[50%] relative pt-4 pb-8">
		
		<!-- Glowing accent -->
		<div class="absolute top-20 right-20 w-96 h-96 bg-accent opacity-10 blur-[120px] rounded-full"></div>
		
		<div class="w-full flex flex-col items-center z-10">
			<div class="text-[#b8b8b8] mr-auto pb-2 flex items-center">
				<p>Crafts / <span class="text-white font-medium">{productItem.name}</span></p>
			</div>
			
			<!-- Top Row: Product Image and Details Side by Side -->
			<div class="grid grid-cols-1 md:grid-cols-4 gap-3 w-full mb-3">
				<!-- Product Image Box (Larger) - Takes 2/3 on desktop -->
				<div class="md:col-span-2 bg-[#151515] rounded-2xl p-4 border border-[#252525]">
					<div class="relative group">
						<div class="aspect-[4/3] overflow-hidden rounded-xl">
							<img
								class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
								id="product_image"
								src={productItem.images[indicator_cur]?.url ?? no_img}
								alt={productItem.name} />
							<div class="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 to-transparent"></div>
						</div>
						
						<!-- Image Selector -->
						{#if indicator_max > 1}
							<div class="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
								{#each Array(indicator_max) as _, i}
									<button
										class="h-1.5 rounded-full transition-all duration-300 {i === indicator_cur ? 'w-12 bg-accent shadow-[0_0_10px] shadow-accent' : 'w-6 bg-white/60 hover:bg-white/80 hover:w-8'}"
										on:click={() => (indicator_cur = i)}
									/>
								{/each}
							</div>
						{/if}
					</div>
				</div>
				<!-- Product Info Box - Takes 1/3 on desktop -->
				<div class="md:col-span-2 bg-[#151515] rounded-2xl p-4 border border-[#252525] flex flex-col">
					<!-- Product title and author -->
					<div class="mb-3">
						<div class="inline-flex items-center justify-start mb-1">
							<span class="w-2 h-2 rounded-full bg-accent mr-2"></span>
							<span class="text-accent text-xs uppercase tracking-wider font-medium">Premium Craft</span>
						</div>
						<h1 class="text-2xl font-bold text-white">{productItem.name}</h1>
						<div class="text-accent font-medium">By {productItem.author}</div>
					</div>
					
					<!-- Tags - Horizontal Compact Layout -->
					<div class="flex flex-wrap gap-1.5 mb-3">
						{#each productItem.tags as t}
							<Badge class="bg-[#252525] hover:bg-[#353535] text-white border-none text-xs py-0.5">{t.tag}</Badge>
						{/each}
					</div>
					
					<!-- Price, Rating and Stock - Side by Side -->
					<div class="flex justify-between items-center mb-3">
						<div class="flex flex-col">
							{#if productItem.price.old > 0}
								<span id="oldPrice" class="text-gray-400 line-through text-sm"
									>₹{productItem.price.old}</span>
							{/if}
							<span id="newPrice" class="text-white text-2xl font-bold">₹{productItem.price.new}</span>
							<span
								id="rating"
								class="text-[#ff9900] text-sm font-medium inline-flex items-center h-fit"
								>{productItem.rating?.rating}<Icon
									class="inline ml-1"
									icon="iconamoon:star-duotone" /> <span class="text-gray-400 text-xs">({productItem.rating?.count})</span></span>
						</div>
						
						{#if productItem.stock.count > 0}
							<div class="px-3 py-1 bg-[#252525] text-sm font-medium rounded-lg">
								{productItem.stock.count} In Stock
							</div>
						{/if}
					</div>

					<!-- Status Tags -->
					<div class="flex flex-wrap gap-2 mb-3">
						<!-- Verified Tag -->
						<div class="inline-flex items-center gap-1.5 bg-[#252525] text-white px-3 py-1 rounded-lg text-sm relative before:absolute before:inset-0 before:rounded-lg before:border-2 before:border-dotted before:border-accent/50 before:animate-[border-dance_4s_linear_infinite]">
							<Icon icon="material-symbols:verified" class="text-accent" />
							<span>15 day SC Guarantee</span>
						</div>

						<!-- Sale Info Tag -->
						 {#if productItem.stock.status}
						<div
							id="sale_info"
							class="status-tag inline-flex items-center gap-1.5 bg-[#252525] text-white px-3 py-1 rounded-lg text-sm"
							style="--glow-x: {glowX}%; --glow-y: {glowY}%; --glow-opacity: {isHovering ? 1 : 0.7};"
						>
							<Icon icon="material-symbols:local-offer" class="text-orange-400" />
							<span>
								{productItem.stock.status}</span>
						</div>
						{/if}
					</div>
					
					<!-- Cart Controls -->
					<div class="mt-auto">
						<div class="flex items-center">
							<div class="flex items-center bg-[#252525] rounded-l-lg overflow-hidden">
								<button class="p-2 hover:bg-[#353535] transition-colors" on:click={dec_cart}>
									<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
										<path d="M6 12H18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="0 0"/>
									</svg>
								</button>
								<div class="px-4 py-1 border-x border-[#353535] font-medium">{cart_qty}</div>
								<button class="p-2 hover:bg-[#353535] transition-colors" on:click={inc_cart}>
									<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
										<path d="M12 6V18M6 12H18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
									</svg>
								</button>
							</div>
							<button
								class="flex-1 py-2 px-4 bg-accent text-black font-bold rounded-r-lg hover:brightness-110 transition-all flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
								disabled={productItem.stock.count <= 0}
								on:click={cart_submit}>
									<Icon icon="iconamoon:plus" class="text-lg" />
								<Icon icon="iconamoon:shopping-bag-duotone" class="text-lg" />
								{productItem.stock.count > 0 ? 'Add to Cart' : 'Out of Stock'}
							</button>
						</div>
					</div>
					
					<!-- Cart Messages -->
					<div class="relative mt-2 overflow-hidden transition-all duration-300" style="height: {addToCartSuccess === null ? '0' : '40px'}">
						<!-- Success message -->
						<div class="absolute inset-0 transition-all duration-300" class:opacity-0={addToCartSuccess !== true} class:invisible={addToCartSuccess !== true}>
							<div
								class="rounded-lg text-black pl-3 py-1 text-sm text-start bg-accent/20 h-full flex items-center gap-2 border-accent border animate-pulse">
								<Icon icon="line-md:confirm-square-twotone" class="text-accent text-xl" />
								<span class="text-accent line-clamp-2">"{productItem.name}" x {addToCartMsg} - Added to cart</span>
							</div>
						</div>
						
						<!-- Error message -->
						<div class="absolute inset-0 transition-all duration-300" class:opacity-0={addToCartSuccess !== false} class:invisible={addToCartSuccess !== false}>
							<div
								class="rounded-lg text-white pl-3 py-1 text-sm text-start bg-red-950 h-full flex items-center gap-2 border-red-500 border">
								<Icon icon="line-md:cancel-twotone" class="text-red-400 text-xl" />
								<span class="text-red-400 line-clamp-2">Error - {addToCartMsg}</span>
							</div>
						</div>
					</div>
				</div>
			</div>
			
			<!-- Bottom Row: Description, FAQ, and Related Products -->
			<div class="grid grid-cols-1 md:grid-cols-3 gap-3 w-full">
				<!-- Description Panel - Takes 2/3 width on desktop -->
				<div class="md:col-span-2 bg-[#151515] rounded-2xl p-4 border border-[#252525] max-h-[800px] overflow-y-auto">
					<div class="inline-flex items-center mb-3">
						<span class="w-2 h-2 rounded-full bg-accent mr-2"></span>
						<span class="text-accent text-xs uppercase tracking-wider font-medium">Description</span>
					</div>
					<div class="text-gray-300 text-sm">
						{#if productItem.documentation?.at(0)?.isMDUrl && productItem.documentation?.at(0)?.data}
							{#await fetch(productItem.documentation.at(0)?.data ?? '')}
								<div class="w-full justify-center flex"><Loader /></div>
							{:then data}
								{#if data.ok}
									{#await data.text()}
										<Loader />
									{:then text}
										<HTMLWrapper html={text} />
									{/await}
								{:else}
									<div class="p-2 text-center text-gray-400">
										Oops! There was an error in retrieving the description.
									</div>
								{/if}
							{/await}
						{:else if productItem.documentation?.at(0)?.data}
							<HTMLWrapper html={productItem.documentation.at(0)?.data ?? ''} />
						{:else}
							<div class="p-2 text-center text-gray-400">
								No description available yet!
							</div>
						{/if}
					</div>
				</div>
				
				<!-- FAQ and Related Products Column - 1/3 width on desktop -->
				<div class="md:col-span-1 flex flex-col gap-3">
					<!-- Tabs Panel - FAQ -->
					<div class="bg-[#151515] rounded-2xl overflow-hidden border border-[#252525]">
						<Tabs.Root value="faq" class="w-full h-full">
							<Tabs.List
								class="bg-[#151515] w-full justify-between p-1 h-fit border-b border-[#252525] flex p-2">
								<Tabs.Trigger class="data-[state=active]:bg-accent data-[state=active]:text-black px-3 py-1 text-sm text-gray-100 rounded-lg hover:bg-[#151515]" value="faq">FAQ</Tabs.Trigger>
								<Tabs.Trigger class="data-[state=active]:bg-accent data-[state=active]:text-black px-3 py-1 text-sm text-gray-100 rounded-lg hover:bg-[#151515]" value="documentation">Docs</Tabs.Trigger>
								<Tabs.Trigger class="data-[state=active]:bg-accent data-[state=active]:text-black px-3 py-1 text-sm text-gray-100 rounded-lg hover:bg-[#151515]" value="shipping">Shipping</Tabs.Trigger>
								<Tabs.Trigger class="data-[state=active]:bg-accent data-[state=active]:text-black px-3 py-1 text-sm text-gray-100 rounded-lg hover:bg-[#151515]" value="costing">Cost</Tabs.Trigger>
							</Tabs.List>
							<div class="overflow-y-auto">
								<Tabs.Content value="faq" class="text-white p-3 text-start h-full">
									<div>
										{#if productItem.faq && productItem.faq.length > 0}
											<Accordion.Root class="w-full" multiple>
												{#each productItem.faq as faq, i}
													<Accordion.Item
														value="item-{i}"
														class="border-b border-[#252525] last:border-0 px-3 py-1">
														<Accordion.Trigger class="font-medium hover:text-accent text-sm"
															><span class="text-start">{faq.question}</span></Accordion.Trigger>
														<Accordion.Content class="text-gray-400 text-xs"
															><span class="text-start">{faq.answer}</span></Accordion.Content>
													</Accordion.Item>
												{/each}
											</Accordion.Root>
										{:else}
											<div class="px-3 pt-3 text-sm text-gray-400 text-center">No FAQ Available</div>
										{/if}
									</div>
								</Tabs.Content>
								<Tabs.Content value="documentation" class="p-3 h-full text-sm text-gray-300"
									>{productItem.documentation?.at(1)?.data ?? 'No documentation available'}</Tabs.Content>
								<Tabs.Content value="costing" class="p-3 h-full text-sm text-gray-300">
									{#if productItem.documentation?.at(2)?.data && productItem.documentation?.at(2)?.isMDUrl}
										{#await fetch(productItem.documentation.at(2)?.data ?? '')}
											<div class="w-full justify-center flex"><Loader /></div>
										{:then data}
											{#if data.ok}
												{#await data.text()}
													<Loader />
												{:then text}
													<HTMLWrapper html={text} />
												{/await}
											{:else}
												<div class="p-2 text-center text-gray-400">No costing details available</div>
											{/if}
										{:catch e}
											<div class="p-2 text-center text-gray-400">No costing details available</div>
										{/await}
									{:else if productItem.documentation?.at(2)?.data}
										<HTMLWrapper html={productItem.documentation.at(2)?.data ?? ''} />
									{:else}
										<div class="p-2 text-center text-gray-400">No costing details available</div>
									{/if}
								</Tabs.Content>
								<Tabs.Content value="shipping" class="p-3 h-full text-sm text-gray-300">
									{#if productItem.documentation?.at(3)?.data && productItem.documentation?.at(3)?.isMDUrl}
										{#await fetch(productItem.documentation.at(3)?.data ?? '')}
											<div class="w-full justify-center flex"><Loader /></div>
										{:then data}
											{#if data.ok}
												{#await data.text()}
													<Loader />
												{:then text}
													<HTMLWrapper html={text} />
												{/await}
											{:else}
												<div class="p-2 text-center text-gray-400">No shipping details available</div>
											{/if}
										{:catch e}
											<div class="p-2 text-center text-gray-400">No shipping details available</div>
										{/await}
									{:else if productItem.documentation?.at(3)?.data}
										<HTMLWrapper html={productItem.documentation.at(3)?.data ?? ''} />
									{:else}
										<div class="p-2 text-center text-gray-400">No shipping details available</div>
									{/if}
								</Tabs.Content>
							</div>
						</Tabs.Root>
					</div>
					
					<!-- Related Products Panel - Same width as FAQ above -->
					{#if productItem.type == 'product'}
						{#await data.supabase_lt.from('products').select('*').eq('rel', productItem.id) then result}
							{#if result.data && !result.error && result.data.length > 0}
								<div class="bg-[#151515] rounded-2xl p-3 border border-[#252525] h-full max-h-[170px]">
									<div class="inline-flex items-center mb-2">
										<span class="w-2 h-2 rounded-full bg-accent mr-2"></span>
										<span class="text-accent text-xs uppercase tracking-wider font-medium">Related Products</span>
									</div>
									<div class="flex flex-col gap-2 overflow-y-auto pr-1 max-h-[120px]">
										{#each result.data as relProd}
										<a href={`/${relProd.name.replaceAll(' ', '_')}/craft/item=${relProd.id}`} 
										   class="flex items-center gap-2 bg-[#0c0c0c] rounded-lg group overflow-hidden border border-[#252525] hover:border-accent transition-all p-1.5">
											<div class="w-10 h-10 overflow-hidden rounded-md flex-shrink-0">
												<img src={relProd.images[0]?.url ?? no_img} alt={relProd.name} class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500">
											</div>
											<div class="flex-1 min-w-0">
												<div class="text-white text-xs font-bold line-clamp-1">{relProd.name}</div>
												<div class="flex items-center justify-between">
													<span class="text-gray-400 text-[10px]">{relProd.stock.count} in stock</span>
													<span class="text-accent font-bold text-xs">₹{relProd.price.new}</span>
												</div>
											</div>
										</a>
										{/each}
									</div>
								</div>
							{:else}
								<div class="bg-[#151515] rounded-2xl p-3 border border-[#252525]">
									<div class="inline-flex items-center mb-2">
										<span class="w-2 h-2 rounded-full bg-accent mr-2"></span>
										<span class="text-accent text-xs uppercase tracking-wider font-medium">Related Products</span>
									</div>
									<div class="text-gray-400 text-sm p-2">No related products available</div>
								</div>
							{/if}
						{/await}
					{:else}
					{#await data.supabase_lt.from('products').select('*').eq('id', productItem.rel) then result}
						{#if result.data && !result.error && result.data.length > 0}
							<div class="bg-[#151515] rounded-2xl p-3 border border-[#252525] h-full max-h-[170px]">
								<div class="inline-flex items-center mb-2">
									<span class="w-2 h-2 rounded-full bg-accent mr-2"></span>
									<span class="text-accent text-xs uppercase tracking-wider font-medium">Related Products</span>
								</div>
								<div class="flex flex-col gap-2 overflow-y-auto pr-1 max-h-[120px]">
									{#each result.data as relProd}
									<a href={`/${relProd.name.replaceAll(' ', '_')}/craft/item=${relProd.id}`} 
									   class="flex items-center gap-2 bg-[#0c0c0c] rounded-lg group overflow-hidden border border-[#252525] hover:border-accent transition-all p-1.5">
										<div class="w-10 h-10 overflow-hidden rounded-md flex-shrink-0">
											<img src={relProd.images[0]?.url ?? no_img} alt={relProd.name} class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500">
										</div>
										<div class="flex-1 min-w-0">
											<div class="text-white text-xs font-bold line-clamp-1">{relProd.name}</div>
											<div class="flex items-center justify-between">
												<span class="text-gray-400 text-[10px]">{relProd.stock.count} in stock</span>
												<span class="text-accent font-bold text-xs">₹{relProd.price.new}</span>
											</div>
										</div>
									</a>
									{/each}
								</div>
							</div>
						{:else}
							<div class="bg-[#151515] rounded-2xl p-3 border border-[#252525]">
								<div class="inline-flex items-center mb-2">
									<span class="w-2 h-2 rounded-full bg-accent mr-2"></span>
									<span class="text-accent text-xs uppercase tracking-wider font-medium">Related Products</span>
								</div>
								<div class="text-gray-400 text-sm p-2">No related products available</div>
							</div>
						{/if}
					{/await}
					{/if}
				</div>
			</div>
		</div>
		
	</div>
</div>

<style lang="postcss">
	* {
		@apply transition-all duration-200 ease-linear;
	}

	/* For WebKit browsers (Chrome, Safari) */
	::-webkit-scrollbar {
		width: 4px;
		height: 4px;
	}

	::-webkit-scrollbar-track {
		background: #151515;
		border-radius: 10px;
	}

	::-webkit-scrollbar-thumb {
		background: #252525;
		border-radius: 10px;
	}

	::-webkit-scrollbar-thumb:hover {
		background: #353535;
	}
	
	.hidden {
		@apply !invisible h-0 opacity-0 !m-0 !p-0;
	}
	
	/* Status Tag with Gradient Border */
	.status-tag {
		position: relative;
		isolation: isolate;
		box-shadow: 0 0 20px rgba(255, 153, 0, 0.2);
	}
	
	.status-tag::before {
		content: '';
		position: absolute;
		inset: -1px;
		background: linear-gradient(
			to bottom right,
			rgba(255, 153, 0, 0.8) 0%,
			rgba(255, 95, 95, 0.8) 50%,
			rgba(255, 0, 128, 0.8) 100%
		);
		border-radius: inherit;
		z-index: -1;
		transition: opacity 0.3s ease;
		opacity: var(--glow-opacity, 0.7);
	}
	
	.status-tag::after {
		content: '';
		position: absolute;
		inset: -1px;
		border-radius: inherit;
		background: radial-gradient(
			circle at var(--glow-x, 50%) var(--glow-y, 50%),
			rgba(255, 153, 0, 1) 0%,
			rgba(255, 95, 95, 0.9) 40%,
			rgba(255, 0, 128, 0.8) 80%
		);
		z-index: -2;
		filter: blur(6px);
		opacity: var(--glow-opacity, 0.7);
		transition: opacity 0.3s ease;
	}
	
	.status-tag:hover::before,
	.status-tag:hover::after {
		opacity: 1;
	}
</style>
