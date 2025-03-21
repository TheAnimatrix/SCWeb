<script lang="ts">
	import Icon from '@iconify/svelte';
	import { getContext, onMount, onDestroy } from 'svelte';
	import { writable, type Writable } from 'svelte/store';
	import { fade, fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import type { Product } from '$lib/types/product';
	import { type Banner } from '$lib/client/banner';
	import ProductList from './product_list.svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import Loader from '$lib/components/fundamental/Loader.svelte';
	import Smoke from '$lib/components/effects/Smoke.svelte';

	export let data;

	let indicator_cur = 0;
	let cinterval = 5000; // 5 seconds between slides
	let autoplayInterval: ReturnType<typeof setInterval> | undefined;

	let getLink = (i: number, product: Product) => {
		return `/${product.name.replaceAll(' ', '_')}/craft/item=${product.id}`;
	};

	let image = writable('');
	let name: string, author: string, url: string;
	$: {
		if (data.banners?.[indicator_cur]?.img) {
			image.set(data.banners?.[indicator_cur].img);
			name = data.banners?.[indicator_cur].name;
			author = data.banners?.[indicator_cur].author;
			url = data.banners?.[indicator_cur].url;
		}
	}

	let products: Product[];
	let default_filter = "Products";

	let loading = false;
	async function setup(filterf:string|null) {
		loading = true;
		let filter = filterf ?? $page.url.searchParams.get('filter') ?? default_filter;
		let query = data.supabase_lt.from('products').select('*');
		if (filter) {
			if(filter == 'Products') {
				filter = 'product';
			} else if(filter == 'Spares') {
				filter = 'spare';
			} else if (filter == 'FleaMarket') {
				filter = 'flea-market';
			}
			if(filter != 'All') {
				query = query.eq('type', filter);
			}
		}
		let resp = await query;
		if (resp.error || !resp.data) {
			console.error(resp.error);
		} else {
			products = resp.data as Product[];
		}
		loading = false;
	}

	setup(null);

	// Highlight key aspects of SelfCrafted
	const keyFeatures = [
		{
			title: "Maker Marketplace",
			icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" class="w-10 h-10 feature-icon">
				<defs>
					<linearGradient id="storefront-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
						<stop offset="0%" stop-color="#4CAF50" />
						<stop offset="100%" stop-color="#2E7D32" />
					</linearGradient>
					<linearGradient id="roof-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
						<stop offset="0%" stop-color="#7C4DFF" />
						<stop offset="100%" stop-color="#512DA8" />
					</linearGradient>
					<linearGradient id="tech-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
						<stop offset="0%" stop-color="#00BCD4" />
						<stop offset="100%" stop-color="#006064" />
					</linearGradient>
				</defs>
				
				<!-- Storefront base with modern design -->
				<path d="M2 7h20v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7Z" fill="url(#storefront-gradient)" stroke="#ffffff" stroke-width="1.5" class="storefront-base" />
				
				<!-- Stylized roof -->
				<path d="M1 7l2-4h18l2 4" fill="url(#roof-gradient)" stroke="#ffffff" stroke-width="1.5" class="storefront-roof" />
				
				<!-- Modern glass door -->
				<path d="M9 13h6v8h-6v-8" fill="#E3F2FD" stroke="#ffffff" stroke-width="1.5" class="storefront-door" />
				<path d="M11 17h2" stroke="#ffffff" stroke-width="1.5" opacity="0.8" />
				
				<!-- Tech product displays -->
				<rect x="4" y="9" width="2" height="2" rx="0.5" fill="#E1BEE7" stroke="#ffffff" stroke-width="1" class="product-item item-1" />
				<rect x="7" y="9" width="2" height="2" rx="0.5" fill="#B2EBF2" stroke="#ffffff" stroke-width="1" class="product-item item-2" />
				<rect x="15" y="9" width="2" height="2" rx="0.5" fill="#C8E6C9" stroke="#ffffff" stroke-width="1" class="product-item item-3" />
				<rect x="18" y="9" width="2" height="2" rx="0.5" fill="#FFE0B2" stroke="#ffffff" stroke-width="1" class="product-item item-4" />
				
				<!-- Circuit board design -->
				<path d="M4 13h2m1 0h1m4 4h1m1 0h2" stroke="url(#tech-gradient)" stroke-width="1.5" class="circuit-trace" />
				<circle cx="18" cy="15" r="1" fill="#00BCD4" stroke="#ffffff" stroke-width="0.5" class="circuit-node node-1" />
				<circle cx="5" cy="15" r="1" fill="#00BCD4" stroke="#ffffff" stroke-width="0.5" class="circuit-node node-2" />
				
				<!-- Digital elements -->
				<path d="M5 11l1-1m12 1l1-1" stroke="#ffffff" stroke-width="0.5" opacity="0.6" />
				<path d="M8 11l1-1m6 1l1-1" stroke="#ffffff" stroke-width="0.5" opacity="0.6" />
			</svg>`,
			desc: "Buy and sell both finished products and critical components in one platform."
		},
		{
			title: "Local Sourcing",
			icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" class="w-10 h-10 feature-icon">
				<defs>
					<linearGradient id="globe-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
						<stop offset="0%" stop-color="#1976D2" />
						<stop offset="100%" stop-color="#0D47A1" />
					</linearGradient>
					<linearGradient id="land-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
						<stop offset="0%" stop-color="#4CAF50" />
						<stop offset="100%" stop-color="#2E7D32" />
					</linearGradient>
					<linearGradient id="connection-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
						<stop offset="0%" stop-color="#FFA726" />
						<stop offset="100%" stop-color="#F57C00" />
					</linearGradient>
				</defs>
				
				<!-- World sphere with atmosphere effect -->
				<circle cx="12" cy="12" r="9" fill="url(#globe-gradient)" stroke="#ffffff" stroke-width="1.5" class="world-map" />
				<circle cx="12" cy="12" r="9" fill="none" stroke="#64B5F6" stroke-width="0.5" opacity="0.3" />
				
				<!-- Continents with detailed shapes -->
				<path d="M5 9c1-1 2-1.5 3-1s2 1 2 2v1c0 1-.5 2-1.5 2S6 12 5 10V9z" fill="url(#land-gradient)" stroke="#ffffff" stroke-width="1" class="continent" />
				<path d="M16 7c.5 0 1 .5 1 1v1c0 .5-.5 1.5-1 2s-1.5 1-2 1-1.5-.5-2-1-1-1.5-1-2 .5-1 1-1 1 .5 1.5.5S15 7 16 7z" fill="url(#land-gradient)" stroke="#ffffff" stroke-width="1" class="continent" />
				<path d="M14 15c.5-.5 1-.5 1.5 0s.5 1 0 1.5-1 .5-1.5 0-.5-1 0-1.5z" fill="url(#land-gradient)" stroke="#ffffff" stroke-width="1" class="continent" />
				
				<!-- Connection network -->
				<path d="M7.5 8L12 5l3.5 3" stroke="url(#connection-gradient)" stroke-width="2" class="connection-line network-line-1" />
				<path d="M5.5 13l3 3 5-3" stroke="url(#connection-gradient)" stroke-width="2" class="connection-line network-line-2" />
				
				<!-- Connection points with glowing effect -->
				<circle cx="7.5" cy="8" r="1.2" fill="#FFA726" class="source-node node-1" />
				<circle cx="12" cy="5" r="1.2" fill="#FFA726" class="source-node node-2" />
				<circle cx="15.5" cy="8" r="1.2" fill="#FFA726" class="source-node node-3" />
				<circle cx="5.5" cy="13" r="1.2" fill="#FFA726" class="source-node node-4" />
				<circle cx="8.5" cy="16" r="1.2" fill="#FFA726" class="source-node node-5" />
				<circle cx="13.5" cy="13" r="1.2" fill="#FFA726" class="source-node node-6" />
			</svg>`,
			desc: "Reduce dependency on expensive imports by connecting with local component makers."
		},
		{
			title: "Creator Community",
			icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" class="w-10 h-10 feature-icon">
				<defs>
					<linearGradient id="hub-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
						<stop offset="0%" stop-color="#E91E63" />
						<stop offset="100%" stop-color="#C2185B" />
					</linearGradient>
					<linearGradient id="creator-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
						<stop offset="0%" stop-color="#9C27B0" />
						<stop offset="100%" stop-color="#6A1B9A" />
					</linearGradient>
					<linearGradient id="connection-gradient-2" x1="0%" y1="0%" x2="100%" y2="0%">
						<stop offset="0%" stop-color="#FF4081" />
						<stop offset="100%" stop-color="#F50057" />
					</linearGradient>
				</defs>
				
				<!-- Central hub with pulsing effect -->
				<circle cx="12" cy="12" r="3.2" fill="url(#hub-gradient)" stroke="#ffffff" stroke-width="1.8" class="hub" />
				
				<!-- Creator nodes with gradient fills -->
				<circle cx="5" cy="8" r="2.2" fill="url(#creator-gradient)" stroke="#ffffff" stroke-width="1.5" class="creator creator-1" />
				<circle cx="19" cy="8" r="2.2" fill="url(#creator-gradient)" stroke="#ffffff" stroke-width="1.5" class="creator creator-2" />
				<circle cx="5" cy="16" r="2.2" fill="url(#creator-gradient)" stroke="#ffffff" stroke-width="1.5" class="creator creator-3" />
				<circle cx="19" cy="16" r="2.2" fill="url(#creator-gradient)" stroke="#ffffff" stroke-width="1.5" class="creator creator-4" />
				<circle cx="12" cy="4" r="2.2" fill="url(#creator-gradient)" stroke="#ffffff" stroke-width="1.5" class="creator creator-5" />
				<circle cx="12" cy="20" r="2.2" fill="url(#creator-gradient)" stroke="#ffffff" stroke-width="1.5" class="creator creator-6" />
				
				<!-- Dynamic connection lines -->
				<path d="M7 8l3 2.5" stroke="url(#connection-gradient-2)" stroke-width="1.5" class="connection network-line-1" />
				<path d="M17 8l-3 2.5" stroke="url(#connection-gradient-2)" stroke-width="1.5" class="connection network-line-2" />
				<path d="M7 16l3-2.5" stroke="url(#connection-gradient-2)" stroke-width="1.5" class="connection network-line-3" />
				<path d="M17 16l-3-2.5" stroke="url(#connection-gradient-2)" stroke-width="1.5" class="connection network-line-4" />
				<path d="M12 6v3" stroke="url(#connection-gradient-2)" stroke-width="1.5" class="connection network-line-5" />
				<path d="M12 18v-3" stroke="url(#connection-gradient-2)" stroke-width="1.5" class="connection network-line-6" />
				
				<!-- Interconnected mesh -->
				<path d="M5 10v4M19 10v4M7 7l10 1M7 17l10-1M10 5l4 1M10 19l4-1" stroke="#FF80AB" stroke-width="0.7" stroke-dasharray="2 1" class="network-mesh" opacity="0.6" />
			</svg>`,
			desc: "Join a network of indie creators solving common sourcing and scaling challenges together."
		}
	];

	onMount(() => {
		// Initialize card autoplay if there are multiple banners
		if (data.banners && data.banners.length > 1) {
			resumeAutoplay();
		}

		return () => {
			pauseAutoplay(); // Clean up on component unmount
		};
	});

	onDestroy(() => {
		pauseAutoplay();
	});

	// Carousel navigation functions
	function nextBanner() {
		if (data.banners && data.banners.length > 1) {
			indicator_cur = (indicator_cur + 1) % data.banners.length;
		}
	}
	
	function pauseAutoplay() {
		if (autoplayInterval) {
			clearInterval(autoplayInterval);
			autoplayInterval = undefined;
		}
	}
	
	function resumeAutoplay() {
		pauseAutoplay(); // Clear any existing interval first
		if (data.banners && data.banners.length > 1) {
			autoplayInterval = setInterval(nextBanner, cinterval);
		}
	}

</script>

<div class="min-h-screen bg-transparent text-white w-full max-w-full overflow-x-hidden">
	<!-- Welcome Section -->
	<section class="pt-12 pb-16 px-4 relative w-full max-w-full overflow-hidden">
		<!-- Heading -->
		<div class="text-center mb-12 relative z-10">
			<div class="inline-flex items-center justify-center mb-4">
				<span class="w-4 h-4 rounded-full bg-accent mr-2"></span>
				<span class="text-accent text-sm uppercase tracking-wider font-medium">Welcome to SelfCrafted</span>
			</div>
			<h1 class="text-3xl md:text-4xl font-bold max-w-4xl mx-auto leading-tight">
				Where indie makers connect with
				<span class="block">parts, products, and people.</span>
			</h1>
		</div>
		
		<!-- Features Grid -->
		<div class="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
			{#each keyFeatures as feature, i}
				<div class="bg-[#151515]/40 rounded-2xl p-6 border border-[#252525] hover:border-[#353535] transition-all hover:shadow-glow group">
					<div class="w-16 h-16 rounded-xl flex items-center justify-center mb-4 border border-accent/30 icon-container transition-all duration-300 group-hover:shadow-glow-sm group-hover:border-accent/50 bg-accent/5">
						{@html feature.icon}
					</div>
					<h3 class="text-xl font-bold mb-2 text-accent group-hover:translate-y-[-2px] transition-all duration-300">{feature.title}</h3>
					<p class="text-gray-400 group-hover:text-gray-300 transition-colors duration-300">{feature.desc}</p>
				</div>
			{/each}
		</div>
	</section>
	
	<!-- Featured Products Section with Banner Carousel -->
	<section class="py-20 px-4 relative overflow-hidden w-full max-w-full">
		<!-- Background Elements -->
		<div class="absolute inset-0 bg-[#0a0a0a] z-0"></div>
		
		<div class="absolute inset-0 z-0">
			<!-- Using default accent color -->
			<Smoke opacity={0.4} particleCount={40} />
		</div>
		
		<div class="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-accent opacity-5 blur-[150px] rounded-full"></div>
		<div class="absolute bottom-1/4 left-1/4 w-[300px] h-[300px] bg-purple-500 opacity-5 blur-[150px] rounded-full"></div>
		
		<!-- Section heading -->
		<div class="relative z-10 max-w-7xl mx-auto mb-10">
			<div class="flex flex-col md:flex-row md:items-center md:justify-between">
				<div>
					<div class="inline-flex items-center mb-3">
						<span class="w-4 h-4 rounded-full bg-accent mr-2"></span>
						<span class="text-accent text-sm uppercase tracking-wider font-medium">Featured Creations</span>
					</div>
					<h2 class="text-2xl md:text-3xl font-bold">Discover Exceptional Crafts</h2>
				</div>
			</div>
		</div>
		
		{#if data.banners?.length}
			<div class="max-w-7xl mx-auto relative z-10">
				<!-- Banner Carousel with 3D effects -->
				<div class="perspective-container">
					<div class="card-stack-container">
						{#if data.banners && data.banners.length > 0}
							<!-- Current card (active) -->
							{#key indicator_cur}
							<a href={data.banners[indicator_cur].url || `/product/craft/item=${indicator_cur}`} 
							   class="card active-card block w-full h-full cursor-pointer" 
							   in:fly={{ y: 120, duration: 600, delay: 50, opacity: 0, easing: cubicOut }}
							   out:fly={{ y: -120, duration: 600, opacity: 0, easing: cubicOut }}>
								<div 
									style="background-image: url({data.banners[indicator_cur].img});"
									class="absolute inset-0 bg-cover bg-center"
									role="img"
									aria-label="Featured banner for {data.banners[indicator_cur].name}"
									on:mouseenter={pauseAutoplay}
									on:mouseleave={resumeAutoplay}>
									<div class="card-content">
										<div class="flex flex-col items-start mb-4">
											<div class="px-3 py-1 bg-accent text-black text-xs font-bold uppercase rounded-full mb-4 shadow-elevation-1 transform-gpu hover:shadow-elevation-2 hover:translate-z-[5px] transition-all">
												Featured
											</div>
											<h3 class="text-3xl md:text-4xl font-bold text-white mb-2 group-hover:text-accent transition-colors transform-gpu group-hover:translate-z-[10px]">
												{data.banners[indicator_cur].name}
											</h3>
											<div class="flex items-center mt-2 transform-gpu group-hover:translate-z-[8px]">
												<div class="w-8 h-8 rounded-full bg-[#252525] flex items-center justify-center mr-3 shadow-elevation-1">
													<Icon icon="ph:user-bold" class="text-accent" />
												</div>
												<span class="text-gray-300">By <span class="text-white font-medium">{data.banners[indicator_cur].author}</span></span>
											</div>
										</div>
									</div>
								</div>
							</a>
							{/key}

							<!-- Previous Cards (visible in the stack) -->
							{#if data.banners.length > 1}
								{#key indicator_cur}
								<div class="card back-card back-card-1 pointer-events-none" 
									transition:fly={{ y: -80, duration: 800, opacity: 0, easing: cubicOut }}
									style="background-image: url({data.banners[(indicator_cur - 1 + data.banners.length) % data.banners.length]?.img})">
									<div class="absolute inset-0 bg-black/40"></div>
								</div>
								{/key}
							{/if}
							
							{#if data.banners.length > 2}
								{#key indicator_cur}
								<div class="card back-card back-card-2 pointer-events-none" 
									in:fly={{ y: 40, duration: 600, delay: 150, opacity: 0, easing: cubicOut }}
									out:fly={{ y: -40, duration: 600, opacity: 0, easing: cubicOut }}
									style="background-image: url({data.banners[(indicator_cur - 2 + data.banners.length) % data.banners.length]?.img})">
									<div class="absolute inset-0 bg-black/60"></div>
								</div>
								{/key}
							{/if}
						{/if}
					</div>
					
					<!-- Navigation Controls with 3D pop effect -->
					<div class="absolute top-1/2 left-4 -translate-y-1/2 z-30">
						<button 
							on:click={() => {
								pauseAutoplay();
								if (data.banners && data.banners.length > 0) {
									indicator_cur = (indicator_cur - 1 + data.banners.length) % data.banners.length;
								}
								setTimeout(resumeAutoplay, 10000);
							}}
							class="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center hover:bg-accent hover:text-black transition-colors shadow-elevation-1 hover:shadow-elevation-2 transform-gpu hover:scale-110">
							<Icon icon="ph:caret-left-bold" />
						</button>
					</div>
					<div class="absolute top-1/2 right-4 -translate-y-1/2 z-30">
						<button 
							on:click={() => {
								pauseAutoplay();
								if (data.banners && data.banners.length > 0) {
									indicator_cur = (indicator_cur + 1) % data.banners.length;
								}
								setTimeout(resumeAutoplay, 10000);
							}}
							class="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center hover:bg-accent hover:text-black transition-colors shadow-elevation-1 hover:shadow-elevation-2 transform-gpu hover:scale-110">
							<Icon icon="ph:caret-right-bold" />
						</button>
					</div>
					
					<!-- 3D glowing effect -->
					<div class="absolute -bottom-10 left-1/2 -translate-x-1/2 w-[70%] h-20 bg-accent opacity-[0.07] blur-[50px] rounded-full transform-gpu"></div>
				</div>
				
				<!-- Custom Indicator -->
				<div class="flex items-center justify-center mt-8 space-x-3">
					{#each Array(data.banners?.length || 0) as _, i}
						<button 
							on:click={() => {
								if (indicator_cur !== i) {
									pauseAutoplay();
									indicator_cur = i;
									setTimeout(resumeAutoplay, 10000);
								}
							}}
							class="transform-gpu hover:translate-z-[5px] transition-all {indicator_cur === i ? 'h-2 w-8 bg-accent shadow-glow-sm' : 'h-2 w-2 bg-gray-600 hover:bg-gray-400'} rounded-full">
						</button>
					{/each}
				</div>
			</div>
		{:else}
			<div class="max-w-7xl mx-auto py-20 text-center">
				<div class="text-gray-400">No featured products available at this time.</div>
			</div>
		{/if}
	</section>
	
	<!-- Product List Section -->
	<section class="px-4 pb-20 relative w-full max-w-full overflow-hidden">
		<div class="max-w-7xl mx-auto">
			<!-- Section heading & Filters -->
			<div class="flex flex-col md:flex-row md:items-center md:justify-between mb-10 mt-10">
				<div>
					<div class="inline-flex items-center mb-3">
						<span class="w-4 h-4 rounded-full bg-accent mr-2"></span>
						<span class="text-accent text-sm uppercase tracking-wider font-medium">Browse Creations</span>
					</div>
					<h2 class="text-2xl md:text-3xl font-bold mb-4 md:mb-0">Find Your Perfect Match</h2>
				</div>
				
				<div class="flex flex-wrap gap-3 items-center">
					<button 
						on:click={()=>{goto('?filter=All');setup("All")}} 
						class="px-4 py-2 rounded-full transition-all {$page.url.searchParams.get('filter') == 'All' ? 'bg-accent text-black font-medium' : 'bg-[#151515] hover:bg-[#252525] text-white'}">
						All
					</button>
					<button 
						on:click={()=>{goto('?filter=Products');setup("Products")}} 
						class="px-4 py-2 rounded-full transition-all {$page.url.searchParams.get('filter') != null ? $page.url.searchParams.get('filter') == 'Products' ? 'bg-accent text-black font-medium' : 'bg-[#151515] hover:bg-[#252525] text-white' : 'bg-accent text-black font-medium'}">
						Products
					</button>
					<button 
						on:click={()=>{goto('?filter=Spares',);setup("Spares")}} 
						class="px-4 py-2 rounded-full transition-all {$page.url.searchParams.get('filter') == 'Spares' ? 'bg-accent text-black font-medium' : 'bg-[#151515] hover:bg-[#252525] text-white'}">
						Spares
					</button>
					<button 
						on:click={()=>{goto('?filter=FleaMarket',);setup("FleaMarket")}} 
						class="px-4 py-2 rounded-full transition-all {$page.url.searchParams.get('filter') == 'FleaMarket' ? 'bg-accent text-black font-medium' : 'bg-[#151515] hover:bg-[#252525] text-white'}">
						Flea Market
					</button>
				</div>
			</div>
			
			<!-- Products -->
			{#if loading}
				<div class="flex flex-col py-32 justify-center items-center w-full bg-[#0f0f0f] rounded-3xl border border-[#252525]">
					<Loader />
					<div class="text-gray-400 text-center text-xl mt-6">Loading products...</div>
				</div>
			{:else}
				{#if products && products.length > 0}
					<div class="relative">
						<!-- Subtle glow effect -->
						<div class="absolute -top-20 left-1/3 w-64 h-64 bg-accent opacity-5 blur-[100px] rounded-full"></div>
						
						{#key products}
							<ProductList {products} {getLink} />
						{/key}
					</div>
				{:else}
					<div class="flex flex-col py-32 justify-center items-center w-full bg-[#0f0f0f] rounded-3xl border border-[#252525] overflow-hidden relative">
						<!-- Empty state background effect -->
						<div class="absolute inset-0 bg-[url('/images/noise.png')] opacity-5"></div>
						
						<div class="w-20 h-20 rounded-full bg-[#151515] flex items-center justify-center mb-6">
							<Icon icon="ph:magnifying-glass" class="text-accent text-3xl" />
						</div>
						<div class="text-accent text-center text-xl font-medium mb-2">No products found</div>
						<div class="text-gray-400 text-center max-w-md">
							We couldn't find any products matching your current filters. Try adjusting your selection or check back later for new additions.
						</div>
						
						<button 
							on:click={()=>{goto('?filter=All');setup("All")}}
							class="mt-8 px-6 py-3 bg-[#151515] hover:bg-[#252525] rounded-lg text-white transition-all">
							View All Products
						</button>
					</div>
				{/if}
			{/if}
		</div>
	</section>
</div>

<style lang="postcss">
	/* 3D Transform Styles */
	.perspective-container {
		perspective: 1000px;
		transform-style: preserve-3d;
	}

	/* Card Stack Container Styles */
	.card-stack-container {
		position: relative;
		width: 100%;
		height: 460px;
		transform-style: preserve-3d;
		perspective: 1500px;
		border-radius: 1rem;
		margin: 0 auto;
		overflow: visible;
	}

	/* Base Card Styles */
	.card {
		position: absolute;
		width: 100%;
		height: 100%;
		top: 0;
		left: 0;
		border-radius: 1rem;
		background-position: center;
		background-size: cover;
		background-repeat: no-repeat;
		transform-style: preserve-3d;
		will-change: transform, opacity;
		overflow: hidden;
		box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
		border: 1px solid rgba(255, 255, 255, 0.1);
		transition: all 0.8s cubic-bezier(0.2, 0.8, 0.2, 1);
		transform-origin: center center;
	}

	.card-content {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		z-index: 20;
		padding: 2rem;
		background: linear-gradient(to top, rgba(0,0,0,0.9), transparent);
	}

	/* Active Card */
	.active-card {
		z-index: 30;
		transform: translateY(0) scale(1);
		filter: brightness(1);
	}

	/* Back Cards */
	.back-card {
		pointer-events: none;
		will-change: transform, opacity, filter;
		transition: all 0.8s cubic-bezier(0.2, 0.8, 0.2, 1);
	}

	.back-card-1 {
		z-index: 20;
		transform: translateY(-40px) scale(0.95);
		filter: brightness(0.85);
	}

	.back-card-2 {
		z-index: 10;
		transform: translateY(-80px) scale(0.9);
		filter: brightness(0.7);
	}

	/* Feature Icon Animations */
	.feature-icon {
		transform: translateZ(0);
		transition: all 0.3s ease;
	}

	.storefront-roof {
		animation: shimmer 3s infinite alternate;
	}

	.storefront-door {
		animation: pulse 2s infinite alternate;
	}

	.product-item {
		animation: blink 4s infinite;
	}

	.circuit-trace {
		stroke-dasharray: 8;
		stroke-dashoffset: 16;
		animation: dash 5s linear infinite;
	}

	.world-map {
		animation: pulse 8s infinite alternate;
	}

	.connection-line {
		stroke-dasharray: 10;
		stroke-dashoffset: 20;
		animation: dash 6s linear infinite;
	}

	.source-node {
		animation: glow 3s infinite alternate;
	}

	.hub {
		animation: pulse 3s infinite alternate;
	}

	.creator {
		animation: glow 4s infinite alternate;
	}

	.network-mesh {
		animation: pulse 4s infinite alternate;
	}

	/* Keyframes */
	@keyframes shimmer {
		0% { opacity: 0.7; }
		100% { opacity: 1; stroke-width: 1.8; }
	}

	@keyframes blink {
		0%, 100% { opacity: 0.4; }
		50% { opacity: 0.9; }
	}

	@keyframes dash {
		to { stroke-dashoffset: 0; }
	}

	@keyframes glow {
		0% { opacity: 0.6; stroke-width: 1.3; }
		100% { opacity: 1; stroke-width: 1.8; }
	}

	@keyframes pulse {
		0% { opacity: 0.6; }
		100% { opacity: 1; }
	}
</style>


